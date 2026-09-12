# Riccie Oriach

Sitio del artista dominicano, con una dirección visual de afiche musical, fotografía real y un prólogo cinematográfico. HTML, CSS y JavaScript sin dependencias de ejecución ni compilación.

## Ejecutar en local

```sh
python3 scripts/serve.py
```

Abrir [http://127.0.0.1:4180](http://127.0.0.1:4180). El servidor fija la raíz del proyecto, desactiva la caché local y escucha solo en esta Mac. Usa el puerto dedicado 4180: el navegador conservaba otro sitio bajo 8000.

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

Los archivos antiguos `style.css` y `script.js` se conservan para compatibilidad con otras superficies. Las páginas públicas nuevas utilizan `assets/site.css` y `assets/site.js`. El directorio `admin/` contiene el gestor de presentaciones y nuevas historias; las rutas antiguas redirigen al nuevo panel.

## Editar

Los colores se definen en `:root` de `assets/site.css`. El contenido principal está en el HTML; los tres artículos editoriales están en `editorialPosts` de `assets/site.js`.

Abre [el gestor](http://127.0.0.1:4180/admin/) para crear, editar y archivar presentaciones y nuevas historias. Usa el mismo proyecto Supabase en local y en producción; no utiliza credenciales de demostración ni un login ficticio.

- El gestor remoto usa el proyecto Supabase `Riccie Oriach`: las tablas `events` y `posts` tienen RLS, el acceso está limitado a cuentas incluidas en `site_admins` y las fotos se guardan en el bucket de medios `site-media` con URLs públicas de lectura.
- `assets/supabase-config.js` contiene únicamente la URL del proyecto y su clave publicable, apta para navegador. Nunca pongas una clave `sb_secret_` o `service_role` en este repositorio.
- La agenda y la bitácora consultan Supabase y conservan `content/published.json` como respaldo estático si la API no responde.
- Las próximas presentaciones se ordenan por fecha ascendente y el historial por fecha descendente. Hay filtro por ciudad y estados de entradas.
- Las historias editoriales existentes permanecen en el código. El gestor administra las historias adicionales.
- En una historia nueva o editada puedes pegar una URL HTTPS o subir una foto JPG, PNG o WebP desde esta Mac. El gestor la comprime, la sube a Storage y muestra una vista previa antes de guardar.
- Las publicaciones nuevas aparecen en la web pública sin editar archivos ni desplegar manualmente.
- Para entrar, usa el enlace mágico que se envía a una cuenta invitada. El primer administrador debe añadirse a `site_admins` desde el dashboard después de crear o invitar su usuario en Auth.
- No hay pasarela de pago, compra interna de entradas ni servidor de correo. Los enlaces de entradas llevan al proveedor externo.

Para probar la web en esta Mac usa `serve.py`, que fija la raíz del proyecto y desactiva la caché. El gestor remoto guarda el contenido directamente en Supabase y ya no depende de archivos locales ni de `localStorage`.

El intro guarda solo una preferencia de sesión con la clave `riccie-cinema-v2`. Respeta `prefers-reduced-motion`, funciona sin almacenamiento disponible y no reproduce audio automáticamente. Los iframes se crean al abrir un video y se eliminan al cerrarlo.

## Verificar

```sh
node --check assets/site.js
python3 scripts/verify_site.py
node scripts/verify_behaviors.mjs
python3 scripts/test_manager.py
git diff --check
```

Revisar también en navegador: portada y páginas públicas a 320, 390, 768 y 1440 píxeles; navegación móvil; abrir, saltar y repetir intro; reproducción y cierre de video; enlaces a música; agenda vacía; artículos existentes y slug inexistente. La verificación debe comprobar el ancho real del navegador después de cambiar el viewport.

## Publicar

El proyecto está vinculado a Vercel como `riccie-oriach`. Después de verificar:

```sh
npx vercel --prod --yes
```

Dominio: [riccie-oriach.vercel.app](https://riccie-oriach.vercel.app/).
