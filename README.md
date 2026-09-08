# Riccie Oriach

Sitio del artista dominicano, con una dirección visual de afiche musical, fotografía real y un prólogo cinematográfico. HTML, CSS y JavaScript sin dependencias de ejecución ni compilación.

## Ejecutar en local

```sh
python3 -m http.server 4180 --bind 127.0.0.1
```

Abrir [http://127.0.0.1:4180](http://127.0.0.1:4180).

## Páginas y archivos

- `index.html`: portada, intro, lanzamiento, discografía, artista, videos y llamada a conciertos.
- `music.html`: discografía, sencillos y videos oficiales.
- `events.html`: agenda y contacto para conciertos.
- `contact.html`: contacto mediante canales oficiales.
- `blog.html` y `blog-post.html`: bitácora y artículos con fuentes.
- `assets/site.css`: paleta, tipografía, animación y diseño responsive compartidos.
- `assets/site.js`: navegación, intro, diálogos multimedia y lectura segura de contenidos locales.
- `assets/images/`: fotografías, portadas y miniaturas de canales del artista.
- `docs/DESIGN_RESEARCH.md`: investigación, fuentes, procedencia de imágenes y decisiones.

Los archivos antiguos `style.css` y `script.js` se conservan para compatibilidad con otras superficies. Las páginas públicas nuevas utilizan `assets/site.css` y `assets/site.js`. El directorio `admin/` no fue modificado.

## Editar

Los colores se definen en `:root` de `assets/site.css`. El contenido principal está en el HTML; los tres artículos editoriales están en `editorialPosts` de `assets/site.js`.

La integración existente del editor es local al navegador. `ricciEvents` admite eventos con estado `Activo` y fecha futura; `ticketUrl` es opcional. `public_blog_posts` aporta entradas `Publicado`. No hay sincronización remota, pasarela de pago ni servidor de correo. El sitio no presenta esos servicios como disponibles.

El intro guarda solo una preferencia de sesión con la clave `riccie-cinema-v2`. Respeta `prefers-reduced-motion`, funciona sin almacenamiento disponible y no reproduce audio automáticamente. Los iframes se crean al abrir un video y se eliminan al cerrarlo.

## Verificar

```sh
node --check assets/site.js
python3 scripts/verify_site.py
node scripts/verify_behaviors.mjs
git diff --check
```

Revisar también en navegador: portada y páginas públicas a 320, 390, 768 y 1440 píxeles; navegación móvil; abrir, saltar y repetir intro; reproducción y cierre de video; enlaces a música; agenda vacía; artículos existentes y slug inexistente. La verificación debe comprobar el ancho real del navegador después de cambiar el viewport.

## Publicar

El proyecto está vinculado a Vercel como `riccie-oriach`. Después de verificar:

```sh
npx vercel --prod --yes
```

Dominio: [riccie-oriach.vercel.app](https://riccie-oriach.vercel.app/).
