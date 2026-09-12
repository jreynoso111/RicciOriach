# Gestión de la web

El panel en `/admin/` administra el proyecto Supabase Riccie Oriach (`vacmyqiddtxouogpcvkt`). La cuenta administradora y las credenciales de PayPal quedan pendientes a petición del propietario.

## Fotos

La pestaña Fotos de la web incluye portada, artista, tres fotografías de la intro, lanzamiento musical, eventos, contacto, las tres historias editoriales y tienda. Permite URL HTTPS, subida JPG/PNG/WebP, encuadre horizontal y vertical, texto alternativo, restauración de la original y vista previa de la página. Los filtros, máscaras, bordes y animaciones siguen en CSS. Las fotos de nuevas historias, afiches de eventos y productos se editan en sus fichas.

## Publicar contenido

Crear el evento con fecha, ciudad y lugar. Publicarlo cuando esté confirmado. En Taquillas, vincular cada tipo de entrada al evento y especificar precio, moneda, cupo total y modalidad de venta. Las entradas no se ofrecen si el evento está archivado, cancelado, pospuesto o pasado.

En Tienda, crear un producto por talla o variante para controlar inventario individualmente. El SKU es único cuando se introduce. El catálogo muestra únicamente productos publicados; agotados aparecen sin botón de compra. El inventario total no puede ser menor que las unidades ya asignadas.

Las actualizaciones se publican directamente en Supabase, sin desplegar la web otra vez. La detección de cambios simultáneos evita sobrescribir una edición más reciente.

## Pedidos y reservas manuales

Los visitantes seleccionan artículos, completan contacto y aceptan el uso de esos datos para gestionar la solicitud. Reciben una referencia. No se envía correo automático ni se cobra al enviar el formulario. La solicitud no bloquea unidades hasta que un administrador la confirme.

En Pedidos y reservas: Pendiente → Confirmado → Entregado, o Pendiente/Confirmado → Cancelado. Confirmar asigna inventario de forma transaccional. Cancelar libera unidades. Los pagos manuales se registran separadamente y solo deben marcarse recibidos cuando el cobro esté comprobado. Se conservan las referencias, datos del comprador, precios de la compra y notas internas.

## PayPal: pendiente de activar

Implementación en `api/payments.js`, `api/paypal-webhook.js` y `lib/payments.js` usando Orders v2 y verificación de firma de webhooks. Sin configuración completa, la API anuncia `enabled: false` y rechaza crear o capturar pagos. No se han realizado cobros reales ni pruebas con una cuenta PayPal.

Configurar secretos exclusivamente en Vercel:

- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`.
- `PAYPAL_ENV`: primero `sandbox`, luego `live` tras verificar la integración.
- `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_URL` del proyecto Riccie Oriach.
- `SITE_URL`: `https://riccie-oriach.vercel.app` o el dominio definitivo.

El webhook es `/api/paypal-webhook`. Suscribir `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED` y `PAYMENT.CAPTURE.REFUNDED`. Verificar una compra sandbox, cancelación, firma inválida, notificación repetida y reembolso antes de activar producción.

Esta integración permite USD y EUR. DOP se utiliza para pedidos manuales: no hay conversión implícita de moneda. Los precios deben incluir los impuestos aplicables. La entrega se coordina manualmente, sin cargo de transporte calculado por esta web.

El servidor calcula el precio, reserva inventario, crea el pedido PayPal y entrega el enlace seguro. La página de retorno y los webhooks consultan PayPal para verificar referencia, importe, moneda y captura completada. Las respuestas duplicadas no descuentan más unidades. Los pagos en proceso no liberan inventario por expiración. Las reservas de pago no iniciadas vencen después de tres horas; la limpieza se ejecuta al consultar tienda/taquillas o comenzar otro checkout. Los procesos ambiguos permanecen para revisión y reintento, sin asumir que fallaron.

Reembolsos en el portal PayPal; el webhook actualiza el estado. Un reembolso no repone automáticamente productos ya enviados o entradas utilizadas: el equipo revisa la devolución e inventario. No se almacenan números de tarjeta.

## Acceso pendiente

Crear/invitar la cuenta elegida en Supabase Auth y añadir su UUID a `site_admins`. La tabla no concede acceso a usuarios por registrarse. Configurar los redirects de Auth para producción y `http://127.0.0.1:4180/admin/index.html`. No se ha creado ningún administrador de demostración en el proyecto real.

## Verificación

`npm test` ejecuta validaciones de enlaces, comportamiento y 33 comprobaciones de PostgreSQL real mediante PGlite, además de las comprobaciones de PayPal desactivado y validación de importes. `node scripts/preview_manager.mjs` inicia una prueba aislada en 4191, con datos ficticios y sin acceso a Auth, Storage o PayPal reales. No debe publicarse ni confundirse con el gestor de producción. La prueba visual verificó envío manual, recepción, confirmación, inventario, reserva de entradas y guardado de fotos.

Las migraciones de gestión y PayPal fueron aplicadas al proyecto remoto mediante su SQL Editor. Conservar estos archivos como registro de esquema; no reaplicarlos sobre tablas existentes sin revisar el historial.
