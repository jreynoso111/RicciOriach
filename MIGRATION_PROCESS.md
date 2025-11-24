# Proceso de migración a un backend seguro (Hostinger)

Este archivo es el plan vivo y el backlog de seguridad. Objetivo: reemplazar la lógica insegura basada en `localStorage` y `auth.js` por un backend real con sesiones y base de datos gestionada. El sitio se desplegará en Hostinger: usa un backend compatible (p. ej. Node.js/Express) y una base de datos administrada remota (PostgreSQL/MySQL) expuesta vía variables de entorno, nunca una DB local ni embebida en el frontend.

## Arquitectura recomendada (compatible con Hostinger)
- **Backend**: Node.js + Express (o framework equivalente soportado por Hostinger).
- **Base de datos gestionada**: PostgreSQL/MySQL en servicio administrado (p. ej. base remota de Hostinger o proveedor externo); credenciales solo en variables de entorno.
- **Autenticación**: Cookies de sesión HttpOnly + SameSite=Strict con IDs aleatorios en tabla `sessions` y rotación de sesión al iniciar/cerrar sesión.
- **Hash de contraseñas**: `bcrypt` (cost 12-14) con sal única por usuario.
- **Red**: Forzar HTTPS; usa `helmet`, `cors` restringido al dominio público y `rate limiting` en rutas de auth/checkout.

## Endpoints clave (pseudocódigo)
```http
POST   /api/auth/register   # Crea usuario (bcrypt) y devuelve cookie de sesión
POST   /api/auth/login      # Valida credenciales, crea sesión y setea cookie HttpOnly
POST   /api/auth/logout     # Invalida sesión y expira cookie
GET    /api/auth/me         # Devuelve perfil de sesión activa

GET    /api/profile         # Devuelve perfil del usuario autenticado
PUT    /api/profile         # Actualiza datos de perfil del usuario activo

GET    /api/products        # Lista catálogo público
POST   /api/products        # Crea producto (solo admin/manager)
PUT    /api/products/:id    # Actualiza producto

POST   /api/cart            # Crea carrito/orden draft con precios calculados en servidor
PUT    /api/cart/:id        # Actualiza cantidades; recalcula totales y stock disponible
POST   /api/checkout        # Confirma orden, bloquea stock y genera estado "Pendiente de pago"

GET    /api/orders          # Lista órdenes del usuario autenticado
GET    /api/orders/:id      # Detalle de orden (dueño o admin)
```

## Flujo de autenticación seguro
1. El frontend envía email/contraseña a `/api/auth/login`.
2. El servidor compara con `bcrypt.compare`, genera `sessionId`, lo guarda en `sessions` con expiración y lo envía en cookie HttpOnly + Secure + SameSite=Strict.
3. Middleware lee la cookie en cada petición, valida la sesión y adjunta `req.user` con roles/claims.
4. Logout borra la fila de sesión y expira la cookie.

## Carrito, precios e inventario en servidor
- El servidor es la fuente de verdad para precios, impuestos, descuentos y stock.
- El cliente solo envía `{ productId, quantity }`; el backend valida stock, obtiene precios vigentes, calcula subtotal/impuestos/total y persiste la orden (`draft` o `pending_payment`).
- Cualquier cambio de cantidad o cupón recalcula totales en backend antes de responder; nunca confiar en cálculos del navegador.

## Backlog y estado
- [ ] Infraestructura en Hostinger: servidor Node/Express desplegado y conectado a DB gestionada.
- [ ] Sesiones en backend con cookies HttpOnly, expiración y rotación.
- [ ] Hashing con bcrypt y migración de contraseñas legadas.
- [ ] CRUD de productos/posts/tickets/perfiles en servidor con control de acceso por rol.
- [ ] Cálculo de totales, impuestos y stock en servidor; el cliente solo muestra montos firmados.
- [ ] Sanitización/validación de entradas en servidor y uso de `textContent` en UI.
- [ ] Eliminación de dependencia de `localStorage` para auth, roles e inventario.
- [ ] Pruebas automatizadas de auth, carrito, órdenes, roles y eventos/tickets.

### Próximas acciones (orden sugerido)
1) Preparar entorno en Hostinger: variables de entorno para DB y secreto de sesión; habilitar HTTPS.
2) Implementar endpoints de auth con bcrypt y cookies HttpOnly; activar rate limiting.
3) Migrar catálogo (products/posts/tickets) al backend con control de rol en middleware.
4) Mover carrito/checkout al backend (calcular totales, verificar stock y registrar órdenes).
5) Integrar el frontend: reemplazar `localStorage` de auth/rol por `fetch` con `credentials: 'include'`.
6) Sanitizar renderizado en frontend y validar inputs en servidor.
