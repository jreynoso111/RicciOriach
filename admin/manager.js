(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const form = $("#editor-form");
  const supabase = window.riccieSupabase;
  const authPanel = $("#auth-panel");
  const authForm = $("#auth-form");
  const authEmail = $("#auth-email");
  const authSubmit = $("#auth-submit");
  const authStatus = $("#auth-status");
  const signOut = $("#sign-out");
  const workspace = $("#manager-workspace");
  let content = { events: [], posts: [] },
    kind = "events",
    editing = null,
    dirty = false,
    saving = false,
    activeSession = null;
  const field = (name) => form.elements.namedItem(name);
  const imageFile = $("#image-file");
  const imagePreviewCard = $("#image-preview-card");
  const imagePreview = $("#image-preview");
  const imageStatus = $("#image-status");
  const clearImage = $("#clear-image");
  const MAX_IMAGE_BYTES = 900_000;
  const MAX_IMAGE_SIDE = 1800;
  const kindCopy = {
    events: {
      label: "Presentaciones",
      copy: "Añade la fecha, el lugar y la información que necesita la gente para encontrarte.",
    },
    posts: {
      label: "Bitácora",
      copy: "Escribe una historia breve, elige una foto y publícala cuando esté lista.",
    },
  };
  const mapEvent = (row) => ({
    ...row,
    ticketStatus: row.ticket_status ?? "available",
    ticketUrl: row.ticket_url ?? "",
  });
  const mapPost = (row) => ({
    ...row,
    image: row.image_url ?? "",
  });
  const toEventRow = (item) => ({
    id: item.id,
    title: item.title,
    date: item.date,
    status: item.status,
    city: item.city,
    venue: item.venue,
    time: item.time || "",
    ticket_status: item.ticketStatus || "available",
    ticket_url: item.ticketUrl || "",
    description: item.description || "",
  });
  const toPostRow = (item, imageUrl) => ({
    id: item.id,
    title: item.title,
    date: item.date,
    status: item.status,
    slug: item.slug,
    category: item.category || "",
    author: item.author || "",
    image_url: imageUrl || "",
    excerpt: item.excerpt || "",
    content: item.content || "",
    link: item.link || "",
  });
  const setAuthStatus = (text, error = false) => {
    if (!authStatus) return;
    authStatus.textContent = text;
    authStatus.classList.toggle("is-error", error);
  };
  const setConnection = (text, error = false) => {
    const status = $("#connection-status");
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("is-error", error);
  };
  const adminRedirect = () => new URL("index.html", document.baseURI).href;
  const isDataImage = (value) =>
    typeof value === "string" && /^data:image\/(?:jpeg|png|webp);base64,/i.test(value);
  const dataUrlToBlob = async (value) => {
    const response = await fetch(value);
    return response.blob();
  };
  async function uploadImage(value) {
    if (typeof value === "string" && value.toLowerCase().startsWith("data:image/")) {
      if (!isDataImage(value))
        throw new Error("La foto debe ser JPG, PNG o WebP.");
    }
    if (!isDataImage(value)) return value || "";
    if (!supabase) throw new Error("Supabase no está disponible.");
    const path = `posts/${crypto.randomUUID()}.jpg`;
    const blob = await dataUrlToBlob(value);
    const result = await supabase.storage.from("site-media").upload(path, blob, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: false,
    });
    if (result.error) throw result.error;
    const publicFile = supabase.storage.from("site-media").getPublicUrl(path);
    return publicFile.data.publicUrl;
  }
  const imageSource = (value) => {
    if (typeof value !== "string" || !value.trim()) return "";
    if (/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/]+=*$/i.test(value))
      return value;
    try {
      const url = new URL(value, location.href);
      if (url.protocol === "https:") return url.href;
    } catch {
      /* Ignore malformed image values. */
    }
    return "";
  };
  const updateImageStatus = (text, error = false) => {
    if (!imageStatus) return;
    imageStatus.textContent = text;
    imageStatus.classList.toggle("is-error", error);
  };
  const syncImageValidity = () => {
    const input = field("image");
    if (!input) return;
    input.setCustomValidity(
      input.value && !imageSource(input.value)
        ? "Escribe una URL HTTPS válida o sube una foto."
        : "",
    );
  };
  const updateImagePreview = (value = field("image")?.value || "") => {
    if (!imagePreviewCard || !imagePreview) return;
    const source = imageSource(value);
    if (!source) {
      imagePreview.removeAttribute("src");
      imagePreview.alt = "";
      imagePreviewCard.hidden = true;
      if (clearImage) clearImage.hidden = true;
      return;
    }
    imagePreview.src = source;
    imagePreview.alt = `Vista previa de ${field("title")?.value || "la historia"}`;
    imagePreviewCard.hidden = false;
    if (clearImage) clearImage.hidden = false;
  };
  const updateKindHelp = () => {
    const copy = kindCopy[kind];
    $("#kind-help-label").textContent = copy.label;
    $("#kind-help-copy").textContent = copy.copy;
  };
  async function fileToImageData(file) {
    if (!/^image\/(?:jpeg|png|webp)$/i.test(file.type))
      throw new Error("Elige una foto JPG, PNG o WebP.");
    if (file.size > 8_000_000)
      throw new Error("La foto supera 8 MB. Elige una más ligera.");
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const preview = new Image();
        preview.onload = () => resolve(preview);
        preview.onerror = () => reject(new Error("No se pudo leer la foto."));
        preview.src = objectUrl;
      });
      const scale = Math.min(
        1,
        MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas
        .getContext("2d")
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      let blob;
      for (const quality of [0.82, 0.68, 0.54]) {
        blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality),
        );
        if (blob && blob.size <= MAX_IMAGE_BYTES) break;
      }
      if (!blob || blob.size > MAX_IMAGE_BYTES)
        throw new Error(
          "La foto sigue siendo muy pesada. Elige otra más ligera.",
        );
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () =>
          reject(new Error("No se pudo preparar la foto."));
        reader.readAsDataURL(blob);
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
  const message = (text) => {
    $("#save-status").textContent = text;
  };
  const canLeave = () =>
    !dirty || window.confirm("Hay cambios sin guardar. ¿Quieres descartarlos?");
  window.addEventListener("beforeunload", (event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  form.addEventListener("input", () => {
    dirty = true;
    message("Cambios sin guardar.");
  });
  form.addEventListener("change", () => {
    dirty = true;
  });
  function stats() {
    $("#count-events").textContent = content.events.filter(
      (item) => item.status === "Publicado",
    ).length;
    $("#count-posts").textContent = content.posts.filter(
      (item) => item.status === "Publicado",
    ).length;
    $("#count-drafts").textContent = [
      ...content.events,
      ...content.posts,
    ].filter((item) => item.status === "Borrador").length;
  }
  function render() {
    const root = $("#records");
    root.replaceChildren();
    const query = $("#record-search").value.toLocaleLowerCase("es");
    const records = content[kind]
      .filter((item) =>
        [
          item.title,
          item.city,
          item.venue,
          item.category,
          item.author,
          item.excerpt,
        ]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(query),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!records.length) {
      const empty = document.createElement("p");
      empty.className = "records-empty";
      empty.textContent = query
        ? "No hay resultados para esta búsqueda."
        : "Todavía no hay contenido guardado. Empieza con un borrador y publícalo cuando esté listo.";
      root.append(empty);
    }
    records.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "record";
      button.setAttribute("aria-current", String(item.id === editing));
      const state = document.createElement("span");
      state.className = "record-status";
      state.textContent = item.status;
      const title = document.createElement("strong");
      title.textContent = item.title;
      const detail = document.createElement("small");
      detail.textContent = [item.date, item.city, item.venue]
        .filter(Boolean)
        .join(" · ");
      const copy = document.createElement("span");
      copy.className = "record-copy";
      copy.append(state, title, detail);
      const source = kind === "posts" ? imageSource(item.image) : "";
      if (source) {
        button.classList.add("record-has-image");
        const thumb = document.createElement("img");
        thumb.className = "record-thumb";
        thumb.src = source;
        thumb.alt = "";
        thumb.loading = "lazy";
        button.append(thumb, copy);
      } else button.append(copy);
      button.addEventListener("click", () => {
        if (!saving && canLeave()) edit(item);
      });
      root.append(button);
    });
    stats();
  }
  function edit(item = null) {
    form.reset();
    editing = item?.id || null;
    dirty = false;
    $("#event-fields").hidden = kind !== "events";
    $("#event-fields").disabled = kind !== "events";
    $("#post-fields").hidden = kind !== "posts";
    $("#post-fields").disabled = kind !== "posts";
    if (item)
      Object.entries(item).forEach(([key, value]) => {
        const input = field(key);
        if (input) input.value = value;
      });
    if (imageFile) imageFile.value = "";
    syncImageValidity();
    updateImagePreview();
    updateImageStatus(
      field("image")?.value
        ? "Foto lista. Puedes cambiarla o quitarla antes de guardar."
        : "JPG, PNG o WebP. La foto se ajusta automáticamente para cargarla rápido.",
    );
    updateKindHelp();
    $("#editor-title").textContent =
      `${item ? "Editar" : kind === "events" ? "Nueva" : "Nueva"} ${kind === "events" ? "presentación" : "historia"}`;
    $("#record-state").textContent = item?.status || "Borrador";
    $("#archive-record").hidden = !item || item.status === "Archivado";
    message("");
    render();
  }
  document.querySelectorAll("[data-kind]").forEach((button) =>
    button.addEventListener("click", () => {
      if (saving || !canLeave()) return;
      kind = button.dataset.kind;
      document
        .querySelectorAll("[data-kind]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      $("#new-record").textContent =
        kind === "events" ? "Nueva presentación +" : "Nueva historia +";
      $("#record-search").value = "";
      edit();
    }),
  );
  $("#record-search").addEventListener("input", render);
  $("#new-record").addEventListener("click", () => {
    if (!saving && canLeave()) {
      edit();
      field("title").focus();
    }
  });
  field("image")?.addEventListener("input", () => {
    if (imageFile) imageFile.value = "";
    syncImageValidity();
    updateImagePreview();
    updateImageStatus(
      field("image").value
        ? imageSource(field("image").value)
          ? "Vista previa actualizada desde la URL."
          : "Usa una URL HTTPS válida para mostrar la foto."
        : "JPG, PNG o WebP. La foto se ajusta automáticamente para cargarla rápido.",
      Boolean(field("image").value && !imageSource(field("image").value)),
    );
  });
  imageFile?.addEventListener("change", async () => {
    const file = imageFile.files?.[0];
    if (!file) return;
    updateImageStatus("Preparando la foto…");
    try {
      const value = await fileToImageData(file);
      field("image").value = value;
      syncImageValidity();
      dirty = true;
      updateImagePreview(value);
      updateImageStatus("Foto lista. Se guardará con esta historia.");
      message("Foto lista. Guarda los cambios para conservarla.");
    } catch (error) {
      imageFile.value = "";
      updateImageStatus(error.message, true);
      message("No se pudo preparar la foto.");
    }
  });
  clearImage?.addEventListener("click", () => {
    field("image").value = "";
    if (imageFile) imageFile.value = "";
    syncImageValidity();
    dirty = true;
    updateImagePreview();
    updateImageStatus("Foto quitada. Guarda los cambios para confirmar.");
    message("Foto quitada. Guarda los cambios para confirmar.");
  });
  async function save() {
    if (saving || !form.reportValidity()) return;
    const item = Object.fromEntries(new FormData(form));
    Object.keys(item).forEach((key) => {
      item[key] = item[key].trim();
    });
    item.id = editing || crypto.randomUUID();
    saving = true;
    $("#save-record").disabled = true;
    $("#archive-record").disabled = true;
    message("Guardando…");
    try {
      if (!activeSession || !supabase)
        throw new Error("Inicia sesión para guardar cambios.");
      const table = kind;
      let row;
      if (kind === "events") row = toEventRow(item);
      else row = toPostRow(item, await uploadImage(item.image));
      const query = editing
        ? supabase.from(table).update(row).eq("id", item.id).select("*").single()
        : supabase.from(table).insert(row).select("*").single();
      const result = await query;
      if (result.error) throw result.error;
      const saved = kind === "events" ? mapEvent(result.data) : mapPost(result.data);
      content[kind] = editing
        ? content[kind].map((entry) => (entry.id === saved.id ? saved : entry))
        : [...content[kind], saved];
      dirty = false;
      edit(saved);
      message(
        item.status === "Publicado"
          ? "Guardado y visible en la web pública."
          : "Guardado. Este contenido no aparece en la web pública.",
      );
    } catch (error) {
      message(
        error.message ||
          "No se pudo guardar. El formulario conserva tus cambios.",
      );
    } finally {
      saving = false;
      $("#save-record").disabled = false;
      $("#archive-record").disabled = false;
    }
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    save();
  });
  $("#archive-record").addEventListener("click", () => {
    field("status").value = "Archivado";
    dirty = true;
    save();
  });
  async function loadContent() {
    const [eventsResult, postsResult] = await Promise.all([
      supabase.from("events").select("*").order("date", { ascending: false }),
      supabase.from("posts").select("*").order("date", { ascending: false }),
    ]);
    if (eventsResult.error) throw eventsResult.error;
    if (postsResult.error) throw postsResult.error;
    content = {
      events: (eventsResult.data || []).map(mapEvent),
      posts: (postsResult.data || []).map(mapPost),
    };
  }
  async function handleSession(session) {
    activeSession = session || null;
    if (signOut) signOut.hidden = !activeSession;
    if (!activeSession) {
      workspace.hidden = true;
      authPanel.hidden = false;
      authForm.hidden = false;
      setAuthStatus("");
      setConnection("Inicia sesión para abrir el gestor.");
      return;
    }
    authForm.hidden = true;
    setAuthStatus("Comprobando permisos de esta cuenta…");
    const membership = await supabase
      .from("site_admins")
      .select("user_id")
      .eq("user_id", activeSession.user.id)
      .maybeSingle();
    if (membership.error) {
      workspace.hidden = true;
      setConnection("No se pudieron comprobar los permisos del gestor.", true);
      setAuthStatus(membership.error.message, true);
      return;
    }
    if (!membership.data) {
      workspace.hidden = true;
      setConnection("Esta cuenta está autenticada, pero aún no tiene acceso de administrador.", true);
      setAuthStatus("Pide al propietario del proyecto que añada esta cuenta a la lista de administradores.", true);
      return;
    }
    try {
      await loadContent();
      workspace.hidden = false;
      authPanel.hidden = false;
      $("#auth-title").textContent = "Sesión administradora activa.";
      setAuthStatus(activeSession.user.email || "Cuenta autorizada");
      setConnection("Conectado a Supabase · Los cambios se guardan y aparecen en la web pública al instante.");
      edit();
    } catch (error) {
      workspace.hidden = true;
      setConnection("Supabase está conectado, pero no se pudo leer el contenido.", true);
      setAuthStatus(error.message || "Vuelve a intentarlo en unos minutos.", true);
    }
  }
  authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabase || !authEmail?.value.trim()) return;
    authSubmit.disabled = true;
    setAuthStatus("Enviando el enlace…");
    const result = await supabase.auth.signInWithOtp({
      email: authEmail.value.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: adminRedirect() },
    });
    authSubmit.disabled = false;
    if (result.error) {
      setAuthStatus(result.error.message || "No se pudo enviar el enlace.", true);
      return;
    }
    setAuthStatus("Revisa tu correo. El enlace abre directamente el gestor.");
  });
  signOut?.addEventListener("click", async () => {
    await supabase?.auth.signOut();
  });
  async function boot() {
    if (!supabase) {
      setConnection("Falta la configuración de Supabase en esta web.", true);
      return;
    }
    supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => handleSession(session), 0);
    });
    const result = await supabase.auth.getSession();
    if (result.error) {
      setConnection("No se pudo iniciar Auth. Recarga la página para intentarlo de nuevo.", true);
      return;
    }
    await handleSession(result.data.session);
  }
  boot();
})();
