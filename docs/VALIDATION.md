# Verificación del rediseño

7 de septiembre de 2026.

## Comprobaciones automáticas

- `node --check assets/site.js`: correcto.
- `python3 scripts/verify_site.py`: las seis páginas tienen un H1; enlaces locales, recursos y anclas válidos; las imágenes tienen texto alternativo.
- `node scripts/verify_behaviors.mjs`: almacenamiento bloqueado o malformado, exclusión de borradores y muestras, fechas pasadas, enlace de entradas inseguro, movimiento reducido, salida y repetición del intro.
- `git diff --check`: correcto.

## Navegador real

Verificado con el navegador conectado de Codex; `agent-browser` no estaba instalado.

- Las seis páginas se renderizaron a anchos reales de 320, 768 y 1440 px sin desbordamiento horizontal. Portada y navegación se inspeccionaron también a 390 × 844.
- Portada, lanzamiento, discografía, biografía y menú móvil revisados visualmente. Portadas cuadradas completas y retrato biográfico con proporciones corregidas.
- Intro inicial, repetición desde el pie y salida mediante Escape comprobados. El diálogo controla el foco y libera el bloqueo de desplazamiento al salir. La preferencia de sesión evita repetirlo en cada navegación.
- El videoclip oficial de Pa’ que bailemos se reprodujo dentro del diálogo: se observó el reproductor avanzando a 0:01 de 3:43. Al cerrar, quedaron cero iframes y el desplazamiento volvió a habilitarse.
- Menú móvil expandido, navegación a Música y estado cerrado tras navegar comprobados.
- Navegación fija: encabezado en `top: 0` y fondo opaco al desplazarse.
- Artículo Maquiné: título y texto renderizados. Slug inexistente: mensaje de ausencia con regreso a la bitácora.
- Recursos revisados sin imágenes rotas. Consola inicial de la aplicación sin errores.

## Dependencias externas

Las fotografías y portadas se sirven desde `assets/images`. Google Fonts aporta tipografía. Los videos usan el reproductor oficial de YouTube y tienen enlace alternativo. Las fechas y entradas del editor original continúan siendo locales al navegador: no se añadió un CMS remoto ni un servicio de pagos.
