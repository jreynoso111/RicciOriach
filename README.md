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

Abre [el gestor local](http://127.0.0.1:4180/admin/) para crear, editar y archivar presentaciones y nuevas historias. No utiliza credenciales de demostración ni un login ficticio. El servicio solo acepta solicitudes desde su origen local; **no exponer `serve.py` a internet**.

- Los cambios se guardan en `.local-cms/content.json`, excluido de Git y Vercel. Las versiones anteriores se conservan en `.local-cms/history/`.
- `content/published.json` contiene exclusivamente los registros con estado `Publicado`. La agenda y la bitácora leen este archivo; los cambios dejan de depender de `localStorage`.
- Las próximas presentaciones se ordenan por fecha ascendente y el historial por fecha descendente. Hay filtro por ciudad y estados de entradas.
- Las historias editoriales existentes permanecen en el código. El gestor administra las historias adicionales.
- Para publicar cambios en internet, revisar y desplegar `content/published.json` con la web. Guardar desde el gestor actual actualiza únicamente la web local.
- El gestor remoto con autenticación y base de datos compartida está pendiente de definir la organización/proyecto de Riccie. No se ha creado ni modificado un proyecto de Supabase ajeno.
- No hay pasarela de pago, compra interna de entradas ni servidor de correo. Los enlaces de entradas llevan al proveedor externo.

Usa siempre `serve.py` para el gestor: un servidor genérico puede exponer archivos de borradores. Una edición con una revisión desactualizada devuelve HTTP 409 para evitar sobrescribir cambios de otra ventana.

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
