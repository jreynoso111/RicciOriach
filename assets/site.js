(async () => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  const intro = $("#cinema");
  const shell = $(".site-shell");
  const menu = $("#main-nav");
  const menuToggle = $(".menu-toggle");
  const mediaModal = $("#media-modal");
  const mediaModalClose = mediaModal?.querySelector?.(".modal-close");
  const eventModal = $("#event-modal");
  const eventModalClose = $("#event-modal-close");
  const siteHeader = $(".site-header");
  const updateHeader = () =>
    siteHeader?.classList.toggle("is-scrolled", window.scrollY > 20);
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
  let introTimer;
  let exitTimer;
  let introReturnFocus;
  let mediaReturnFocus;
  let eventReturnFocus;

  const safeUrl = (value, image = false) => {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      const url = new URL(value, location.href);
      if (url.protocol === "https:" || url.origin === location.origin)
        return url.href;
      // Existing local editor supports uploaded image data. SVG is intentionally excluded.
      if (image && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(value))
        return value;
    } catch {
      /* Ignore malformed editor values. */
    }
    return "";
  };

  function syncScrollLock() {
    document.body.classList.toggle(
      "locked",
      Boolean(
        intro?.open ||
          mediaModal?.open ||
          eventModal?.open ||
          menuToggle?.getAttribute("aria-expanded") === "true",
      ),
    );
  }

  function toggleMenu(open, returnFocus = false) {
    if (!menu || !menuToggle) return;
    menu.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    syncScrollLock();
    if (returnFocus) menuToggle.focus({ preventScroll: true });
  }

  menuToggle?.addEventListener("click", () =>
    toggleMenu(menuToggle.getAttribute("aria-expanded") !== "true"),
  );
  menu?.addEventListener("click", (event) => {
    if (event.target.closest("a")) toggleMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menuToggle?.getAttribute("aria-expanded") === "true"
    )
      toggleMenu(false, true);
  });
  window
    .matchMedia("(min-width: 781px)")
    .addEventListener("change", (event) => {
      if (event.matches) toggleMenu(false);
    });

  function closeIntro(immediate = false) {
    if (!intro?.open) return;
    window.clearTimeout(introTimer);
    window.clearTimeout(exitTimer);
    try {
      sessionStorage.setItem("riccie-cinema-v2", "1");
    } catch {
      /* Optional preference. */
    }
    const finish = () => {
      intro.close();
      intro.classList.remove("is-closing");
      if (shell) shell.inert = false;
      syncScrollLock();
      introReturnFocus?.focus({ preventScroll: true });
    };
    if (immediate || motionPreference.matches) finish();
    else {
      intro.classList.add("is-closing");
      exitTimer = window.setTimeout(finish, 760);
    }
  }

  function openIntro(replay = false) {
    document.documentElement.classList.remove("intro-pending");
    if (!intro || typeof intro.showModal !== "function") return;
    let seen = false;
    try {
      seen = sessionStorage.getItem("riccie-cinema-v2") === "1";
    } catch {
      /* No storage required. */
    }
    if (!replay && (seen || motionPreference.matches || location.hash || new URLSearchParams(location.search).has("photo-preview"))) return;
    introReturnFocus = replay ? $("[data-replay-intro]") : null;
    intro.classList.toggle("cinema-reduced", motionPreference.matches);
    intro.showModal();
    if (shell) shell.inert = true;
    syncScrollLock();
    $("[data-skip-intro]")?.focus({ preventScroll: true });
    introTimer = window.setTimeout(
      () => closeIntro(),
      motionPreference.matches ? 1500 : 4600,
    );
  }

  $("[data-skip-intro]")?.addEventListener("click", () => closeIntro());
  $("[data-replay-intro]")?.addEventListener("click", () => openIntro(true));
  intro?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeIntro(true);
  });
  motionPreference.addEventListener("change", (event) => {
    if (event.matches) {
      closeIntro(true);
      document.documentElement.classList.remove("motion-ready");
    }
  });
  // Open before optional page features. No video, font, network, or image can block entry.
  openIntro();

  function closeVideo() {
    if (mediaModal?.open) mediaModal.close();
  }

  document.querySelectorAll("[data-video]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      if (!mediaModal || typeof mediaModal.showModal !== "function") return;
      const id = link.dataset.video;
      if (!/^[\w-]{11}$/.test(id)) return;
      event.preventDefault();
      mediaReturnFocus = link;
      $("#media-title").textContent =
        link.dataset.videoTitle || "Riccie Oriach · Video";
      $("#video-external").href = `https://www.youtube.com/watch?v=${id}`;
      const frame = document.createElement("iframe");
      frame.title = link.dataset.videoTitle || "Video de Riccie Oriach";
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      $("#video-player").replaceChildren(frame);
      mediaModal.showModal();
      syncScrollLock();
      mediaModalClose?.focus({ preventScroll: true });
    });
  });
  mediaModalClose?.addEventListener("click", closeVideo);
  mediaModal?.addEventListener("click", (event) => {
    if (event.target !== mediaModal) return;
    const box = mediaModal.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      closeVideo();
  });
  mediaModal?.addEventListener("close", () => {
    $("#video-player").replaceChildren();
    syncScrollLock();
    mediaReturnFocus?.focus({ preventScroll: true });
  });

  function closeEventModal() {
    if (eventModal?.open) eventModal.close();
  }

  function openEventModal(event, trigger) {
    if (!eventModal || typeof eventModal.showModal !== "function") return;
    const date = new Date(`${event.date}T12:00:00`);
    const ticketUrl = safeUrl(event.ticketUrl);
    const status = event.ticketStatus || "available";
    const statusLabels = {
      available: "Boletas disponibles",
      free: "Entrada libre",
      soldout: "Entradas agotadas",
      cancelled: "Cancelado",
      postponed: "Pospuesto",
    };
    const dateLabel = Number.isNaN(date.getTime())
      ? event.date || "Fecha por confirmar"
      : date.toLocaleDateString("es", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
    $("#event-modal-title").textContent = event.title || "Presentación";
    $("#event-modal-date").textContent = dateLabel;
    $("#event-modal-status").textContent =
      statusLabels[status] || "Presentación";
    $("#event-modal-location").textContent = [
      event.city,
      event.venue,
      event.time,
    ]
      .filter(Boolean)
      .join(" · ");
    $("#event-modal-description").textContent =
      event.description ||
      "Pronto compartiremos más detalles de esta presentación.";
    const tickets = $("#event-modal-tickets");
    if (tickets) {
      tickets.hidden = !ticketUrl;
      tickets.href = ticketUrl || "contact.html";
    }
    const contact = $("#event-modal-contact");
    if (contact)
      contact.textContent = ticketUrl
        ? "¿Necesitas más información? Hablemos ↗"
        : "Consulta disponibilidad y detalles ↗";
    window.RiccieCommerce?.showTickets(event);
    const poster = $("#event-modal-image");
    if (poster) { poster.hidden = !safeUrl(event.image_url, true); if (!poster.hidden) { poster.src = safeUrl(event.image_url, true); poster.alt = event.title; } }
    eventReturnFocus = trigger;
    eventModal.showModal();
    syncScrollLock();
    eventModalClose?.focus({ preventScroll: true });
  }

  eventModalClose?.addEventListener("click", closeEventModal);
  eventModal?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeEventModal();
  });
  eventModal?.addEventListener("click", (event) => {
    const box = eventModal.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      closeEventModal();
  });
  eventModal?.addEventListener("close", () => {
    syncScrollLock();
    eventReturnFocus?.focus({ preventScroll: true });
    eventReturnFocus = null;
  });

  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = new Date().getFullYear();
  });

  const mapEvent = (row) => ({
    ...row,
    ticketStatus: row.ticket_status ?? row.ticketStatus ?? "available",
    ticketUrl: row.ticket_url ?? row.ticketUrl ?? "",
  });
  const validContent = (value) =>
    value && Array.isArray(value.events);
  const readPublishedFile = async () => {
    const response = await fetch("content/published.json", {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Content unavailable");
    const value = await response.json();
    if (!validContent(value)) throw new Error("Invalid content");
    return value;
  };
  const readPublishedCloud = async () => {
    const client = window.riccieSupabase;
    if (!client) throw new Error("Supabase is not configured");
    const eventsResult = await client
      .from("events")
      .select("*")
      .eq("status", "Publicado")
      .order("date", { ascending: true });
    if (eventsResult.error) throw eventsResult.error;
    return {
      events: (eventsResult.data || []).map(mapEvent),
    };
  };
  let content = { events: [] };
  let contentLoaded = false;
  try {
    content = window.riccieSupabase
      ? await readPublishedCloud()
      : await readPublishedFile();
    contentLoaded = true;
  } catch {
    try {
      // Keep the published snapshot as a resilient fallback during an API outage.
      content = await readPublishedFile();
      contentLoaded = true;
    } catch {
      content = { events: [] };
      const message = $("#event-count");
      if (message)
        message.textContent =
          "No pudimos cargar la agenda. Vuelve a intentarlo en unos minutos.";
    }
  }
  const eventsRoot = $("#event-list");
  if (eventsRoot) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const events = (Array.isArray(content.events) ? content.events : []).filter(
      (event) => {
        if (
          !event ||
          event.status !== "Publicado" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(event.date)
        )
          return false;
        const date = new Date(`${event.date}T12:00:00`);
        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === event.date
        );
      },
    );
    const citySelect = $("#event-city");
    [...new Set(events.map((event) => event.city).filter(Boolean))]
      .sort()
      .forEach((city) => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        citySelect?.append(option);
      });
    let period = "upcoming";
    function renderEvents() {
      const past = period === "past";
      const selected = events
        .filter(
          (event) =>
            (past ? event.date < today : event.date >= today) &&
            (!citySelect?.value || event.city === citySelect.value),
        )
        .sort((a, b) =>
          past ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
        );
      eventsRoot.replaceChildren();
      selected.forEach((event) => {
        const date = new Date(`${event.date}T12:00:00`);
        const row = document.createElement("article");
        row.className = "event-row";
        const when = document.createElement("time");
        when.className = "event-date";
        when.dateTime = event.date;
        when.textContent = String(date.getDate()).padStart(2, "0");
        const month = document.createElement("small");
        month.textContent = date
          .toLocaleDateString("es", { month: "short", year: "numeric" })
          .toUpperCase();
        when.append(month);
        const info = document.createElement("div");
        info.className = "event-info";
        const title = document.createElement("h3");
        title.textContent = event.title;
        const place = document.createElement("p");
        place.textContent = [event.city, event.venue, event.time]
          .filter(Boolean)
          .join(" · ");
        const description = document.createElement("p");
        description.textContent = event.description || "";
        info.append(title, place, description);
        const state = event.ticketStatus || "available";
        const inactive =
          past || ["soldout", "cancelled", "postponed"].includes(state);
        const action = document.createElement(inactive ? "span" : "button");
        if (inactive) {
          action.className = "event-status";
          action.textContent =
            {
              cancelled: "Cancelado",
              postponed: "Pospuesto",
              soldout: "Entradas agotadas",
            }[state] || "Así lo vivimos";
        } else {
          action.type = "button";
          action.className = "button button-outline";
          action.textContent =
            state === "free" ? "Entrada libre" : "Consultar detalles ↗";
          action.addEventListener("click", () => openEventModal(event, action));
        }
        row.append(when, info, action);
        eventsRoot.append(row);
      });
      $("#events-empty").hidden = selected.length > 0;
      if ($("#event-count") && contentLoaded)
        $("#event-count").textContent =
          `${selected.length} ${selected.length === 1 ? "presentación" : "presentaciones"}${past ? " en el archivo" : " por venir"}`;
      if ($("#events-empty-title"))
        $("#events-empty-title").textContent = citySelect?.value
          ? "Todavía no hay fechas en esta ciudad."
          : past
            ? "Cada coro deja una historia."
            : "La próxima parada se está cocinando.";
      if ($("#events-empty-copy"))
        $("#events-empty-copy").textContent = past
          ? "Aquí reuniremos las presentaciones pasadas de Riccie. El archivo se irá llenando de encuentros."
          : "Las fechas confirmadas aparecerán aquí. Sigue los anuncios oficiales de Riccie para conocer la próxima parada.";
    }
    document.querySelectorAll("[data-period]").forEach((button) =>
      button.addEventListener("click", () => {
        period = button.dataset.period;
        document
          .querySelectorAll("[data-period]")
          .forEach((item) =>
            item.setAttribute("aria-pressed", String(item === button)),
          );
        renderEvents();
      }),
    );
    citySelect?.addEventListener("change", renderEvents);
    renderEvents();
  }

  window.RicciePhotos?.apply();

  // Stored images can disappear or be malformed. Keep the layout and alt text intact.
  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", () => {
      if (image.dataset.fallback || image.dataset.photoSlot) return;
      image.dataset.fallback = "true";
      image.src = "assets/images/mi-derriengue.jpg";
    });
  });

  if ("IntersectionObserver" in window && !motionPreference.matches) {
    document.documentElement.classList.add("motion-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08 },
    );
    document
      .querySelectorAll(".reveal")
      .forEach((element) => observer.observe(element));
  }
})();
