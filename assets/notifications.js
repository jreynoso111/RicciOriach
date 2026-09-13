(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const client = window.riccieSupabase;
  const preview = Boolean(window.RicciePreview);
  let currentProduct = null;
  let returnFocus = null;

  const dialog = document.createElement("dialog");
  dialog.className = "request-modal notification-modal";
  dialog.id = "notification-modal";
  dialog.setAttribute("aria-labelledby", "notification-title");
  dialog.innerHTML = `
    <div class="modal-heading">
      <div>
        <p class="eyebrow">Avisos de Riccie</p>
        <h2 id="notification-title">Te avisamos</h2>
      </div>
      <button type="button" class="modal-close" id="notification-close" aria-label="Cerrar formulario">×</button>
    </div>
    <p id="notification-explanation" class="field-note"></p>
    <form id="notification-form">
      <div class="checkout-fields">
        <label>Correo electrónico<input name="email" type="email" required maxlength="254" autocomplete="email" placeholder="tu@correo.com"></label>
        <div class="request-honeypot" aria-hidden="true"><label>Deja este campo vacío<input name="website" tabindex="-1" autocomplete="off"></label></div>
      </div>
      <label class="request-consent"><input type="checkbox" name="consent" required> Acepto recibir un correo sobre esta disponibilidad y autorizo que se guarde mi dirección para ese aviso.</label>
      <button class="button" type="submit" id="notification-submit">Avisarme</button>
    </form>
    <p id="notification-status" role="status" class="request-status"></p>`;
  document.body.append(dialog);

  const form = $("#notification-form", dialog);
  const submitButton = $("#notification-submit", dialog);
  const status = (target, message, isError = false) => {
    target.textContent = message;
    target.classList.toggle("is-error", isError);
  };

  function closeDialog() {
    if (dialog.open) dialog.close();
  }

  $("#notification-close", dialog).addEventListener("click", closeDialog);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog();
  });
  dialog.addEventListener("close", () => returnFocus?.focus({ preventScroll: true }));

  function openProduct(product, trigger) {
    if (!product?.id || !product?.title || dialog.open) return;
    currentProduct = product;
    returnFocus = trigger || document.activeElement;
    form.reset();
    status($("#notification-status", dialog), "");
    $("#notification-title", dialog).textContent = "Avísame cuando vuelva";
    $("#notification-explanation", dialog).textContent = `Te escribiremos cuando haya unidades disponibles de ${product.title}. Usaremos tu correo solo para este aviso.`;
    submitButton.textContent = "Avísame cuando vuelva";
    dialog.showModal();
    $("input[name=email]", form).focus();
  }

  async function submit(formElement, notificationType, productId = null) {
    if (!formElement.reportValidity()) return;
    const data = new FormData(formElement);
    const email = String(data.get("email") || "").trim();
    const website = String(data.get("website") || "").trim();
    const statusElement = $("[role=status]", formElement.parentElement) || $("#event-notification-status");
    const button = $("[type=submit]", formElement);
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "Guardando…";
    status(statusElement, "");

    try {
      if (preview) {
        status(statusElement, "Vista previa local: no guardamos ni enviamos correos desde aquí.");
        formElement.reset();
        return;
      }
      if (!client) throw new Error("El registro de avisos no está conectado.");
      const { error } = await client.rpc("subscribe_notification", {
        p_email: email,
        p_notification_type: notificationType,
        p_product_id: productId,
        p_consent: data.get("consent") === "on",
        p_website: website,
      });
      if (error) throw error;
      status(statusElement, notificationType === "new_events"
        ? "Listo. Te avisaremos cuando anunciemos nuevas presentaciones."
        : "Listo. Te avisaremos cuando el producto vuelva a estar disponible.");
      formElement.reset();
    } catch (error) {
      const notConfigured = ["PGRST202", "42883"].includes(error?.code);
      status(statusElement, notConfigured
        ? "La lista de avisos todavía se está conectando. Inténtalo más tarde."
        : "No pudimos guardar la solicitud. Revisa el correo e inténtalo de nuevo.", true);
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (currentProduct) submit(form, "product_stock", currentProduct.id);
  });

  const eventForm = $("#event-notification-form");
  if (eventForm) {
    const eventNote = $("#event-notification-note");
    if (preview && eventNote) eventNote.textContent = "Vista previa local: las direcciones de correo no se guardan ni se envían.";
    eventForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submit(eventForm, "new_events");
    });
  }

  window.RiccieNotifications = { openProduct };
})();
