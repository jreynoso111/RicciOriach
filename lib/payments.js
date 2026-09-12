"use strict";
const { createClient } = require("@supabase/supabase-js");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function configuration(env = process.env) {
  const required = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID", "SUPABASE_SERVICE_ROLE_KEY", "SITE_URL"];
  let siteUrl = ""; try { const u = new URL(env.SITE_URL); if (u.protocol === "https:") siteUrl = u.origin; } catch {}
  return { enabled: required.every((k) => Boolean(env[k]?.trim())) && Boolean(siteUrl) && ["sandbox", "live"].includes(env.PAYPAL_ENV), environment: env.PAYPAL_ENV || "sandbox", siteUrl };
}
function database() {
  return createClient(process.env.SUPABASE_URL || "https://vacmyqiddtxouogpcvkt.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: {persistSession:false, autoRefreshToken:false} });
}
class PaymentError extends Error { constructor(message, status=400) { super(message); this.status=status; } }
async function paypal(path, {method="GET", body, idempotencyKey} = {}) {
  const base = process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const tokenResponse = await fetch(`${base}/v1/oauth2/token`, {method:"POST", headers:{Authorization:`Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded"}, body:"grant_type=client_credentials",signal:AbortSignal.timeout(15000)});
  if(!tokenResponse.ok)throw new PaymentError("PayPal no está disponible. Inténtalo de nuevo más tarde.",503);
  const token=await tokenResponse.json();
  const response=await fetch(`${base}${path}`,{method,headers:{Authorization:`Bearer ${token.access_token}`,"Content-Type":"application/json",...(idempotencyKey?{"PayPal-Request-Id":idempotencyKey}:{}),Prefer:"return=representation"},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  const value=await response.json().catch(()=>({}));
  if(!response.ok){const error=new PaymentError("No se pudo completar la operación con PayPal. Conserva la referencia y vuelve a intentarlo.",502);error.providerCode=value.details?.[0]?.issue || value.name;throw error;}
  return value;
}
function receipt(order){return {reference:order.reference,status:order.status,paymentStatus:order.payment_status,total:order.total,currency:order.currency,paymentNote:order.payment_note || ""};}
async function rpc(db,name,args){const {data,error}=await db.rpc(name,args);if(error)throw new PaymentError(error.message,409);return Array.isArray(data)?data[0]:data;}
async function findOrder(db,key){if(!uuid.test(key||""))throw new PaymentError("Referencia inválida.");const {data,error}=await db.from("orders").select("*").eq("request_key",key).eq("payment_mode","online").maybeSingle();if(error)throw new PaymentError("No se pudo consultar el pedido.",503);if(!data)throw new PaymentError("No se encontró ese pedido.",404);return data;}
function verifyOrder(remote,order){
  const units=remote.purchase_units;
  if(remote.id!==order.paypal_order_id||!Array.isArray(units)||units.length!==1)throw new PaymentError("El pago no coincide con el pedido.",409);
  const u=units[0];
  if(u.invoice_id!==order.reference||u.custom_id!==order.id||u.amount?.currency_code!==order.currency||Math.round(Number(u.amount.value)*100)!==Math.round(Number(order.total)*100))throw new PaymentError("El importe del pago no coincide con el pedido.",409);
  return u;
}
async function settle(db,order,remote){
  const unit=verifyOrder(remote,order), captures=unit.payments?.captures||[];
  const capture=captures.find((c)=>c.status==="COMPLETED");
  if(!capture)return receipt(order);
  if(captures.length!==1||capture.amount.currency_code!==order.currency||Math.round(Number(capture.amount.value)*100)!==Math.round(Number(order.total)*100)||capture.final_capture!==true)throw new PaymentError("El cobro requiere revisión antes de confirmar el pedido.",409);
  return receipt(await rpc(db,"finish_payment",{p_id:order.id,p_capture:capture.id,p_amount:capture.amount.value,p_currency:capture.amount.currency_code,p_result:"paid",p_note:""}));
}
async function captureOrder(db,order){
  if(["paid","refunded"].includes(order.payment_status))return receipt(order);
  if(!order.paypal_order_id)throw new PaymentError("El pago todavía no se ha iniciado.",409);
  let remote=await paypal(`/v2/checkout/orders/${encodeURIComponent(order.paypal_order_id)}`);verifyOrder(remote,order);
  if(remote.status==="COMPLETED")return settle(db,order,remote);
  if(remote.status!=="APPROVED")throw new PaymentError("Aprueba el pago en PayPal antes de confirmarlo.",409);
  order=await rpc(db,"begin_capture",{p_id:order.id});
  try {remote=await paypal(`/v2/checkout/orders/${encodeURIComponent(order.paypal_order_id)}/capture`,{method:"POST",body:{},idempotencyKey:`capture-${order.id}`});}
  catch(error){
    if(error.providerCode==="ORDER_ALREADY_CAPTURED")remote=await paypal(`/v2/checkout/orders/${encodeURIComponent(order.paypal_order_id)}`);
    else if(["INSTRUMENT_DECLINED","TRANSACTION_REFUSED","PAYER_CANNOT_PAY"].includes(error.providerCode)){
      await rpc(db,"finish_payment",{p_id:order.id,p_capture:"",p_amount:order.total,p_currency:order.currency,p_result:"failed",p_note:"PayPal no aprobó el cobro."});throw error;
    }else throw error;
  }
  return settle(db,order,remote);
}
module.exports={configuration,database,PaymentError,paypal,receipt,rpc,findOrder,verifyOrder,settle,captureOrder,uuid};
