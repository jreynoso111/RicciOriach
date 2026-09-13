# Riccie Oriach — investigación y dirección visual

Revisión: 7 de septiembre de 2026.

## Identidad y contenido

Riccie Oriach se presenta en sus canales como cantautor y multiinstrumentista dominicano. Su mezcla de rock con merengue, salve, palos y gagá sostiene la dirección del sitio: fotografía, textura de afiche, tipografía expresiva y contraste entre vino, guayaba y amarillo. Los textos de campaña del sitio son redacción editorial original; no se presentan como citas del artista.

Fuentes primarias consultadas:

- [Bandcamp del artista](https://riccieoriach.bandcamp.com/): biografía, canales oficiales y fotografía con guitarra.
- [Viaje al infinito](https://riccieoriach.bandcamp.com/album/viaje-al-infinito): EP publicado el 25 de noviembre de 2017, portada y canciones.
- [Mi Derriengue](https://riccieoriach.bandcamp.com/album/mi-derriengue): EP publicado el 14 de febrero de 2020 y producción de Eduardo Cabra.
- [Maquiné](https://riccieoriach.bandcamp.com/album/maquin): álbum de ocho canciones publicado el 28 de mayo de 2021.
- [Créditos de la canción Maquiné](https://riccieoriach.bandcamp.com/track/maquin): producción de Munir Hossn, Riccie Oriach y Michael Olivera. La atribución del artículo se limita a esta canción.
- [Apple Music](https://music.apple.com/us/artist/riccie-oriach/1149242812): discografía y sencillos de 2025.
- [Guillermina](https://music.apple.com/us/song/1852175979): sencillo publicado en noviembre de 2025.
- [Pa’ que bailemos, video oficial](https://www.youtube.com/watch?v=1S2t2gNuf8M): colaboración con Lena Dardelet, publicada el 5 de diciembre de 2025; créditos audiovisuales en la descripción oficial.
- [Pa’ que bailemos, Apple Music](https://music.apple.com/us/song/pa-que-bailemos/1848175165): portada oficial del sencillo.
- [Spotify del artista](https://open.spotify.com/artist/3b12EGhDU7EhHcuZmMG3oV): retrato promocional y discografía.

No se añadieron cifras de seguidores, premios sin corroboración, fechas de gira supuestas, precios, ventas de entradas simuladas ni una dirección de correo sin verificar. Contacto conduce al Instagram enlazado desde el Bandcamp del artista.

## Procedencia de imágenes

Las fotografías, portadas y miniaturas se sirven localmente; no se generó ni se alteró la identidad del artista. Los tratamientos de color y encuadre son CSS. Los derechos permanecen con sus respectivos titulares.

| Archivo en `assets/images/`  | Fuente                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `riccie-portrait.jpg`        | Retrato del perfil de Spotify: `https://i.scdn.co/image/a1f45fa0eba456f8ffee7e8592a0b3678a5a9cfe`                                                       |
| `riccie-bandcamp.jpg`        | Fotografía ampliada enlazada por Bandcamp: `https://f4.bcbits.com/img/0034413203_10.jpg`                                                                |
| `maquine.jpg`                | Portada en Bandcamp: `https://f4.bcbits.com/img/a0559700711_5.jpg`                                                                                      |
| `mi-derriengue.jpg`          | Portada en Bandcamp: `https://f4.bcbits.com/img/a0330739428_5.jpg`                                                                                      |
| `viaje-al-infinito.jpg`      | Portada en Bandcamp: `https://f4.bcbits.com/img/a2782848288_5.jpg`                                                                                      |
| `pa-que-bailemos-cover.webp` | Apple Music: `https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/ff/95/d1/ff95d10c-a110-38b7-6519-e806c8f6cb6a/199502780814_cover.jpg/600x600bb.webp` |
| `pa-que-bailemos.jpg`        | Miniatura del video oficial `1S2t2gNuf8M`, obtenida por YouTube oEmbed                                                                                  |
| `la-guayaba.jpg`             | Miniatura del video oficial `6Zn7H97v1HM`, obtenida por YouTube oEmbed                                                                                  |
| `mi-derriengue-video.jpg`    | Miniatura del video oficial `d0jUZkRwvp0`, obtenida por YouTube oEmbed                                                                                  |
| `viaje-video.jpg`            | Miniatura del video oficial `8Eies6dWJLg`, obtenida por YouTube oEmbed                                                                                  |

## Decisiones de experiencia

- Portada con nombre y fotografía protagonista. La biografía acompaña al producto musical.
- Prólogo de 4.6 segundos más una transición de 0.76 segundos. Secuencia fotográfica y tipográfica con entrada inmediata mediante Escape o botón. Se muestra una vez por sesión y puede repetirse desde el pie.
- El prólogo se omite con movimiento reducido o al llegar a una sección por enlace directo. El contenido sigue accesible si JavaScript o almacenamiento fallan.
- Reproductores de YouTube con carga tras una acción explícita. Cerrar el diálogo destruye el iframe y detiene audio/video; existe un enlace alternativo a YouTube.
- Portadas completas y enlaces a Bandcamp, Spotify y Apple Music. No se reutiliza una portada ampliada como retrato del artista.
- Las seis páginas públicas comparten CSS y comportamiento. No requieren compilación ni framework.
- La agenda admite eventos publicados y fecha futura. Las boletas abren el enlace externo definido por evento. El estado y el texto de stock se mantienen en el gestor y son manuales, sin sincronización en tiempo real con la boletera.
- La bitácora conserva compatibilidad con entradas locales `Publicado`; excluye borradores y las tres entradas de demostración identificadas en el código original. Los artículos nuevos tienen enlaces a su fuente primaria.
- El editor existente usa almacenamiento del navegador; esta entrega no lo convierte en un CMS remoto ni habilita ventas o envío de formularios.
