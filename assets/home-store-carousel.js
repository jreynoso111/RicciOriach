/* The homepage shows published products; local-only examples stay labelled. */
(() => {
  "use strict";

  const section = document.querySelector("[data-home-store-carousel]")?.closest(".home-store");
  const carousel = section?.querySelector("[data-home-store-carousel]");
  const group = carousel?.querySelector("[data-home-store-items]");
  const fallback = section?.querySelector("[data-home-store-fallback]");
  const previewNote = section?.querySelector("[data-home-store-preview]");
  const client = window.riccieSupabase;
  const content = window.RiccieContent;
  if (!section || !carousel || !group || !fallback || !content) return;

  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };

  function productCard(item) {
    const title = typeof item.title === "string" ? item.title : "Pieza de Riccie Oriach";
    const card = element("a", undefined, "home-store-card");
    card.href = "store.html#catalogo";
    card.setAttribute("aria-label", `Ver ${title} en la tienda`);

    const art = element("div", undefined, "home-store-art");
    const imageUrl = content.safeImage(item.image_url);
    if (imageUrl) {
      const image = element("img");
      image.src = imageUrl;
      image.alt = title;
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", () => {
        image.remove();
        art.append(element("span", "✳", "home-store-placeholder"));
      }, { once: true });
      art.append(image);
    } else {
      art.append(element("span", "✳", "home-store-placeholder"));
    }
    if (item.demo) art.append(element("span", "Muestra", "home-store-badge"));

    const copy = element("div", undefined, "home-store-copy");
    copy.append(element("p", [item.category, item.variant].filter(Boolean).join(" / "), "eyebrow"));
    copy.append(element("h3", title));
    copy.append(element("p", content.money(item.price, item.currency), "home-store-price"));
    card.append(art, copy);
    return card;
  }

  function startCarousel(items) {
    const products = items
      .filter((item) => item && item.status === "Publicado" && item.title)
      .slice(0, 12);
    if (!products.length) return;

    products.forEach((item) => group.append(productCard(item)));
    carousel.hidden = false;
    fallback.hidden = true;
    if (previewNote) previewNote.hidden = !products.some((item) => item.demo);

    const track = carousel.querySelector(".home-store-track");
    const controls = carousel.querySelector(".home-store-controls");
    const toggle = carousel.querySelector("[data-home-store-toggle]");
    if (!track?.animate || !controls || !toggle) return;

    const copy = group.cloneNode(true);
    copy.removeAttribute("data-home-store-items");
    copy.setAttribute("aria-hidden", "true");
    copy.querySelectorAll("a").forEach((link) => { link.tabIndex = -1; });
    track.append(copy);

    const duration = products.length * 11000;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animation = track.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }],
      { duration, iterations: Infinity, easing: "linear" },
    );
    let paused = motion.matches;
    let hovered = false;
    let focused = false;
    let visible = true;

    function sync() {
      if (paused || hovered || focused || !visible || document.hidden) animation.pause();
      else animation.play();
      toggle.textContent = paused ? "Reproducir" : "Pausar";
      toggle.setAttribute("aria-label", paused ? "Reproducir carrusel de tienda" : "Pausar carrusel de tienda");
      toggle.setAttribute("aria-pressed", String(paused));
    }

    carousel.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") { hovered = true; sync(); }
    });
    carousel.addEventListener("pointerleave", () => { hovered = false; sync(); });
    carousel.addEventListener("focusin", (event) => {
      focused = true;
      const card = event.target.closest(".home-store-card");
      if (card && group.contains(card)) {
        const index = [...group.children].indexOf(card);
        if (index >= 0) animation.currentTime = index * duration / products.length;
        carousel.querySelector(".home-store-viewport").scrollLeft = 0;
      }
      sync();
    });
    carousel.addEventListener("focusout", (event) => {
      if (!carousel.contains(event.relatedTarget)) { focused = false; sync(); }
    });
    toggle.addEventListener("click", () => { paused = !paused; sync(); });
    carousel.querySelectorAll("[data-home-store-step]").forEach((button) => {
      button.addEventListener("click", () => {
        const step = Number(button.dataset.homeStoreStep) * duration / products.length;
        animation.currentTime = ((animation.currentTime + step) % duration + duration) % duration;
        paused = true;
        sync();
      });
    });

    const updateMotionPreference = () => { paused = motion.matches; sync(); };
    if (motion.addEventListener) motion.addEventListener("change", updateMotionPreference);
    else motion.addListener(updateMotionPreference);
    document.addEventListener("visibilitychange", sync);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      }).observe(carousel);
    }

    carousel.classList.add("is-ready");
    controls.hidden = false;
    sync();
  }

  async function loadProducts() {
    if (Array.isArray(window.RicciePreview?.products)) {
      startCarousel(window.RicciePreview.products);
      return;
    }
    if (!client) return;
    const { data, error } = await client
      .from("products")
      .select("id,title,category,variant,price,currency,image_url,status,created_at")
      .eq("status", "Publicado")
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw error;
    startCarousel(Array.isArray(data) ? data : []);
  }

  loadProducts().catch(() => {
    // Keep the compact store link visible when the live catalog is unavailable.
  });
})();
