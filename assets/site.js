(() => {
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
  const siteHeader = $(".site-header");
  const updateHeader = () =>
    siteHeader?.classList.toggle("is-scrolled", window.scrollY > 20);
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
  let introTimer;
  let exitTimer;
  let introReturnFocus;
  let mediaReturnFocus;

  const readStorage = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : fallback;
    } catch {
      return fallback;
    }
  };

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

  const slugify = (value = "") =>
    String(value)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9ñáéíóúü\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  function syncScrollLock() {
    document.body.classList.toggle(
      "locked",
      Boolean(
        intro?.open ||
        mediaModal?.open ||
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
    if (!replay && (seen || motionPreference.matches || location.hash)) return;
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
      $(".modal-close").focus();
    });
  });
  $(".modal-close")?.addEventListener("click", closeVideo);
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

  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = new Date().getFullYear();
  });

  // Retain compatibility with existing editor data without inventing live events
  // or displaying drafts, demo schedules, or nonfunctional purchase controls.
  const eventsRoot = $("#event-list");
  if (eventsRoot) {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const events = readStorage("ricciEvents", [])
      .filter(
        (event) =>
          event &&
          event.status === "Activo" &&
          /^\d{4}-\d{2}-\d{2}$/.test(event.date) &&
          event.date >= todayKey,
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    events.forEach((event) => {
      const date = new Date(`${event.date}T12:00:00`);
      if (Number.isNaN(date.getTime())) return;
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
      title.textContent = event.title || "Riccie Oriach en vivo";
      const place = document.createElement("p");
      place.textContent = [event.city, event.venue].filter(Boolean).join(" · ");
      const description = document.createElement("p");
      description.textContent = event.description || "";
      info.append(title, place, description);
      const action = document.createElement("a");
      action.className = "button button-outline";
      const tickets = safeUrl(event.ticketUrl);
      action.href = tickets || "contact.html";
      action.textContent = tickets ? "Entradas ↗" : "Consultar detalles ↗";
      if (tickets) {
        action.target = "_blank";
        action.rel = "noopener noreferrer";
      }
      row.append(when, info, action);
      eventsRoot.append(row);
    });
    $("#events-empty").hidden = eventsRoot.childElementCount > 0;
  }

  const editorialPosts = [
    {
      slug: "pa-que-bailemos",
      title: "Un encuentro pa’ que bailemos.",
      category: "Música / Colaboraciones",
      date: "2025-12-05",
      image: "assets/images/pa-que-bailemos.jpg",
      author: "Bitácora musical",
      content:
        "Lena Dardelet y Riccie Oriach se encuentran en Pa’ que bailemos, un sencillo publicado el 5 de diciembre de 2025. El encuentro lleva sus dos voces a una invitación compartida: moverse con la música.\n\nEl videoclip, publicado en el canal oficial de Lena Dardelet, fue dirigido por Eric Alvarez. La dirección de fotografía estuvo a cargo de Raymi Guzman, con producción ejecutiva de Guerrero Filmworks.\n\nDale play y descubre este cruce de universos caribeños.",
      link: "https://www.youtube.com/watch?v=1S2t2gNuf8M",
    },
    {
      slug: "maquine",
      title: "Las muchas formas de Maquiné.",
      category: "Discografía / Álbum",
      date: "2021-05-28",
      image: "assets/images/maquine.jpg",
      author: "Bitácora musical",
      content:
        "Maquiné reúne ocho canciones y fue publicado el 28 de mayo de 2021. Del tema que le da nombre al disco a No me quieras tanto, el álbum abre distintas puertas al universo musical de Riccie.\n\nLa canción Maquiné fue producida por Munir Hossn, Riccie Oriach y Michael Olivera. Sus créditos reúnen percusión, guitarras, cuerdas, metales y voces: una muestra de las conversaciones musicales que atraviesan este trabajo.\n\nCaracolita, La Gomba y Yo propongo son otras paradas de este recorrido. Escucha el disco completo y consulta sus créditos en el Bandcamp del artista.",
      link: "https://riccieoriach.bandcamp.com/album/maquin",
    },
    {
      slug: "mi-derriengue",
      title: "Una isla dentro de Mi Derriengue.",
      category: "Discografía / EP",
      date: "2020-02-14",
      image: "assets/images/mi-derriengue.jpg",
      author: "Bitácora musical",
      content:
        "Publicado el 14 de febrero de 2020, Mi Derriengue conecta ritmos dominicanos con el espíritu abierto del proyecto de Riccie Oriach. Fue producido por Eduardo Cabra.\n\nEn este EP, el merengue, la salve y otras expresiones de la isla conversan con el rock, el hip-hop y la salsa. Su presentación oficial también destaca colaboraciones con Vicente García, Yenni Nuñez, Nicola Santiago y Mártires.\n\nEs un viaje entre el baile, el humor y las historias. Descubre sus canciones, letras y créditos en el Bandcamp de Riccie.",
      link: "https://riccieoriach.bandcamp.com/album/mi-derriengue",
    },
  ];
  const legacyDemoSlugs = new Set([
    "sesion-en-vivo-desde-santo-domingo",
    "gira-caribe-2024",
    "merch-drop-ritmo-solar",
  ]);
  const storedPosts = readStorage("public_blog_posts", [])
    .filter((post) => post && post.status === "Publicado")
    .map((post) => ({ ...post, slug: post.slug || slugify(post.title) }))
    .filter(
      (post) =>
        !legacyDemoSlugs.has(post.slug) &&
        !editorialPosts.some((entry) => entry.slug === post.slug),
    );

  const blogRoot = $("#blog-grid");
  if (blogRoot && storedPosts.length) {
    $("#published-journal").hidden = false;
    storedPosts.forEach((post) => {
      const article = document.createElement("article");
      article.className = "journal-card";
      const cover = document.createElement("img");
      cover.src =
        safeUrl(post.image, true) || "assets/images/mi-derriengue.jpg";
      cover.alt = String(post.title || "Historia de Riccie Oriach");
      cover.loading = "lazy";
      const category = document.createElement("p");
      category.className = "eyebrow";
      category.textContent = post.date || "Historias del camino";
      const title = document.createElement("h2");
      title.textContent = post.title || "Historia de Riccie Oriach";
      const excerpt = document.createElement("p");
      excerpt.textContent = post.excerpt || "";
      const anchor = document.createElement("a");
      anchor.className = "text-link";
      anchor.href = `blog-post.html?slug=${encodeURIComponent(post.slug)}`;
      anchor.textContent = "Seguir leyendo ↗";
      article.append(cover, category, title, excerpt, anchor);
      blogRoot.append(article);
    });
  }

  if ($("#journal-article")) {
    const slug = new URLSearchParams(location.search).get("slug");
    const post = [...editorialPosts, ...storedPosts].find(
      (entry) => entry.slug === slug,
    );
    if (!post) {
      $("#post-title").textContent = "Nos falta esa historia.";
      $("#post-not-found").hidden = false;
    } else {
      document.title = `${post.title} | Riccie Oriach`;
      $("#post-title").textContent = post.title;
      $("#post-category").textContent = post.category || "Historias del camino";
      $("#post-meta").textContent = [post.author || "Riccie Oriach", post.date]
        .filter(Boolean)
        .join(" · ");
      const canonical = document.querySelector('link[rel="canonical"]');
      canonical.href = `https://riccie-oriach.vercel.app/blog-post.html?slug=${encodeURIComponent(post.slug)}`;
      const imageUrl = safeUrl(post.image, true);
      if (imageUrl) {
        $("#post-cover").src = imageUrl;
        $("#post-cover").alt = post.title;
        $("#post-cover").hidden = false;
      }
      String(post.content || post.excerpt || "")
        .split(/\n\n+/)
        .filter(Boolean)
        .forEach((text) => {
          const paragraph = document.createElement("p");
          paragraph.textContent = text;
          $("#post-body").append(paragraph);
        });
      const source = safeUrl(post.link);
      if (source) {
        $("#post-source").href = source;
        $("#post-source").hidden = false;
      }
    }
  }

  // Stored images can disappear or be malformed. Keep the layout and alt text intact.
  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", () => {
      if (image.dataset.fallback) return;
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
