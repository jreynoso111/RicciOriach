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

## 2026-09-10 — Agenda y gestión local

- Reproducido: volver al inicio desde el puerto 8000 mostró el portafolio de Juan Reynoso en el navegador, aunque el servidor devolvía el HTML correcto de Riccie. El origen dedicado `127.0.0.1:4180` y los recursos versionados evitaron la mezcla de caché.
- `scripts/serve.py` fija la raíz del proyecto y expone un gestor solo en loopback. Borradores y copias de seguridad quedan fuera de rutas estáticas y despliegues.
- Navegador: agenda en escritorio y a 390 px; portada y título en una línea a 320, 390 y 1440 px. Formulario de gestión revisado a 390 px.
- Flujo real en navegador: crear presentación, publicar, recargar, verla en la agenda, archivar; crear historia y abrir su artículo público. Datos temporales retirados al terminar.
- Comprobaciones HTTP aisladas: guardado en disco, filtro de publicación, archivo, revisiones concurrentes (409), acceso a borradores (404), origen externo (403), fechas y enlaces inválidos (400).
- Pasaron sintaxis JS, verificación de referencias HTML, pruebas de comportamiento y pruebas HTTP del gestor.
- Pendiente: elegir la organización/proyecto para gestión remota con autenticación. La versión actual administra eventos y nuevas historias desde esta Mac; guardar no despliega automáticamente a internet.

## 2026-09-10 — Música y acceso al gestor

- Música quedó en dos recorridos: un catálogo único con lanzamiento, discografía, plataformas y solo los dos sencillos independientes; el archivo audiovisual queda como la segunda sección principal.
- El pie de página de las seis páginas públicas incluye un engranaje accesible que lleva a `admin/index.html`.
- Navegador real: Música verificada a 390 px y escritorio, sin desbordamiento horizontal; el enlace de engranaje abrió el panel local correctamente.
