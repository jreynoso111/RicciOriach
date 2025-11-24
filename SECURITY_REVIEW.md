# Auditoría de seguridad y funcionalidad

Archivo único de auditoría. Resume los problemas detectados y las acciones. El backlog ordenado vive en `MIGRATION_PROCESS.md`.

## Estado
- **Pendiente**: Eliminar cualquier referencia a backend propio (Node/DB/bcrypt/jwt) y lógica de sesión/carrito en el cliente.
- **Pendiente**: Sustituir botones de compra y tickets por enlaces externos configurables hacia la tienda Hostinger/WooCommerce.
- **Pendiente**: Validación y sanitización básicas en las vistas (solo para inputs que se mantengan), sin `innerHTML` con datos dinámicos sin escapar.
- **Pendiente**: Confirmar que el JavaScript restante sea solo estético (canvas, menú móvil, scroll suave) y navegación.

## Hallazgos críticos
- **Sesiones/roles en localStorage (legado)**: Persistencia en el navegador permitía falsificar identidad. Se debe retirar y apuntar a autenticación externa de la tienda.
- **Carrito y precios en cliente**: Totales y estados se calculaban en el navegador; deben delegarse a la tienda externa, dejando el front solo como catálogo.
- **Render sin sanitizar**: Algunos listados usan `innerHTML` con datos editables; hay riesgo de XSS almacenado si se dejan formularios abiertos.

## Hallazgos medios
- **Validación insuficiente**: Formularios de login/registro/perfil deben simplificarse o deshabilitarse si la autenticación pasa a la tienda; cualquier campo visible requiere límites y formatos claros.
- **Persistencia sin integridad**: Datos guardados en el navegador carecen de firmas. Deben eliminarse o moverse a la plataforma externa.

## Hallazgos bajos
- **Mensajes de error verbosos**: Al retirarse el flujo de autenticación local, usar mensajes genéricos o notas informativas.

## Próximos pasos
1. Ejecutar el plan de `MIGRATION_PROCESS.md` comenzando por limpiar dependencias/backend y enlaces internos de carrito/sesión.
2. Reemplazar CTAs de compra y tickets por placeholders externos hacia la tienda Hostinger.
3. Revisar vistas para que solo queden scripts estéticos y enlaces; eliminar cualquier cálculo/persistencia local.
