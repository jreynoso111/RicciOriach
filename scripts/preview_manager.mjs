// Isolated UI test fixture. It uses disposable PostgreSQL and never contacts the live database.
// Run explicitly with: node scripts/preview_manager.mjs; open http://127.0.0.1:4191/admin/
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {makeDatabase,ADMIN} from './test_commerce.mjs';
const {db,as}=await makeDatabase();const root=resolve(new URL('..',import.meta.url).pathname);
const schema={events:['id','title','date','status','city','venue','time','ticket_status','ticket_url','description','image_url','updated_at','created_at'],posts:['id','title','date','status','slug','category','author','image_url','excerpt','content','link','updated_at','created_at'],products:['id','title','status','description','category','variant','sku','image_url','price','currency','capacity','allocated','sale_mode','created_at','updated_at'],ticket_types:['id','event_id','title','description','status','price','currency','capacity','allocated','sale_mode','created_at','updated_at'],page_images:['id','image_url','alt','focal_x','focal_y','updated_at'],orders:['id','request_key','reference','kind','customer_name','customer_email','customer_phone','customer_note','items','total','currency','status','payment_mode','payment_status','payment_provider','payment_reference','inventory_held','hold_expires_at','admin_note','created_at','updated_at','paypal_order_id','payment_note'],site_admins:['user_id']};
const rpcTypes={submit_order:{p_customer:'jsonb',p_items:'jsonb',p_request_key:'uuid'},manage_order:{p_id:'uuid',p_status:'text',p_note:'text',p_payment_status:'text',p_expected_updated_at:'timestamptz'},expire_checkouts:{}};
const stub=`(() => {const admin=location.pathname.startsWith('/admin');const session=admin?{user:{id:'${ADMIN}',email:'qa@example.test'}}:null;const send=async(q)=>{const r=await fetch('/__fixture/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...q,role:admin?'authenticated':'anon'})});return r.json();};const builder=(table)=>{const q={table,filters:[],action:'select'};const b={select(){return b},order(column,opts={}){q.order={column,ascending:opts.ascending!==false};return b},eq(k,v){q.filters.push([k,v]);return b},range(a,z){q.range=[a,z];return b},insert(value){q.action='insert';q.value=value;return b},update(value){q.action='update';q.value=value;return b},single(){q.single=true;return b},maybeSingle(){q.single=true;return b},then(a,z){return send(q).then(a,z)}};return b;};window.riccieSupabase={auth:{onAuthStateChange(){},getSession:async()=>({data:{session}}),signOut:async()=>({error:null}),signInWithOtp:async()=>({error:{message:'Fixture de pruebas: sin envío de correos.'}})},from:builder,rpc(name,args){const q={rpc:name,args};const b={single(){return b},then(a,z){return send(q).then(a,z)}};return b},storage:{from(){return {upload:async()=>({error:{message:'Subidas remotas deshabilitadas en la prueba aislada.'}})}}}};})();`;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');
 try{
  if(url.pathname==='/__fixture/migration.html'){res.setHeader('Content-Type','text/html');const sql=(await Promise.all(['20260912011417_site_management_commerce.sql','20260912012555_paypal_order_lifecycle.sql'].map(n=>readFile(resolve(root,'supabase/migrations',n),'utf8')))).join('\n');return res.end('<!doctype html><meta charset="utf-8"><title>Migración del gestor Riccie Oriach</title><h1>Migración del gestor Riccie Oriach</h1><pre>'+sql.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</pre>');}
  if(url.pathname==='/assets/supabase-client.js'){res.setHeader('Content-Type','text/javascript');return res.end(stub);}
  if(url.pathname==='/api/payments'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({enabled:false,provider:'paypal',currencies:['USD','EUR']}));}
  if(url.pathname==='/__fixture/query'&&req.method==='POST'){
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2000000)throw Error('Too large');}const q=JSON.parse(raw);if(!['anon','authenticated'].includes(q.role))throw Error('Role');
    const result=await as(q.role,async(d)=>{
      if(q.rpc){const types=rpcTypes[q.rpc];if(!types)throw Error('RPC');const keys=Object.keys(types),params=keys.map(k=>types[k]==='jsonb'?JSON.stringify(q.args?.[k]):q.args?.[k]);const args=keys.map((k,i)=>`${k}=>$${i+1}::${types[k]}`);return(await d.query(`select to_jsonb(public.${q.rpc}(${args.join(',')})) as value`,params)).rows[0].value;}
      if(!schema[q.table])throw Error('Table');const valid=(k)=>{if(!schema[q.table].includes(k))throw Error('Column');return '"'+k+'"';};const values=[];let sql='';
      if(q.action==='select')sql=`select * from public.${q.table}`;
      if(q.action==='insert'){const keys=Object.keys(q.value);sql=`insert into public.${q.table}(${keys.map(valid).join(',')}) values(${keys.map((k)=>{values.push(q.value[k]);return '$'+values.length;}).join(',')})`;}
      if(q.action==='update')sql=`update public.${q.table} set ${Object.entries(q.value).map(([k,v])=>{values.push(v);return valid(k)+'=$'+values.length;}).join(',')}`;
      if(q.filters.length)sql+=' where '+q.filters.map(([k,v])=>{values.push(v);return valid(k)+'=$'+values.length;}).join(' and ');
      if(q.action!=='select')sql+=' returning *';else{if(q.order)sql+=` order by ${valid(q.order.column)} ${q.order.ascending?'asc':'desc'}`;if(q.range){sql+=` limit ${Math.max(1,Number(q.range[1])-Number(q.range[0])+1)} offset ${Math.max(0,Number(q.range[0]))}`;}}
      const r=await d.query(sql,values);r.rows.forEach(row=>{if(row.date instanceof Date)row.date=row.date.toISOString().slice(0,10);});return q.single?r.rows[0]||null:r.rows;
    });res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({data:result,error:null}));
  }
  let path=decodeURIComponent(url.pathname);if(path.endsWith('/'))path+='index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error('Path');
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'})[extname(file)]||'text/plain');res.end(await readFile(file));
 }catch(error){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:null,error:{message:error.message}}));}
});
server.listen(4191,'127.0.0.1',()=>console.log('Isolated UI fixture: http://127.0.0.1:4191/admin/ (disposable test data; no live Auth, Storage or PayPal).'));
process.on('SIGTERM',()=>server.close(async()=>{await db.close();process.exit(0);}));
