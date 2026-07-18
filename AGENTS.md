# Social Dashboard — Contexto del proyecto

Dashboard de analítica para Meta (Facebook + Instagram) construido para Angel Ortega,
social media manager en Hermosillo. Un solo archivo HTML (`index.html`), sin build step,
vanilla JS + Canvas para gráficas + SheetJS (CDN) para exportar Excel. Se publica gratis
vía GitHub Pages.

## Cómo correrlo
Abrir `index.html` en el navegador. Pide un Access Token de Meta Graph API (se guarda en
localStorage, nunca en el código ni en el repo — nunca hardcodear tokens aquí).

Permisos de Meta necesarios (Graph API Explorer → developers.facebook.com/tools/explorer):
`pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, `read_insights`,
`instagram_basic`, `instagram_manage_insights` (este último es fácil de olvidar — sin él,
Instagram carga captions/likes pero el alcance/guardados quedan en 0 en silencio, sin error).

## Arquitectura
- `loadPageData(pageId)` — trae posts de FB (hasta 100) + IG (hasta 100), corre insights,
  hace merge, cachea en memoria (`cache[pageId]`), guarda snapshot para histórico.
- `probeMetrics(sampleIds, candidates, token)` — prueba qué métricas responde Meta ANTES
  de pedirlas en bulk. Prueba contra 2-3 posts de muestra (no solo 1) para no perder
  métricas válidas por mala suerte con el primer post. Es seguro agregar candidatas
  especulativas a las listas — si Meta no las reconoce, simplemente se descartan.
- `batchInsights(ids, metrics, token)` — pide insights en bloques de 50 (límite real de
  Meta para batch requests; con 100 posts de golpe la llamada completa fallaba).

## Métricas de Meta — historial de depreciaciones (IMPORTANTE, cambia seguido)
Meta mata métricas de insights cada pocos meses sin avisar mucho. Esto YA nos pasó dos
veces en este proyecto:

- **15 nov 2025 / 15 jun 2026**: Facebook mató `post_impressions`, `post_impressions_unique`,
  `post_video_views`. Reemplazo oficial: `post_media_view`.
- **8 ene 2025**: Instagram mató `impressions` a nivel media.
- **15 jun 2026**: el "reach" de Reels de Instagram murió sin reemplazo directo — solo
  queda `plays`. Fotos/álbumes de IG SÍ pueden seguir teniendo `reach` real (probar por
  separado, no asumir que si falla en video falla en foto, y viceversa).
- `post_activity_by_action_type` (guardados de Facebook) es EXPERIMENTAL — no hay doc
  oficial confirmando el nombre exacto. Puede fallar aunque la cuenta sí tenga guardados.

**Regla de oro**: si algo sale en "—" en el dashboard, antes de asumir que es un bug,
abrir el panel "🔍 Diagnóstico de métricas de Meta" en la vista Resumen — ahí se ve
exactamente qué métrica respondió y cuál no. Si Meta vuelve a deprecar algo, se va a
notar ahí primero. Buscar en la web la fecha actual de depreciaciones antes de tocar
nombres de métricas — no confiar en el conocimiento previo del modelo para esto.

## Sistema de "vincular piezas" (FB + IG del mismo contenido)
Un mismo video/post se publica en FB e IG con distinto caption por red — Meta les da IDs
completamente independientes, no hay forma de saber que son la misma pieza desde la API.

- **Mismo día calendario → se vincula automático** (`autoLinkSameDay()`), sin pedir
  confirmación. En la práctica casi nunca falla.
- **1+ día de diferencia → requiere confirmación manual** vía el modal "🔗 Vincular
  piezas" (sugerencias por cercanía de fecha, ±3 días, tú confirmas o rechazas).
- Se guarda en localStorage (`sd_pairs`, `sd_rejected`), persiste entre sesiones.
- Cada par tiene `auto:true/false` para distinguir en la UI qué fue automático vs
  confirmado a mano.
- **No volver a implementar agrupado automático por fecha sin confirmación para
  diferencias de 1+ día** — ya se intentó, era impreciso (ver historial de commits),
  y el usuario específicamente pidió mantener confirmación manual para esos casos.

## Otras decisiones ya tomadas (no revertir sin razón)
- **Pagado vs orgánico**: marcado manual por el usuario (botón 💰/🟢 por post), NO
  detección automática por outliers — el usuario prefirió control total aquí.
- **Export a Excel real (.xlsx con 4 pestañas: Facebook, Instagram, General, Vinculadas)**,
  no CSV — un CSV no soporta pestañas y el usuario las pidió explícitamente.
- **Tema visual**: neobrutalista tipo "hoja de especificaciones técnicas" — fondo claro,
  bordes negros sólidos, sin border-radius, un solo acento naranja (#ff3d00), tipografía
  Space Grotesk (títulos) + JetBrains Mono (todo lo demás). Colores de marca reales para
  las etiquetas FB (#1877F2) e IG (#E1306C). No usar gradientes ni glassmorphism.
- **Seguidores nuevos de Instagram**: `follower_count` se consulta únicamente para los
  últimos 30 días y se presenta siempre como una ventana parcial, nunca como total anual.
  `fetchInstagramFollowerHistory` devuelve `{rows, windowDays: 30}`. No volver a pedir el
  año completo ni a descartar toda la respuesta porque algún día venga vacío.
- **Snapshots de seguidores**: se guarda un snapshot local cada vez que se abre el
  dashboard (`recordSnapshot`). Cada entrada de `sd_snaps` usa
  `{date, fans, igFans, avgEng}`; `igFans` puede faltar en entradas antiguas y debe seguir
  siendo compatible. Esto permite acumular la tendencia anual local de ambas redes.
- **Metodología de Engagement Rate**: para cada publicación orgánica se usa, en orden:
  (1) engagement / alcance real; (2) si no hay alcance, engagement / seguidores del
  snapshot local más cercano cuya fecha sea anterior o igual a la publicación (para IG,
  `igFans` y como respaldo `fans`), marcado como estimado; (3) si tampoco existe ese
  snapshot, la publicación se excluye del ranking. Nunca usar seguidores actuales para
  puntuar publicaciones antiguas. El score es un percentil dentro de la misma red y
  formato, no una multiplicación arbitraria del ER.

## Clientes que usa el usuario (contexto de negocio, no técnico)
Botas San Felipe del Río, ALS (Ambientes Laborales Saludables), Dra. Laura Quintanar
(radióloga), El Parián, Nissan Gran Auto, Mi Pensión Mi Retiro. Todos en Hermosillo,
Sonora. El usuario usa este dashboard para armar reportes y recomendaciones de contenido
para cada cliente — el botón "📋 Generar Reporte" produce texto para pegar en Codex.ai
y pedir análisis con la skill de social media manager.

## Deploy
GitHub Pages, branch `main`, root. El archivo se llama `index.html` (no otro nombre, o
GitHub Pages no lo sirve en la raíz). Repo: github.com/lenivyy03/social-dashboard (privado).
