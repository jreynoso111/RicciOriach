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

Los archivos antiguos `style.css` y `script.js` se conservan para compatibilidad con otras superficies. Las páginas públicas nuevas utilizan `assets/site.css` y `assets/site.js`. El directorio `admin/` contiene el gestor de eventos, enlaces a plataformas externas de taquillas, tienda y pedidos.

## Gestionar la web

Abre [el gestor](http://127.0.0.1:4180/admin/) para administrar fotos, eventos y sus enlaces/estados de boletas externas, productos y pedidos de tienda. Las boletas se compran en Ticketmaster, Tix u otra plataforma vinculada por evento; el stock visible se actualiza manualmente. Las fotos conservan los efectos de la web y permiten ajustar el encuadre. El catálogo está en [la tienda](http://127.0.0.1:4180/store.html).

La cuenta administradora y la activación de PayPal se dejan pendientes por decisión del propietario. Los pedidos manuales de tienda se confirman desde el panel. PayPal queda implementado y desactivado hasta completar su configuración y pruebas sandbox.

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

## Vista de muestra local

En `127.0.0.1:4180`, la tienda muestra ocho productos ficticios y la agenda cuatro fechas futuras y tres pasadas. La mercancía incluye mockups con las ilustraciones de Maquiné, Mi Derriengue y Viaje al infinito. Los precios, existencias, recintos y fechas son ejemplos. Las fechas son relativas al día de la visita para conservar ambos estados de la agenda.

Los filtros, el carrito, las cantidades, la selección de entradas y la confirmación simulada funcionan en el navegador. Las solicitudes de ejemplo no llaman al servidor de pedidos ni a una pasarela. Su carrito usa almacenamiento separado. Añade `?demo=0` para consultar los datos reales en local. En dominios públicos, los ejemplos no se activan.

Imágenes y prompts: [docs/DEMO_MERCH.md](docs/DEMO_MERCH.md). La portada conserva los tres álbumes/EPs del [catálogo oficial de Bandcamp](https://riccieoriach.bandcamp.com/music), en un carrusel continuo con pausa, controles y respeto por movimiento reducido.
