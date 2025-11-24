# Plan de adaptación a Hostinger (frontend puente)

Este archivo define el plan simplificado para dejar el sitio como escaparate estático y redirigir a la tienda gestionada en Hostinger (Builder/WooCommerce). Se elimina cualquier idea de backend propio, base de datos o lógica de autenticación/carrito en el frontend.

## Tareas en orden de ejecución (pendientes)
1. **Eliminar dependencias/backend propio**
   - Quitar referencias a Node/Express/DB/bcrypt/jwt y cualquier almacenamiento local de credenciales o carrito.
2. **Enlazar a la tienda gestionada**
   - Sustituir botones de compra y tickets por enlaces externos (placeholders) listos para ser reemplazados por URLs finales de Hostinger/WooCommerce.
3. **Verificación de frontend estático**
   - Confirmar que el JavaScript restante solo cubre efectos visuales (canvas, menú móvil, scroll suave) sin persistencia de datos.
4. **Checklist de publicación en Hostinger**
   - Revisar meta tags, accesibilidad básica, enlaces externos actualizados y eliminar cualquier referencia a carritos o sesiones internas.

## Estructura objetivo
- El sitio actúa como catálogo y puente: las tarjetas muestran CTA que apuntan a URLs externas configurables.
- No se almacena sesión ni carrito en el navegador. Toda autenticación y pago ocurre en la plataforma gestionada.
- Scripts restantes: únicamente estética y navegación básica.

## Notas de hosting (Hostinger)
- Usar la tienda gestionada (WooCommerce/Builder) para pagos y cuentas.
- Las URLs de compra y tickets en el frontend quedan como placeholders editables.
- No se requiere base de datos local ni código de servidor en este repositorio.
