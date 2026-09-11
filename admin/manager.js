(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const form = $("#editor-form");
  let content = { events: [], posts: [] },
    revision,
    kind = "events",
    editing = null,
    dirty = false,
    saving = false;
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
    const next = structuredClone(content);
    const index = next[kind].findIndex((entry) => entry.id === item.id);
    if (index < 0) next[kind].push(item);
    else next[kind][index] = item;
    saving = true;
    $("#save-record").disabled = true;
    $("#archive-record").disabled = true;
    message("Guardando…");
    try {
      const response = await fetch("/api/manage/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: next, revision }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      content = result.content;
      revision = result.revision;
      dirty = false;
      edit(item);
      message(
        item.status === "Publicado"
          ? "Guardado y visible en la web local. La publicación en internet requiere desplegar los cambios."
          : "Guardado. Este contenido no aparece en la web pública.",
      );
    } catch (error) {
      message(
        error.message ||
          "No se pudo conectar. El formulario conserva tus cambios.",
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
  async function boot() {
    try {
      const response = await fetch("/api/manage/content", {
        cache: "no-store",
      });
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/json")
      )
        throw new Error();
      const result = await response.json();
      content = result.content;
      revision = result.revision;
      $("#connection-status").textContent =
        "Gestión local · Los cambios se guardan en esta Mac. Solo el contenido publicado se incluye en la web. El acceso desde otros dispositivos está pendiente de conexión.";
      $("#manager-workspace").hidden = false;
      edit();
    } catch {
      $("#connection-status").textContent =
        "El gestor remoto todavía no está conectado. En esta Mac, inicia el gestor local para editar el contenido. La web pública sigue disponible.";
    }
  }
  boot();
})();
