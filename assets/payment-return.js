(() => {
  "use strict";
  const params=new URLSearchParams(location.search),key=params.get("key"),retry=document.querySelector("#payment-retry");let action=params.has("cancel")?"cancel":"capture";
  const title=document.querySelector("#payment-title"),message=document.querySelector("#payment-message"),ref=document.querySelector("#payment-reference");
  // Strip the receipt capability from the URL before following external links.
  history.replaceState(null,"",location.pathname);
  async function check(){
    retry.hidden=true;
    if(!key){title.textContent="Elige tu próximo viaje.";message.textContent="No hay un pago para consultar. Puedes volver a la tienda o a las presentaciones.";return;}
    try{
      const response=await fetch(`/api/payments?action=${action}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestKey:key})});const value=await response.json();if(!response.ok)throw new Error(value.error||"No se pudo consultar el pago.");
      ref.textContent=`Referencia: ${value.reference} · ${window.RiccieContent.money(value.total,value.currency)}`;
      if(value.paymentStatus==="paid"){title.textContent="Tu pago está confirmado.";message.textContent="Tu pedido quedó registrado. Conserva la referencia; el equipo coordinará la entrega contigo.";}
      else if(value.paymentStatus==="refunded"){title.textContent="Pago reembolsado.";message.textContent=value.paymentNote;}
      else if(value.paymentStatus==="failed"){title.textContent="El pago no se completó.";message.textContent=value.paymentNote||"Puedes volver al catálogo y crear otra solicitud.";}
      else {title.textContent="El pago sigue pendiente.";message.textContent="Todavía no recibimos la confirmación de PayPal. Conserva la referencia y vuelve a consultar antes de crear otro pedido.";retry.hidden=false;}
    }catch(error){title.textContent="No pudimos confirmar el pago.";message.textContent=error.message;retry.hidden=false;}
  }
  retry.addEventListener("click",check);check();
})();
