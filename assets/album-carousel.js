/* All releases remain real links; only the visual sequence is duplicated. */
(() => {
  "use strict";
  document.querySelectorAll("[data-album-carousel]").forEach((carousel) => {
    const viewport = carousel.querySelector(".album-viewport");
    const track = carousel.querySelector(".album-track");
    const group = carousel.querySelector(".album-group");
    const controls = carousel.querySelector(".carousel-controls");
    const toggle = carousel.querySelector("[data-carousel-toggle]");
    if (!track?.animate || !group?.children.length) return;

    const copy = group.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    copy.querySelectorAll("a").forEach((link) => link.tabIndex = -1);
    track.append(copy);
    carousel.classList.add("carousel-ready");
    controls.hidden = false;
    const duration = group.children.length * 12000;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const animation = track.animate([
      { transform: "translateX(0)" }, { transform: "translateX(-50%)" },
    ], { duration, iterations: Infinity, easing: "linear" });
    let paused = motion.matches;
    let hovered = false;
    let focused = false;
    let visible = true;
    function sync() {
      if (paused || hovered || focused || !visible || document.hidden) animation.pause();
      else animation.play();
      toggle.textContent = paused ? "Reproducir" : "Pausar";
      toggle.setAttribute("aria-label", paused ? "Reproducir carrusel de álbumes" : "Pausar carrusel de álbumes");
      toggle.setAttribute("aria-pressed", String(paused));
    }
    toggle.addEventListener("click", () => { paused = !paused; sync(); });
    viewport.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse") { hovered = true; sync(); } });
    viewport.addEventListener("pointerleave", () => { hovered = false; sync(); });
    group.addEventListener("focusin", (event) => {
      focused = true;
      // Bring keyboard-focused original links fully into view, even mid-cycle.
      const link = event.target.closest(".album-card");
      const index = [...group.children].indexOf(link);
      if (index >= 0) animation.currentTime = index * duration / group.children.length;
      viewport.scrollLeft = 0;
      sync();
    });
    group.addEventListener("focusout", (event) => { if (!group.contains(event.relatedTarget)) { focused = false; sync(); } });
    carousel.querySelectorAll("[data-carousel-step]").forEach((button) => button.addEventListener("click", () => {
      paused = true;
      const step = Number(button.dataset.carouselStep) * duration / group.children.length;
      animation.currentTime = ((animation.currentTime + step) % duration + duration) % duration;
      sync();
    }));
    motion.addEventListener("change", () => { paused = motion.matches; sync(); });
    document.addEventListener("visibilitychange", sync);
    if ("IntersectionObserver" in window) new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(carousel);
    sync();
  });
})();
