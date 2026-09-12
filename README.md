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
- `assets/site.css`: paleta, tipografía, animación y diseño responsive compartidos.
- `assets/site.js`: navegación, intro, diálogos multimedia y lectura segura de contenidos locales.
- `assets/images/`: fotografías, portadas y miniaturas de canales del artista.
- `docs/DESIGN_RESEARCH.md`: investigación, fuentes, procedencia de imágenes y decisiones.

Los archivos antiguos `style.css` y `script.js` se conservan para compatibilidad con otras superficies. Las páginas públicas nuevas utilizan `assets/site.css` y `assets/site.js`. El directorio `admin/` contiene el gestor de eventos, taquillas, tienda y pedidos.

## Gestionar la web

Abre [el gestor](http://127.0.0.1:4180/admin/) para administrar fotos, eventos, taquillas, productos, pedidos y reservas. Las fotos conservan los efectos de la web y permiten ajustar el encuadre. El catálogo está en [la tienda](http://127.0.0.1:4180/store.html).

La cuenta administradora y la activación de PayPal se dejan pendientes por decisión del propietario. Los pedidos manuales y reservas se confirman desde el panel. PayPal queda implementado y desactivado hasta completar su configuración y pruebas sandbox.

Consulta [la guía de gestión y activación](docs/MANAGEMENT.md) para funcionamiento, inventario, acceso, secretos de servidor y límites de la integración de pagos.

## Verificar

```sh
node --check assets/site.js
python3 scripts/verify_site.py
node scripts/verify_behaviors.mjs
python3 scripts/test_manager.py
git diff --check
```

Revisar también en navegador: portada y páginas públicas a 320, 390, 768 y 1440 píxeles; navegación móvil; abrir, saltar y repetir intro; reproducción y cierre de video; enlaces a música; agenda vacía; tienda y checkout desactivado sin credenciales. La verificación debe comprobar el ancho real del navegador después de cambiar el viewport.

## Publicar

El proyecto está vinculado a Vercel como `riccie-oriach`. Después de verificar:

```sh
npx vercel --prod --yes
```

Dominio: [riccie-oriach.vercel.app](https://riccie-oriach.vercel.app/).
