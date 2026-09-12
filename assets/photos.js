(() => {
  "use strict";
  const { photos, safeImage } = window.RiccieContent;
  let saved = [];
  const previewSlot = new URLSearchParams(location.search).get("photo-preview");
  const previewing = window.parent !== window && photos.some((p) => p.id === previewSlot);
  function apply(overrides = null) {
    document.querySelectorAll("[data-photo-slot]").forEach((image) => {
      const defaults = photos.find((p) => p.id === image.dataset.photoSlot);
      if (!defaults) return;
      const item = overrides?.id === defaults.id ? {...defaults, ...overrides} : {...defaults, ...saved.find((p) => p.id === defaults.id)};
      const source = safeImage(item.image_url, previewing) || safeImage(defaults.default_url);
      if (source && image.src !== source) image.src = source;
      if (item.image_url && item.alt && image.alt !== "") image.alt = item.alt;
      image.style.objectPosition = `${Math.max(0,Math.min(100,Number(item.focal_x)))}% ${Math.max(0,Math.min(100,Number(item.focal_y)))}%`;
      if (!image.dataset.photoFallback) {
        image.dataset.photoFallback = "bound";
        image.addEventListener("error", () => { if (image.src !== safeImage(defaults.default_url)) image.src = safeImage(defaults.default_url); });
      }
    });
  }
  window.RicciePhotos = {apply};
  if (previewing) {
    window.addEventListener("message", (event) => {
      if (event.origin !== location.origin || event.source !== parent || event.data?.type !== "riccie-photo-preview" || event.data.id !== previewSlot) return;
      apply(event.data);
      const image = document.querySelector(`[data-photo-slot="${previewSlot}"]`);
      image?.scrollIntoView({block: "center", behavior: "instant"});
    });
  }
  if (window.riccieSupabase) window.riccieSupabase.from("page_images").select("*").then(({data,error}) => { if (!error) { saved = data || []; apply(); } });
})();
