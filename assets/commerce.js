(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const {safeImage, money, available} = window.RiccieContent;
  const client = window.riccieSupabase;
  let products = [], cart = [], selection = [], paymentReady = false, sending = false, requestKey = null, formFingerprint = "", trigger = null;
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  const lineKey = (item) => `${item.kind}:${item.id}`;
  const notify = (text, error = false) => { $("#request-status").textContent = text; $("#request-status").classList.toggle("is-error", error); };
  const modal = el("dialog", undefined, "request-modal"); modal.id = "request-modal"; modal.setAttribute("aria-labelledby", "request-title");
  // Static markup only. Catalog and customer values are always assigned as text.
  modal.innerHTML = `<div class="modal-heading"><h2 id="request-title">Tu selección</h2><button type="button" class="modal-close" id="request-close" aria-label="Cerrar pedido">×</button></div>
    <div id="request-items"></div><p id="request-total" class="order-total"></p>
    <form id="request-form"><div class="checkout-fields"><label>Nombre completo<input name="name" required minlength="2" maxlength="120" autocomplete="name"></label><label>Correo electrónico<input name="email" type="email" required maxlength="254" autocomplete="email"></label><label>Teléfono (opcional)<input name="phone" type="tel" maxlength="40" autocomplete="tel"></label><label>Nota para el equipo (opcional)<textarea name="note" rows="2" maxlength="1000" placeholder="Talla, recogida o una consulta sobre tu pedido"></textarea></label><div class="request-honeypot" aria-hidden="true"><label>Deja este campo vacío<input name="website" tabindex="-1" autocomplete="off"></label></div><label>Cómo quieres completar tu pedido<select name="mode" id="request-mode"><option value="manual">Solicitar confirmación manual</option><option value="online">Pagar con PayPal</option></select></label></div><p id="request-explanation" class="field-note"></p><label class="request-consent"><input type="checkbox" name="consent" required> Acepto que el equipo use estos datos para gestionar y contactarme sobre esta solicitud.</label><button class="button" type="submit" id="request-submit">Enviar solicitud</button></form>
    <p id="request-status" role="status" class="request-status"></p><a class="text-link" id="receipt-contact" href="contact.html" hidden>Contactar al equipo ↗</a>`;
  document.body.append(modal);
  const form = $("#request-form");
  function close() { if (!sending) modal.close(); }
  $("#request-close").addEventListener("click", close);
  modal.addEventListener("cancel", (event) => { if (sending) event.preventDefault(); });
  modal.addEventListener("click", (event) => { if (event.target !== modal) return; const b=modal.getBoundingClientRect(); if (event.clientX<b.left || event.clientX>b.right || event.clientY<b.top || event.clientY>b.bottom) close(); });
  modal.addEventListener("close", () => { document.body.classList.remove("checkout-open"); trigger?.focus({preventScroll:true}); });
  const canManual = () => selection.length && selection.every((item) => item.sale_mode !== "online");
  const canOnline = () => paymentReady && selection.length && selection.every((item) => item.sale_mode !== "manual" && ["USD","EUR"].includes(item.currency) && Number(item.price)>0);
  function modes() {
    const select = $("#request-mode"); select.options[0].disabled = !canManual(); select.options[1].disabled = !canOnline();
    if (select.selectedOptions[0].disabled) select.value = canManual() ? "manual" : canOnline() ? "online" : "manual";
    const online = select.value === "online";
    $("#request-submit").disabled = !canManual() && !canOnline();
    $("#request-submit").textContent = online ? "Continuar a PayPal ↗" : "Enviar solicitud";
    $("#request-explanation").textContent = online ? "Completarás el pago en PayPal. Las unidades se apartan durante el proceso y tu pedido se confirma al aprobarse el cobro. La entrega se coordina con el equipo." : !canManual() ? "El pago online para esta selección todavía no está disponible. Contacta al equipo para más información." : "Esta solicitud no realiza ningún cobro ni garantiza unidades. El equipo confirmará disponibilidad y coordinará el pago y la entrega contigo.";
  }
  function renderSelection() {
    const root = $("#request-items"); root.replaceChildren();
    selection.forEach((item) => {
      const row = el("div", undefined, "selection-row"), info = el("div");
      info.append(el("strong", item.title), el("small", [item.variant, item.event, money(item.price,item.currency)].filter(Boolean).join(" · ")));
      const label = el("label", "Cantidad"), input = el("input"); input.type="number"; input.min=1; input.max=Math.min(10,available(item)); input.step=1; input.value=item.quantity; input.setAttribute("aria-label", `Cantidad de ${item.title}`);
      input.addEventListener("change", () => { const qty=Number(input.value); if (!Number.isInteger(qty)||qty<1||qty>Number(input.max)) { input.reportValidity(); return; } item.quantity=qty; if(item.kind==="product") saveCart(); total(); });
      label.append(input); const remove=el("button","Quitar","text-button"); remove.type="button"; remove.setAttribute("aria-label", `Quitar ${item.title}`);
      remove.addEventListener("click",()=>{ selection=selection.filter((x)=>lineKey(x)!==lineKey(item)); if(item.kind==="product"){cart=cart.filter((x)=>x.id!==item.id);saveCart();} renderSelection(); });
      row.append(info,label,remove);root.append(row);
    });
    form.hidden=!selection.length; if(!selection.length)root.append(el("p","Tu selección está vacía. Explora el catálogo y elige tus favoritos.")); total(); modes();
  }
  function total() {
    const currencies=[...new Set(selection.map((i)=>i.currency))];
    $("#request-total").textContent=currencies.map((c)=>money(selection.filter((i)=>i.currency===c).reduce((sum,i)=>sum+Math.round(Number(i.price)*100)*i.quantity,0)/100,c)).join(" + ");
  }
  function open(items, from) {
    if(sending)return; selection=items;trigger=from;notify("");$("#receipt-contact").hidden=true;
    renderSelection(); $("#request-title").textContent=items[0]?.kind==="ticket"?"Reserva tu lugar":"Tu selección";
    if(!modal.open)modal.showModal();document.body.classList.add("checkout-open");$("#request-close").focus();
  }
  function saveCart(){
    $("#cart-count") && ($("#cart-count").textContent=cart.reduce((sum,i)=>sum+i.quantity,0));
    try {sessionStorage.setItem("riccie-cart",JSON.stringify(cart.map(({id,quantity})=>({id,quantity}))));}catch{/* Optional shopping convenience. */}
  }
  function add(item, button){
    const old=cart.find((p)=>p.id===item.id); if(old){if(old.quantity>=Math.min(10,available(item))){open(cart,button);return;}old.quantity++;}else cart.push({...item,kind:"product",quantity:1});saveCart();
    const original=button.textContent;button.textContent="Añadido ✓";setTimeout(()=>{button.textContent=original;},1500);
  }
  function renderProducts(){
    const query=$("#product-search").value.toLocaleLowerCase("es"), category=$("#product-category").value;
    const selected=products.filter((i)=>(!category||i.category===category)&&(!$("#product-in-stock")?.checked||available(i)>0)&&[i.title,i.description,i.variant,i.category].join(" ").toLocaleLowerCase("es").includes(query));
    const sort=$("#product-sort")?.value;
    if(sort==="name")selected.sort((a,b)=>a.title.localeCompare(b.title,"es"));
    if(sort?.startsWith("price-"))selected.sort((a,b)=>a.currency.localeCompare(b.currency)||(sort==="price-asc"?Number(a.price)-Number(b.price):Number(b.price)-Number(a.price)));
    document.querySelectorAll("#shop-categories button").forEach((b)=>b.setAttribute("aria-pressed",String(b.dataset.category===category)));
    if($("#reset-shop-filters"))$("#reset-shop-filters").hidden=!(query||category||$("#product-in-stock")?.checked);
    const root=$("#product-grid");root.replaceChildren();
    selected.forEach((item)=>{
      const card=el("article",undefined,"product-card"), art=el("div",undefined,"product-art"), source=safeImage(item.image_url);
      if(source){const image=el("img");image.src=source;image.alt=item.title;image.loading="lazy";image.addEventListener("error",()=>{image.hidden=true;art.append(el("span","✳","product-placeholder"));},{once:true});art.append(image);}else art.append(el("span","✳","product-placeholder"));
      const body=el("div",undefined,"product-copy");body.append(el("p",[item.category,item.variant].filter(Boolean).join(" / "),"eyebrow"),el("h3",item.title),el("p",item.description,"product-description"));
      const tail=el("div",undefined,"product-tail");const count=available(item),button=el("button",count?"Añadir +":"Agotado","button button-outline");button.type="button";button.disabled=!count;button.addEventListener("click",()=>add(item,button));
      tail.append(el("strong",money(item.price,item.currency)),button);body.append(tail);card.append(art,body);root.append(card);
    });
    $("#shop-count").textContent=`${selected.length} ${selected.length===1?"pieza":"piezas"}`;$("#shop-empty").hidden=selected.length>0;
    if(products.length && !selected.length){$("#shop-empty h3").textContent="No encontramos esa pieza.";$("#shop-empty p").textContent="Prueba otra búsqueda o categoría.";}
    else{$("#shop-empty h3").textContent="La colección viene en camino.";$("#shop-empty p").textContent="El catálogo todavía no tiene productos publicados. Vuelve pronto para descubrir las primeras piezas.";}
  }
  async function loadProducts(){
    $("#shop-retry").hidden=true;
    try{
      if(!client)throw new Error("No se pudo conectar con la tienda.");
      await client.rpc("expire_checkouts");
      const result=await client.from("products").select("*").eq("status","Publicado").order("created_at",{ascending:false});if(result.error)throw result.error;
      products=result.data||[];
      const filter=$("#product-category");filter.replaceChildren();const all=el("option","Todos los productos");all.value="";filter.append(all);
      [...new Set(products.map((i)=>i.category).filter(Boolean))].sort().forEach((c)=>{const option=el("option",c);option.value=c;filter.append(option);});
      try{const cached=JSON.parse(sessionStorage.getItem("riccie-cart")||"[]");cart=Array.isArray(cached)?cached.flatMap((entry)=>{const item=products.find((p)=>p.id===entry.id);return item&&available(item)>0&&Number.isInteger(entry.quantity)&&entry.quantity>0?[{...item,kind:"product",quantity:Math.min(entry.quantity,10,available(item))}]:[];}):[];}catch{cart=[];}
      const collections=$("#shop-categories");
      if(collections){collections.replaceChildren();["",...new Set(products.map((i)=>i.category).filter(Boolean))].forEach((category)=>{const b=el("button",category||"Todos los productos");b.type="button";b.dataset.category=category;b.addEventListener("click",()=>{filter.value=category;renderProducts();});collections.append(b);});}
      saveCart();renderProducts();
    }catch{ $("#shop-count").textContent="No pudimos cargar la tienda. Inténtalo de nuevo.";$("#shop-retry").hidden=false;}
  }
  let ticketRequest=0;
  async function showTickets(event){
    const root=$("#event-tickets");if(!root)return;const generation=++ticketRequest;root.replaceChildren(el("p","Consultando taquillas…","field-note"));
    try{
      if(!client)throw new Error();await client.rpc("expire_checkouts");
      const result=await client.from("ticket_types").select("*").eq("event_id",event.id).eq("status","Publicado").order("price");if(result.error)throw result.error;if(generation!==ticketRequest)return;
      root.replaceChildren();if(!result.data.length)return;root.append(el("h3","Elige tu entrada"));
      result.data.forEach((ticket)=>{
        const row=el("div",undefined,"ticket-option"),copy=el("div");copy.append(el("strong",ticket.title),el("p",ticket.description),el("small",money(ticket.price,ticket.currency)));
        const button=el("button",available(ticket)?"Seleccionar":"Agotadas","button button-outline");button.type="button";button.disabled=!available(ticket)||!["available","free"].includes(event.ticketStatus||event.ticket_status||"available");button.addEventListener("click",()=>open([{...ticket,kind:"ticket",event:event.title,quantity:1}],button));row.append(copy,button);root.append(row);
      });
    }catch{if(generation===ticketRequest)root.replaceChildren(el("p","No pudimos consultar las taquillas. Cierra y vuelve a abrir los detalles para intentarlo de nuevo.","field-note"));}
  }
  window.RiccieCommerce={showTickets};
  $("#request-mode").addEventListener("change",modes);
  form.addEventListener("submit",async(event)=>{
    event.preventDefault();if(sending||!selection.length||!form.reportValidity())return;
    const quantities=[...$("#request-items").querySelectorAll("input")];if(quantities.some((input)=>!input.reportValidity()))return;
    if(new Set(selection.map((i)=>i.currency)).size!==1){notify("Envía cada moneda en un pedido separado. Quita los artículos de otra moneda para continuar.",true);return;}
    const customer=Object.fromEntries(new FormData(form));const mode=customer.mode;delete customer.mode;delete customer.consent;
    if((mode==="manual"&&!canManual())||(mode==="online"&&!canOnline())){notify("Esta modalidad no está disponible para la selección.",true);return;}
    const items=selection.map(({id,kind,quantity})=>({id,kind,quantity}));const fingerprint=JSON.stringify({customer,items,mode});
    if(fingerprint!==formFingerprint){formFingerprint=fingerprint;requestKey=crypto.randomUUID();}
    sending=true;modal.querySelectorAll("input,textarea,select,button").forEach((n)=>n.disabled=true);notify(mode==="online"?"Preparando el pago seguro…":"Enviando solicitud…");
    try{
      let receipt;
      if(mode==="manual"){
        const result=await client.rpc("submit_order",{p_customer:customer,p_items:items,p_request_key:requestKey});if(result.error)throw result.error;receipt=result.data;
      }else{
        const response=await fetch("/api/payments?action=create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer,items,requestKey})});const value=await response.json();if(!response.ok)throw new Error(value.error||"No se pudo iniciar el pago.");
        if(value.completed){ location.assign(`/payment.html?key=${encodeURIComponent(requestKey)}`); return; }
        const url=new URL(value.approvalUrl);if(url.protocol!=="https:"||!['www.paypal.com','www.sandbox.paypal.com'].includes(url.hostname))throw new Error("No se recibió un enlace de pago válido.");
        try{sessionStorage.setItem("riccie-paypal-key",requestKey);}catch{}
        location.assign(url.href);return;
      }
      form.hidden=true;$("#request-items").replaceChildren();$("#request-total").textContent=money(receipt.total,receipt.currency);$("#request-title").textContent="Solicitud recibida.";
      notify(`Tu referencia es ${receipt.reference}. Estado: ${receipt.status}. El equipo te contactará para confirmar disponibilidad, pago y entrega. Conserva esta referencia; no se ha realizado ningún cobro.`);
      $("#receipt-contact").hidden=false;
      if(selection[0]?.kind==="product"){cart=[];saveCart();}selection=[];requestKey=null;formFingerprint="";form.reset();
    }catch(error){notify(error.message||"No se pudo enviar. Conservamos tus datos para reintentar.",true);}
    finally{sending=false;modal.querySelectorAll("input,textarea,select,button").forEach((n)=>n.disabled=false);if(!form.hidden)modes();}
  });
  fetch("/api/payments?action=config").then((r)=>r.ok?r.json():null).then((v)=>{paymentReady=v?.enabled===true;if(modal.open)modes();}).catch(()=>{});
  if($("#product-grid")){
    $("#product-sort")?.addEventListener("change",renderProducts);$("#product-in-stock")?.addEventListener("change",renderProducts);
    $("#reset-shop-filters")?.addEventListener("click",()=>{$("#product-search").value="";$("#product-category").value="";$("#product-in-stock").checked=false;renderProducts();});
    $("#product-search").addEventListener("input",renderProducts);$("#product-category").addEventListener("change",renderProducts);$("#open-cart").addEventListener("click",(e)=>open(cart,e.currentTarget));$("#shop-retry").addEventListener("click",loadProducts);loadProducts();
  }
})();
