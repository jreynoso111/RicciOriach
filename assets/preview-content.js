/* Local examples only. Never publish these as the artist's real catalog or agenda. */
(() => {
  "use strict";
  if (!["127.0.0.1", "localhost", "[::1]"].includes(location.hostname)
      || new URLSearchParams(location.search).get("demo") === "0") return;

  const products = [
    ["camiseta-maquine", "Camiseta Maquiné", "Ropa", "Crema · M", 1450, 24, 3, "camiseta-maquine.jpg", "La ilustración de Maquiné, impresa a color sobre algodón suave."],
    ["tote-derriengue", "Tote Mi Derriengue", "Accesorios", "Lona natural", 950, 30, 4, "tote-derriengue.jpg", "El universo ilustrado de Mi Derriengue te acompaña donde vayas."],
    ["camiseta-viaje", "Camiseta Viaje al infinito", "Ropa", "Negra · L", 1450, 18, 2, "camiseta-viaje.jpg", "Los personajes del primer viaje, en una camiseta de algodón negro."],
    ["gorra", "Gorra El coro", "Accesorios", "Vino · Ajustable", 1100, 15, 13, "gorra.jpg", "Algodón lavado y bordado frontal. Lista para el próximo coro."],
    ["camiseta", "Camiseta Espíritu libre", "Ropa", "Crema · M", 1250, 24, 3, "camiseta.jpg", "Algodón suave, corte relajado y el sol de Riccie en el pecho."],
    ["maquine", "Maquiné · Edición en CD", "Música", "CD · Digipack", 950, 20, 2, "../maquine.jpg", "La música y su universo visual, en una edición para tu colección."],
    ["derriengue", "Lámina Mi Derriengue", "Arte", "30 × 30 cm", 650, 12, 0, "../mi-derriengue.jpg", "Una portada para darle otro ritmo a las paredes de tu espacio."],
    ["viaje", "Lámina Viaje al infinito", "Arte", "30 × 30 cm", 650, 10, 10, "../viaje-al-infinito.jpg", "Un viaje que también se mira. Impresión de colección."],
  ].map(([id, title, category, variant, price, capacity, allocated, image, description]) => ({
    id: `demo-${id}`, title, category, variant, price, capacity, allocated, description,
    currency: "DOP", sale_mode: "manual", status: "Publicado", demo: true,
    image_url: `/assets/images/demo/${image}`,
  }));

  const day = (offset) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const events = [
    ["isla", 14, "Una noche de isla", "Santo Domingo", "Patio del Caribe", "8:30 p. m.", "available", "La banda completa, las canciones y un patio para encontrarnos."],
    ["norte", 28, "El coro se va al norte", "Santiago", "La Casa del Sonido", "9:00 p. m.", "available", "Una noche de folclore, rock y canciones para cantar en compañía."],
    ["mar", 49, "Frente al mar", "Cabarete", "Escenario Frente al Mar", "6:00 p. m.", "free", "Un encuentro al atardecer con los pies cerca de la arena."],
    ["orbita", 70, "En órbita · Sesión íntima", "Santo Domingo", "Sala Órbita", "8:00 p. m.", "soldout", "Una sesión cercana, con historias detrás de cada canción."],
    ["patio", -21, "El patio cantó", "Santo Domingo", "Patio del Caribe", "8:00 p. m.", "available", "Un coro de principio a fin. Así se vería el recuerdo de una noche compartida."],
    ["cibao", -65, "Una vuelta por el Cibao", "Santiago", "La Casa del Sonido", "9:00 p. m.", "available", "Guitarras, palos y una ciudad que se sumó al viaje."],
    ["atardecer", -120, "Canciones al atardecer", "Cabarete", "Escenario Frente al Mar", "5:30 p. m.", "free", "El sol bajando y la música acompañando la última luz."],
  ].map(([id, offset, title, city, venue, time, ticketStatus, description]) => ({
    id: `demo-${id}`, date: day(offset), title, city, venue, time, ticketStatus,
    description, status: "Publicado", demo: true,
    ...( {
      isla: {ticketProvider: "Tix", ticketUrl: "https://tickets.example.invalid/isla", ticketAvailability: "Quedan 18 · General disponible"},
      norte: {ticketProvider: "Ticketmaster", ticketUrl: "https://tickets.example.invalid/norte", ticketAvailability: "Quedan 6"},
      orbita: {ticketProvider: "Tix", ticketUrl: "https://tickets.example.invalid/orbita", ticketAvailability: "General agotado"},
    }[id] || {ticketProvider: "", ticketUrl: "", ticketAvailability: ""}),
  }));
  window.RicciePreview = Object.freeze({ products, events });
  const notice = document.querySelector("[data-preview-notice]");
  if (notice) notice.hidden = false;
})();
