# Auditoría de seguridad y funcionalidad

Archivo único de auditoría. Resume los problemas detectados y qué hacer para resolverlos. El detalle de tareas y estado vive en `MIGRATION_PROCESS.md` (backlog Hostinger).

## Estado
- **Pendiente**: Migrar autenticación y sesiones al backend con cookies HttpOnly + expiración (Hostinger, sin localStorage).
- **Pendiente**: Implementar hash robusto (bcrypt/Argon2) con sal única en servidor y migrar contraseñas legadas.
- **Pendiente**: Mover cálculo de precios, stock y órdenes al backend; el cliente no debe calcular totales.
- **Pendiente**: Validación y sanitización completas en servidor y cliente; evitar `innerHTML` con datos no escapados.
- **Pendiente**: Control de acceso por rol en API (productos, posts, tickets, perfiles) con verificación en servidor.
- **Pendiente**: Manejo de errores genéricos y expiración/rotación de sesiones.

## Hallazgos críticos
- **Sesiones y roles en localStorage**: Cualquier usuario puede falsificar inicio de sesión o rol editando el navegador. Necesario backend con cookies HttpOnly y expiración.
- **Hashing débil y sal estática**: El algoritmo casero no protege contraseñas. Sustituir por bcrypt/Argon2 en servidor.
- **Cálculos de precios/órdenes en cliente**: Totales, impuestos y estados de pago se generan en el navegador y pueden manipularse. Deben calcularse y firmarse en backend.
- **Render sin sanitizar**: `innerHTML` imprime valores editables de productos/posts/links, permitiendo XSS almacenado.

## Hallazgos medios
- **Validación insuficiente**: Formularios de login/registro, perfil y catálogo no imponen formatos fuertes ni límites de longitud.
- **Persistencia sin integridad**: Catálogo, perfiles y roles se guardan sin firmas ni sellos; un usuario puede alterarlos.

## Hallazgos bajos
- **Mensajes de error verbosos**: Indican si el correo existe o si la contraseña falló, facilitando enumeración.
- **Sesiones sin caducidad**: No hay renovación ni expiración automática.

## Qué hacer a continuación
1. Ejecutar el plan de `MIGRATION_PROCESS.md` para desplegar backend en Hostinger con DB gestionada y endpoints seguros.
2. Sustituir la lógica de `auth.js` y del carrito por llamadas a la API con `fetch` y `credentials: 'include'`.
3. Implementar sanitización/validación server-side y escapar datos en el cliente usando `textContent` y plantillas seguras.
4. Endurecer errores ("Credenciales inválidas"), agregar expiración/rotación de sesiones y pruebas automáticas.
