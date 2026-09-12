(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const client = window.riccieSupabase;
  const { photos, safeImage, money, available } = window.RiccieContent;
  const form = $("#editor-form");
  const field = (name) => form.elements.namedItem(name);
  const kinds = {
    page_images: ["Fotos de la web", "Elige una foto, ajusta el encuadre y revisa el resultado. Los efectos originales se conservan.", "foto"],
    events: ["Eventos", "Gestiona fechas, lugares, afiches y estados. Crea sus tipos de entrada desde Taquillas.", "evento"],
    ticket_types: ["Taquillas", "Crea entradas General, VIP o por etapa; establece precio, cupo y modalidad de pago.", "taquilla"],
    products: ["Tienda", "Publica productos con precio e inventario. Crea un producto por talla o variante para controlar sus unidades.", "producto"],
    orders: ["Pedidos y reservas", "Revisa solicitudes, confirma disponibilidad y registra la entrega. Los pagos automáticos llegan confirmados por la pasarela.", "pedido"],
  };
  let content = Object.fromEntries(Object.keys(kinds).map((key) => [key, []]));
  let kind = "page_images", editing = null, dirty = false, busy = false, preparing = false, imageGeneration = 0;
  let session = null, loadedUser = null, sessionGeneration = 0, moreOrders = false;
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const msg = (text, error = false) => {
    $("#save-status").textContent = text;
    $("#save-status").classList.toggle("is-error", error);
  };
  const status = (selector, text, error = false) => {
    $(selector).textContent = text;
    $(selector).classList.toggle("is-error", error);
  };
  const leave = () => !busy && !preparing && (!dirty || window.confirm("Hay cambios sin guardar. ¿Quieres descartarlos?"));
  window.addEventListener("beforeunload", (e) => { if (dirty || busy || preparing) { e.preventDefault(); e.returnValue = ""; } });
  const control = (name, label, options = {}) => {
    const wrap = el("label", label);
    let input;
    if (options.options) {
      input = el("select");
      options.options.forEach((entry) => {
        const [value, text] = Array.isArray(entry) ? entry : [entry, entry];
        const option = el("option", text); option.value = value; input.append(option);
      });
    } else {
      input = el(options.multiline ? "textarea" : "input");
      if (!options.multiline) input.type = options.type || "text";
      if (options.multiline) input.rows = options.rows || 3;
    }
    input.name = name;
    for (const property of ["required", "maxLength", "min", "max", "step", "placeholder", "readOnly", "pattern"]) {
      if (options[property] !== undefined) input[property] = options[property];
    }
    if (options.value !== undefined) input.value = options.value;
    wrap.append(input);
    if (options.note) wrap.append(el("small", options.note, "field-note"));
    return wrap;
  };
  const group = (...nodes) => { const wrapper = el("div", undefined, "field-grid"); wrapper.append(...nodes); return wrapper; };
  const standardStatus = () => control("status", "Estado", { options: ["Borrador", "Publicado", "Archivado"] });
  const area = (name, label, limit = 3000, rows = 3) => control(name, label, { multiline: true, maxLength: limit, rows });
  const text = (name, label, maxLength = 180, required = false) => control(name, label, { maxLength, required });
  function imageEditor(pagePhoto = false) {
    const root = el("div", undefined, "photo-editor");
    root.append(control("image_url", "Dirección de la foto", { placeholder: "https://…", maxLength: 1500 }));
    const picker = control("photo-file", "Subir foto", { type: "file" });
    picker.lastChild.accept = "image/jpeg,image/png,image/webp";
    root.append(picker, el("p", "JPG, PNG o WebP, hasta 8 MB. Se optimiza antes de subir.", "field-note"));
    const preview = el("figure", undefined, "photo-preview"); preview.id = "photo-preview";
    const img = el("img"); img.alt = "Vista previa de la foto"; img.id = "photo-img"; preview.append(img);
    root.append(preview);
    const clear = el("button", pagePhoto ? "Restaurar foto original" : "Quitar foto", "text-button"); clear.type = "button";
    clear.addEventListener("click", () => {
      if (busy || preparing) return;
      field("image_url").value = "";
      field("photo-file").value = "";
      if (pagePhoto) {
        const defaults = photos.find((p) => p.id === editing.id);
        field("focal_x").value = defaults.focal_x; field("focal_y").value = defaults.focal_y;
        field("alt").value = defaults.alt;
      }
      markDirty(); updatePreview();
    });
    root.append(clear);
    if (pagePhoto) {
      root.append(text("alt", "Descripción de la foto", 300), group(
        control("focal_x", "Encuadre horizontal", { type: "range", min: 0, max: 100, value: 50 }),
        control("focal_y", "Encuadre vertical", { type: "range", min: 0, max: 100, value: 50 }),
      ));
      root.append(el("p", "El filtro, la máscara, los bordes y las animaciones pertenecen al diseño y se conservan al cambiar la foto.", "field-note"));
      const link = el("a", "Abrir página ↗", "text-link"); link.id = "photo-page-link"; link.target = "_blank"; link.rel = "noopener"; root.append(link);
      const toggle = el("button", "Vista previa en la página", "text-button"); toggle.type = "button";
      toggle.addEventListener("click", () => {
        const frame = $("#page-preview"); frame.hidden = !frame.hidden;
        if (!frame.hidden && !frame.src) {
          const url = new URL(photos.find((p) => p.id === editing.id).page, location.origin);
          url.searchParams.set("photo-preview", editing.id); frame.src = url.href;
        }
        toggle.textContent = frame.hidden ? "Vista previa en la página" : "Ocultar vista previa";
      });
      const frame = el("iframe"); frame.id = "page-preview"; frame.title = "Vista previa con los efectos de la web"; frame.hidden = true;
      frame.addEventListener("load", updatePreview); root.append(toggle, frame);
    }
    picker.lastChild.addEventListener("change", async () => {
      const file = field("photo-file").files?.[0]; if (!file || busy) return;
      const generation = ++imageGeneration; preparing = true; lock(true); msg("Preparando foto…");
      try {
        const value = await compressImage(file);
        if (generation !== imageGeneration) return;
        field("image_url").value = value; markDirty(); updatePreview(); msg("Foto lista. Guarda los cambios para publicarla.");
      } catch (error) { msg(error.message, true); }
      finally { preparing = false; lock(false); }
    });
    return root;
  }
  function updatePreview() {
    const image = $("#photo-img"); if (!image) return;
    const defaults = kind === "page_images" ? photos.find((p) => p.id === editing?.id) : null;
    const value = field("image_url").value.trim();
    field("image_url").setCustomValidity(value && !safeImage(value, true) ? "Usa una URL HTTPS válida o sube una foto." : "");
    const source = safeImage(value, true) || (defaults ? safeImage(defaults.default_url) : "");
    $("#photo-preview").hidden = !source;
    if (source) image.src = source; else image.removeAttribute("src");
    const x = field("focal_x")?.value || defaults?.focal_x || 50, y = field("focal_y")?.value || defaults?.focal_y || 50;
    image.style.objectPosition = `${x}% ${y}%`;
    $("#photo-preview").className = `photo-preview effect-${defaults?.effect || "cover"}`;
    if (defaults) {
      $("#photo-page-link").href = `../${defaults.page}`;
      $("#page-preview")?.contentWindow?.postMessage({type: "riccie-photo-preview", id: defaults.id, image_url: source, alt: field("alt")?.value || defaults.alt, focal_x: Number(x), focal_y: Number(y)}, location.origin);
    }
  }
  async function compressImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Elige una foto JPG, PNG o WebP.");
    if (file.size > 8_000_000) throw new Error("La foto supera 8 MB.");
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error("No se pudo leer la foto.")); i.src = url; });
      const scale = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.7, 0.55]) {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (blob && blob.size <= 900_000) return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
      }
      throw new Error("La foto sigue siendo demasiado pesada. Elige otra más ligera.");
    } finally { URL.revokeObjectURL(url); }
  }
  function markDirty() { dirty = true; msg("Cambios sin guardar."); }
  form.addEventListener("input", () => { if (!busy) { markDirty(); updatePreview(); } });
  form.addEventListener("change", () => { if (!busy) { markDirty(); updatePreview(); } });
  function lock(value) {
    form.querySelectorAll("input,select,textarea,button").forEach((input) => { input.disabled = value; });
    $("#refresh-records").disabled = value; $("#new-record").disabled = value;
  }
  function edit(item = null) {
    imageGeneration++; editing = item; dirty = false;
    const root = $("#editor-fields"); root.replaceChildren(); msg("");
    form.hidden = kind === "orders" && !item;
    $("#editor-title").textContent = kind === "page_images" ? item.title : kind === "orders" ? item?.reference || "Elige un pedido" : `${item ? "Editar" : "Crear"} ${kinds[kind][2]}`;
    $("#record-state").textContent = item?.status || (kind === "page_images" ? "" : "Borrador");
    $("#archive-record").hidden = !item || ["page_images", "orders"].includes(kind) || item.status === "Archivado";
    if (kind === "page_images") root.append(imageEditor(true));
    else if (kind === "orders") { if (item) orderEditor(root, item); }
    else {
      root.append(text("title", "Título", 180, true));
      if (kind === "events") root.append(group(control("date", "Fecha", { type: "date", required: true }), standardStatus()));
      else root.append(standardStatus());
      if (kind === "events") root.append(
        group(text("city", "Ciudad", 120, true), text("venue", "Lugar", 180, true)),
        group(control("time", "Hora local", { type: "time" }), control("ticket_status", "Estado de las entradas", { options: [["available", "Disponibles / por anunciar"], ["free", "Entrada libre"], ["soldout", "Agotadas"], ["postponed", "Pospuesto"], ["cancelled", "Cancelado"]] })),
        control("ticket_url", "Enlace externo de entradas (opcional)", { type: "url", pattern: "https://.*", note: "Las taquillas de esta web se configuran en la pestaña Taquillas." }), area("description", "Detalles"), imageEditor(),
      );
      if (kind === "ticket_types") root.append(control("event_id", "Presentación", { required: true, options: [["", "Selecciona una presentación"], ...content.events.map((e) => [e.id, `${e.title} · ${e.date} · ${e.status}`])], note: "Solo se venden entradas para presentaciones publicadas y vigentes." }));
      if (kind === "products") root.append(group(text("category", "Categoría", 120), text("variant", "Talla / variante", 120)), text("sku", "Referencia / SKU", 80), imageEditor());
      if (["products", "ticket_types"].includes(kind)) root.append(
        area("description", "Descripción"), group(control("price", "Precio por unidad", { type: "number", min: 0, max: 1000000, step: "0.01", required: true, value: 0 }), control("currency", "Moneda", { options: [["DOP", "Pesos dominicanos (DOP)"], ["USD", "Dólares (USD)"], ["EUR", "Euros (EUR)"]] })),
        control("capacity", kind === "products" ? "Inventario total" : "Cupo total", { type: "number", min: item?.allocated || 0, max: 1000000, step: 1, required: true, value: 0, note: `${item?.allocated || 0} unidades asignadas a pedidos confirmados o en proceso de pago. Disponible = total menos asignadas.` }),
        control("sale_mode", "Modalidad de compra", { options: [["manual", "Solicitud con confirmación manual"], ["both", "Manual y pago automático"], ["online", "Solo pago automático"]], note: "PayPal admite USD y EUR. Activa las credenciales de la pasarela antes de usar esta modalidad. Los importes en DOP se gestionan manualmente." }),
      );
    }
    if (item) Object.entries(item).forEach(([name, value]) => { const input = field(name); if (input && input.type !== "file") input.value = value ?? ""; });
    if (kind === "orders" && item) { field("admin_note").value = item.admin_note; field("next_status").value = item.status; if (field("manual_payment")) field("manual_payment").value = item.payment_status; }
    $("#editor-help").textContent = kind === "orders" ? "Confirmar una solicitud manual asigna inventario. Cancelarla libera sus unidades. El registro del pago es independiente de la entrega." : kind === "page_images" ? "La foto se actualiza en la web al guardar. Puedes restaurar la original cuando quieras." : "Publicado aparece en la web. Borrador y Archivado quedan fuera del catálogo público.";
    updatePreview(); render();
  }
  function orderEditor(root, item) {
    const meta = el("div", undefined, "order-summary");
    meta.append(el("p", `${item.kind === "ticket" ? "Reserva de entradas" : "Pedido de tienda"} · ${new Date(item.created_at).toLocaleString("es-DO")}`, "field-note"), el("h3", item.customer_name), el("p", item.customer_email), el("p", item.customer_phone || "Sin teléfono"));
    if (item.customer_note) meta.append(el("p", item.customer_note, "order-customer-note"));
    root.append(meta);
    const list = el("ul", undefined, "order-lines");
    item.items.forEach((line) => { const row = el("li"); row.append(el("span", `${line.quantity} × ${line.title}${line.variant ? ` · ${line.variant}` : ""}${line.event ? ` / ${line.event}` : ""}`), el("strong", money(line.quantity * line.unit_price, item.currency))); list.append(row); });
    root.append(list, el("p", `Total: ${money(item.total, item.currency)}`, "order-total"), el("p", `Pago ${item.payment_mode === "manual" ? "manual" : item.payment_provider.toUpperCase()} · ${{ pending: "Pendiente de pago", processing: "Confirmando pago", paid: "Pagado", failed: "No aprobado", refunded: "Reembolsado" }[item.payment_status]}`, "payment-badge"));
    if (item.payment_reference) root.append(el("p", `Transacción: ${item.payment_reference}`, "field-note"));
    if(item.payment_note) root.append(el("p",item.payment_note,"field-note"));
    const next = { Pendiente: ["Pendiente", "Confirmado", "Cancelado"], Confirmado: ["Confirmado", "Entregado", "Cancelado"], Entregado: ["Entregado"], Cancelado: ["Cancelado"] }[item.status];
    root.append(control("next_status", "Estado del pedido", { options: item.payment_mode === "online" ? next.filter((s) => s === item.status || s === "Entregado") : next }));
    if (item.payment_mode === "manual") root.append(control("manual_payment", "Registro del cobro manual", { options: [["pending", "Pendiente de cobro"], ["paid", "Pago recibido y verificado"]] }));
    else root.append(el("p", "La pasarela confirma el pago. Reembolsos y anulaciones se tramitan en el portal de PayPal.", "field-note"));
    root.append(area("admin_note", "Notas internas", 2000));
  }
  function render() {
    const query = $("#record-search").value.toLocaleLowerCase("es"); const filter = $("#record-filter").value;
    const records = content[kind].filter((item) => (!filter || item.status === filter) && [item.title, item.city, item.venue, item.category, item.reference, item.customer_name, item.customer_email, item.variant, content.events.find((e) => e.id === item.event_id)?.title].join(" ").toLocaleLowerCase("es").includes(query));
    const root = $("#records"); root.replaceChildren();
    if (!records.length) root.append(el("p", query || filter ? "No hay resultados con estos filtros." : kind === "orders" ? "Los pedidos y reservas aparecerán aquí cuando lleguen." : "Todavía no hay registros. Crea el primero como borrador.", "records-empty"));
    records.forEach((item) => {
      const button = el("button", undefined, "record"); button.type = "button"; button.setAttribute("aria-current", String(item.id === editing?.id));
      const copy = el("span", undefined, "record-copy");
      copy.append(el("span", item.status || (item.image_url ? "Foto personalizada" : "Foto original"), "record-status"), el("strong", item.title || item.reference));
      let detail = [item.date, item.city, item.venue].filter(Boolean).join(" · ");
      if (kind === "page_images") detail = item.page;
      if (["products", "ticket_types"].includes(kind)) detail = `${money(item.price, item.currency)} · ${available(item)} disponibles${item.variant ? ` · ${item.variant}` : ""}${item.event_id ? ` · ${content.events.find((e) => e.id === item.event_id)?.title || "Presentación"}` : ""}`;
      if (kind === "orders") detail = `${item.customer_name} · ${money(item.total, item.currency)} · ${item.kind === "ticket" ? "Entradas" : "Tienda"}`;
      copy.append(el("small", detail));
      const source = safeImage(item.image_url || item.default_url);
      if (source) { const image = el("img", undefined, "record-thumb"); image.src = source; image.alt = ""; image.loading = "lazy"; button.classList.add("record-has-image"); button.append(image); }
      button.append(copy); button.addEventListener("click", () => { if (leave()) edit(item); }); root.append(button);
    });
    $("#record-count").textContent = `${records.length} ${records.length === 1 ? "registro" : "registros"}${kind === "orders" && moreOrders ? " cargados · hay más pedidos" : ""}`;
    $("#load-more").hidden = kind !== "orders" || !moreOrders;
    $("#count-events").textContent = content.events.filter((r) => r.status === "Publicado").length;
    $("#count-products").textContent = content.products.filter((r) => r.status === "Publicado").length;
    $("#count-pending").textContent = content.orders.filter((r) => r.status === "Pendiente").length;
    $("#count-drafts").textContent = ["events", "products", "ticket_types"].flatMap((k) => content[k]).filter((r) => r.status === "Borrador").length;
  }
  function switchKind(next) {
    if (!leave()) return; kind = next;
    document.querySelectorAll("[data-kind]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === kind)));
    $("#kind-help-label").textContent = kinds[kind][0]; $("#kind-help-copy").textContent = kinds[kind][1];
    $("#new-record").hidden = ["page_images", "orders"].includes(kind); $("#new-record").textContent = `Crear ${kinds[kind][2]} +`;
    $("#record-search").value = ""; $("#filter-label").hidden = kind === "page_images";
    $("#record-filter").replaceChildren();
    ["", ...(kind === "orders" ? ["Pendiente", "Confirmado", "Entregado", "Cancelado"] : ["Borrador", "Publicado", "Archivado"])].forEach((v) => { const o = el("option", v || "Todos"); o.value = v; $("#record-filter").append(o); });
    edit(["page_images", "orders"].includes(kind) ? content[kind][0] || null : null);
  }
  async function upload(value) {
    if (!value.startsWith("data:")) return { url: value };
    if (!safeImage(value, true)) throw new Error("Foto inválida.");
    const blob = await (await fetch(value)).blob(), path = `${kind}/${crypto.randomUUID()}.jpg`;
    const result = await client.storage.from("site-media").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
    if (result.error) throw result.error;
    return { path, url: client.storage.from("site-media").getPublicUrl(path).data.publicUrl };
  }
  async function save() {
    if (busy || preparing || !form.reportValidity()) return;
    const values = Object.fromEntries([...new FormData(form)].filter(([name]) => name !== "photo-file").map(([k, v]) => [k, String(v).trim()]));
    if (["products","ticket_types"].includes(kind) && values.sale_mode === "online" && values.currency === "DOP") { msg("Para PayPal elige USD o EUR. En DOP utiliza la confirmación manual.",true); return; }
    busy = true; lock(true); msg("Guardando…"); let uploaded;
    try {
      if (!session) throw new Error("Inicia sesión para guardar.");
      let result;
      if (kind === "orders") result = await client.rpc("manage_order", { p_id: editing.id, p_status: values.next_status, p_note: values.admin_note, p_payment_status: values.manual_payment || editing.payment_status, p_expected_updated_at: editing.updated_at }).single();
      else {
        for (const key of ["price", "capacity", "focal_x", "focal_y"]) if (key in values) values[key] = Number(values[key]);
        if ("image_url" in values) { uploaded = await upload(values.image_url); values.image_url = uploaded.url; }
        const id = editing?.id || crypto.randomUUID();
        result = editing?.updated_at ? await client.from(kind).update(values).eq("id", id).eq("updated_at", editing.updated_at).select().maybeSingle() : await client.from(kind).insert({id, ...values}).select().single();
        if (!result.error && !result.data) throw new Error("Otra sesión modificó este registro. Actualiza el listado antes de guardar.");
      }
      if (result.error) throw result.error;
      const saved = kind === "page_images" ? {...photos.find((p) => p.id === result.data.id), ...result.data} : result.data;
      content[kind] = content[kind].some((r) => r.id === saved.id) ? content[kind].map((r) => r.id === saved.id ? saved : r) : [saved, ...content[kind]];
      dirty = false;
      if (kind === "orders") await loadCatalog();
      edit(saved); msg(kind === "orders" ? "Pedido actualizado. Inventario sincronizado." : kind === "page_images" || values.status === "Publicado" ? "Guardado y publicado en la web." : "Guardado. Este contenido queda fuera de la web pública.");
    } catch (error) {
      // Preserve uploaded files on an ambiguous network failure: the save may have committed.
      if (uploaded?.url) field("image_url").value = uploaded.url;
      msg(error.code === "23505" ? "Ese enlace o referencia ya está en uso. Elige otro." : error.message || "No se pudo guardar. Conservamos tus cambios.", true);
    } finally { busy = false; lock(false); }
  }
  async function loadCatalog() {
    const keys = ["events", "products", "ticket_types", "page_images"];
    const results = await Promise.all(keys.map((key) => client.from(key).select("*").order(key === "page_images" ? "id" : key === "events" ? "date" : "created_at", {ascending: false})));
    results.forEach((result, i) => { if (result.error) throw new Error(`No se pudo cargar ${kinds[keys[i]][0]}: ${result.error.message}`); });
    results.forEach((result, i) => { content[keys[i]] = result.data; });
    content.page_images = photos.map((photo) => ({...photo, ...content.page_images.find((r) => r.id === photo.id)}));
  }
  async function loadOrders(append = false) {
    const offset = append ? content.orders.length : 0;
    const result = await client.from("orders").select("*").order("created_at", {ascending: false}).range(offset, offset + 99);
    if (result.error) throw result.error;
    moreOrders = result.data.length === 100; content.orders = append ? [...content.orders, ...result.data] : result.data;
  }
  $("#refresh-records").addEventListener("click", async () => {
    if (!leave()) return; busy = true; lock(true); msg("Actualizando…");
    try { await Promise.all([loadCatalog(), loadOrders()]); const selected = content[kind].find((r) => r.id === editing?.id); edit(selected || (["page_images", "orders"].includes(kind) ? content[kind][0] : null)); msg("Listado actualizado."); }
    catch (error) { msg(error.message, true); } finally { busy = false; lock(false); }
  });
  $("#load-more").addEventListener("click", async () => { $("#load-more").disabled = true; try { await loadOrders(true); render(); } catch (e) { msg(e.message,true); } finally { $("#load-more").disabled = false; } });
  form.addEventListener("submit", (e) => { e.preventDefault(); save(); });
  $("#archive-record").addEventListener("click", () => { if (!busy) { field("status").value = "Archivado"; dirty = true; save(); } });
  $("#new-record").addEventListener("click", () => { if (leave()) { edit(); field("title")?.focus(); } });
  document.querySelectorAll("[data-kind]").forEach((b) => b.addEventListener("click", () => switchKind(b.dataset.kind)));
  $("#record-search").addEventListener("input", render); $("#record-filter").addEventListener("change", render);
  async function handleSession(next) {
    session = next; $("#sign-out").hidden = !next;
    if (!next) { loadedUser = null; sessionGeneration++; $("#manager-workspace").hidden = true; $("#auth-form").hidden = false; status("#connection-status", "Inicia sesión para abrir el gestor."); return; }
    if (loadedUser === next.user.id) return;
    const generation = ++sessionGeneration; $("#auth-form").hidden = true; status("#auth-status", "Comprobando acceso…");
    try {
      const membership = await client.from("site_admins").select("user_id").eq("user_id", next.user.id).maybeSingle();
      if (membership.error) throw membership.error;
      if (!membership.data) throw new Error("Esta cuenta aún no tiene acceso de administrador. El propietario debe autorizarla.");
      await Promise.all([loadCatalog(), loadOrders()]); if (generation !== sessionGeneration) return;
      loadedUser = next.user.id; $("#manager-workspace").hidden = false; $("#auth-panel").classList.add("is-connected");
      $("#auth-title").textContent = "Sesión administradora activa"; $("#auth-copy").textContent = "Tu contenido se guarda en la web.";
      status("#auth-status", next.user.email || "Cuenta autorizada"); status("#connection-status", "Conectado · Los cambios publicados se reflejan al guardar."); switchKind(kind);
    } catch (e) { if (generation === sessionGeneration) { status("#connection-status", "No se pudo abrir el gestor.", true); status("#auth-status", e.message, true); } }
  }
  $("#auth-form").addEventListener("submit", async (e) => {
    e.preventDefault(); if (!client) return; $("#auth-submit").disabled = true; status("#auth-status", "Enviando enlace…");
    try { const result = await client.auth.signInWithOtp({email: $("#auth-email").value.trim(), options: {shouldCreateUser: false, emailRedirectTo: new URL("/admin/index.html",location.origin).href}}); if (result.error) throw result.error; status("#auth-status", "Revisa tu correo. El enlace abre el gestor."); }
    catch (error) { status("#auth-status", error.message, true); } finally { $("#auth-submit").disabled = false; }
  });
  $("#sign-out").addEventListener("click", async () => { if (!leave()) return; const result = await client.auth.signOut(); if (result.error) status("#auth-status", result.error.message, true); });
  if (!client) { status("#connection-status", "Falta la configuración del gestor.", true); return; }
  client.auth.onAuthStateChange((_event, next) => window.setTimeout(() => handleSession(next), 0));
  client.auth.getSession().then(({data, error}) => error ? status("#connection-status", error.message, true) : handleSession(data.session));
})();
