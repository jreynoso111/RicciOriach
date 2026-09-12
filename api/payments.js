"use strict";
const {configuration,database,PaymentError,paypal,receipt,rpc,findOrder,captureOrder,uuid}=require("../lib/payments");
module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  const config=configuration(),action=req.query?.action;
  if(req.method==="GET"&&action==="config")return res.status(200).json({enabled:config.enabled,provider:"paypal",environment:config.environment,currencies:["USD","EUR"]});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return res.status(405).json({error:"Método no permitido."});}
  if(!config.enabled)return res.status(503).json({error:"PayPal está pendiente de configurar. Puedes usar la confirmación manual cuando esté disponible."});
  if(req.headers.origin&&req.headers.origin!==config.siteUrl)return res.status(403).json({error:"Origen no permitido."});
  try{
    const body=typeof req.body==="string"?JSON.parse(req.body):req.body;
    if(!body||Buffer.byteLength(JSON.stringify(body))>16000||!uuid.test(body.requestKey||""))throw new PaymentError("Solicitud inválida.");
    const db=database();
    if(action==="create"){
      await rpc(db,"prepare_checkout",{p_customer:body.customer,p_items:body.items,p_request_key:body.requestKey});
      let order=await findOrder(db,body.requestKey);
      if(order.status==="Cancelado")throw new PaymentError("Ese proceso de pago terminó. Crea una solicitud nueva.",409);
      if(order.payment_status==="paid")return res.status(200).json({completed:true,receipt:receipt(order)});
      let remote;
      if(order.paypal_order_id)remote=await paypal(`/v2/checkout/orders/${encodeURIComponent(order.paypal_order_id)}`);
      else{
        remote=await paypal("/v2/checkout/orders",{method:"POST",idempotencyKey:order.id,body:{intent:"CAPTURE",purchase_units:[{reference_id:order.reference,invoice_id:order.reference,custom_id:order.id,description:`Riccie Oriach · ${order.kind==="ticket"?"Entradas":"Tienda"}`,amount:{currency_code:order.currency,value:Number(order.total).toFixed(2)}}],payment_source:{paypal:{experience_context:{brand_name:"Riccie Oriach",user_action:"PAY_NOW",shipping_preference:"NO_SHIPPING",return_url:`${config.siteUrl}/payment.html?key=${order.request_key}`,cancel_url:`${config.siteUrl}/payment.html?key=${order.request_key}&cancel=1`}}}}});
        const result=await db.from("orders").update({paypal_order_id:remote.id}).eq("id",order.id).eq("paypal_order_id","").select("id");if(result.error)throw new PaymentError("No se pudo guardar el inicio del pago. Reintenta con los mismos datos.",503);
        order=await findOrder(db,body.requestKey);
        if(order.paypal_order_id!==remote.id)throw new PaymentError("El pedido ya tiene otro proceso de pago.",409);
      }
      if(remote.status==="COMPLETED")return res.status(200).json({completed:true,receipt:await captureOrder(db,order)});
      const approvalUrl=remote.links?.find((l)=>["payer-action","approve"].includes(l.rel))?.href;
      if(!approvalUrl)throw new PaymentError("No se recibió el enlace de PayPal.",502);
      return res.status(200).json({approvalUrl,reference:order.reference});
    }
    const order=await findOrder(db,body.requestKey);
    if(action==="receipt")return res.status(200).json(receipt(order));
    if(action==="capture")return res.status(200).json(await captureOrder(db,order));
    if(action==="cancel"){
      // A return URL alone cannot cancel a completed or processing payment.
      if(order.paypal_order_id){const remote=await paypal(`/v2/checkout/orders/${encodeURIComponent(order.paypal_order_id)}`);if(["APPROVED","COMPLETED"].includes(remote.status))return res.status(200).json(await captureOrder(db,order));}
      if(order.payment_status!=="pending")return res.status(200).json(receipt(order));
      return res.status(200).json(receipt(await rpc(db,"cancel_checkout",{p_id:order.id})));
    }
    return res.status(400).json({error:"Operación inválida."});
  }catch(error){return res.status(error.status||500).json({error:error instanceof PaymentError?error.message:"No se pudo procesar el pago. Conserva la referencia e inténtalo de nuevo."});}
};
