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
        [item.title, item.city, item.venue]
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
      button.append(state, title, detail);
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
