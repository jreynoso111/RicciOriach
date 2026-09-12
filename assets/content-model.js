/* Shared names, photo defaults and safe formatting for the public site and manager. */
(() => {
  "use strict";
  const photos = [
    ["home-hero", "Inicio · foto principal", "index.html", "riccie-portrait.jpg", "hero", 50, 27],
    ["home-universe", "Inicio · el artista", "index.html#universo", "riccie-bandcamp.jpg", "universe", 50, 50],
    ["intro-one", "Intro · primera foto", "index.html", "riccie-portrait.jpg", "cinema", 50, 50],
    ["intro-two", "Intro · segunda foto", "index.html", "riccie-bandcamp.jpg", "cinema", 50, 50],
    ["intro-three", "Intro · tercera foto", "index.html", "riccie-portrait.jpg", "cinema", 50, 50],
    ["music-feature", "Música · lanzamiento destacado", "music.html", "pa-que-bailemos.jpg", "cover", 50, 50],
    ["events-hero", "En vivo · foto principal", "events.html", "riccie-portrait.jpg", "live", 50, 50],
    ["contact-photo", "Contacto · retrato", "contact.html", "riccie-portrait.jpg", "contact", 50, 50],
    ["journal-pa-que-bailemos", "Bitácora · Pa’ que bailemos", "blog.html", "pa-que-bailemos.jpg", "cover", 50, 50],
    ["journal-maquine", "Bitácora · Maquiné", "blog.html", "maquine.jpg", "cover", 50, 50],
    ["journal-mi-derriengue", "Bitácora · Mi Derriengue", "blog.html", "mi-derriengue.jpg", "cover", 50, 50],
    ["store-hero", "Tienda · foto principal", "store.html", "riccie-bandcamp.jpg", "store", 50, 38],
  ].map(([id, title, page, file, effect, focal_x, focal_y]) => ({
    id, title, page, effect, focal_x, focal_y,
    image_url: "", default_url: `/assets/images/${file}`, alt: title,
  }));
  const safeImage = (value, allowData = false) => {
    if (typeof value !== "string" || !value.trim()) return "";
    if (allowData && /^data:image\/(jpeg|png|webp);base64,[a-z\d+/]+=*$/i.test(value)) return value;
    try {
      const url = new URL(value, location.origin);
      if (url.protocol === "https:" || (url.origin === location.origin && url.pathname.startsWith("/assets/images/"))) return url.href;
    } catch { /* Invalid URLs are never rendered. */ }
    return "";
  };
  const money = (value, currency = "DOP") => new Intl.NumberFormat("es-DO", {
    style: "currency", currency: ["DOP", "USD", "EUR"].includes(currency) ? currency : "DOP",
  }).format(Number(value) || 0);
  const available = (item) => Math.max(0, Number(item.capacity) - Number(item.allocated));
  window.RiccieContent = Object.freeze({ photos, safeImage, money, available });
})();
