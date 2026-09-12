const assert=require('node:assert/strict');
const {configuration,verifyOrder}=require('../lib/payments');
const handler=require('../api/payments');
const webhook=require('../api/paypal-webhook');
const mockRes=()=>({headers:{},setHeader(k,v){this.headers[k]=v},status(code){this.code=code;return this},json(body){this.body=body;return this},end(){return this}});
(async()=>{
 assert.equal(configuration({}).enabled,false);
 assert.equal(configuration({PAYPAL_CLIENT_ID:'id',PAYPAL_CLIENT_SECRET:'secret',PAYPAL_WEBHOOK_ID:'webhook',SUPABASE_SERVICE_ROLE_KEY:'key',SITE_URL:'http://unsafe.test',PAYPAL_ENV:'live'}).enabled,false);
 const order={id:'local',paypal_order_id:'PAYPAL',reference:'RO-ABC',currency:'USD',total:25};
 const valid={id:'PAYPAL',purchase_units:[{invoice_id:'RO-ABC',custom_id:'local',amount:{currency_code:'USD',value:'25.00'}}]};
 assert.doesNotThrow(()=>verifyOrder(valid,order));
 for(const changed of [{...valid,id:'OTHER'},{...valid,purchase_units:[{...valid.purchase_units[0],amount:{currency_code:'USD',value:'1.00'}}]},{...valid,purchase_units:[{...valid.purchase_units[0],custom_id:'other'}]}])assert.throws(()=>verifyOrder(changed,order));
 const old={...process.env}; for(const key of ['PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_WEBHOOK_ID','SUPABASE_SERVICE_ROLE_KEY'])delete process.env[key];
 let res=mockRes();await handler({method:'GET',query:{action:'config'},headers:{}},res);assert.equal(res.code,200);assert.equal(res.body.enabled,false);
 res=mockRes();await handler({method:'POST',query:{action:'create'},headers:{},body:{}},res);assert.equal(res.code,503);
 res=mockRes();await webhook({method:'POST',headers:{},body:{event_type:'PAYMENT.CAPTURE.COMPLETED'}},res);assert.equal(res.code,503);
 Object.assign(process.env,old);
 console.log('PayPal checks passed: disabled configuration, invalid amounts, currencies/order bindings, and endpoint gating.');
})();
