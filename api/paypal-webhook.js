"use strict";
const {configuration,database,paypal,rpc,captureOrder}=require("../lib/payments");
module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).end();}
  if(!configuration().enabled)return res.status(503).json({error:"PayPal pendiente de configurar."});
  try{
    const event=typeof req.body==="string"?JSON.parse(req.body):req.body;
    if(!event||Buffer.byteLength(JSON.stringify(event))>100000)return res.status(400).end();
    const h=req.headers;
    if(!h["paypal-transmission-id"]||!h["paypal-transmission-sig"]||!h["paypal-cert-url"]||!h["paypal-auth-algo"]||!h["paypal-transmission-time"])return res.status(401).end();
    const verified=await paypal("/v1/notifications/verify-webhook-signature",{method:"POST",body:{auth_algo:h["paypal-auth-algo"],cert_url:h["paypal-cert-url"],transmission_id:h["paypal-transmission-id"],transmission_sig:h["paypal-transmission-sig"],transmission_time:h["paypal-transmission-time"],webhook_id:process.env.PAYPAL_WEBHOOK_ID,webhook_event:event}});
    if(verified.verification_status!=="SUCCESS")return res.status(401).end();
    const db=database(),resource=event.resource||{};
    if(["CHECKOUT.ORDER.APPROVED","PAYMENT.CAPTURE.COMPLETED","PAYMENT.CAPTURE.DENIED"].includes(event.event_type)){
      const id=event.event_type==="CHECKOUT.ORDER.APPROVED"?resource.id:resource.supplementary_data?.related_ids?.order_id;
      if(!id)return res.status(400).end();
      const {data:order,error}=await db.from("orders").select("*").eq("paypal_order_id",id).maybeSingle();if(error)throw error;
      if(order){
        if(event.event_type==="PAYMENT.CAPTURE.DENIED")await rpc(db,"finish_payment",{p_id:order.id,p_capture:"",p_amount:order.total,p_currency:order.currency,p_result:"failed",p_note:"PayPal rechazó el cobro."});
        else await captureOrder(db,order);
      }
    }else if(event.event_type==="PAYMENT.CAPTURE.REFUNDED"){
      const link=resource.links?.find((l)=>l.rel==="up")?.href||"";
      const captureId=resource.supplementary_data?.related_ids?.capture_id || link.match(/\/v2\/payments\/captures\/([A-Z0-9]+)$/)?.[1];
      if(!captureId)return res.status(400).end();
      const {data:order,error}=await db.from("orders").select("*").eq("payment_reference",captureId).maybeSingle();if(error)throw error;
      if(order){const capture=await paypal(`/v2/payments/captures/${encodeURIComponent(captureId)}`);if(["REFUNDED","PARTIALLY_REFUNDED"].includes(capture.status))await rpc(db,"finish_payment",{p_id:order.id,p_capture:captureId,p_amount:order.total,p_currency:order.currency,p_result:capture.status==="REFUNDED"?"refunded":"partial_refund",p_note:""});}
    }
    return res.status(200).json({received:true});
  }catch{return res.status(500).json({error:"No se pudo procesar la notificación. Reintentar."});}
};
