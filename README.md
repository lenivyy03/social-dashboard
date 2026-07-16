# Social Dashboard

Dashboard local de analítica para Facebook e Instagram, diseñado para comparar contenido orgánico y pagado, conservar históricos y preparar análisis estratégicos por cliente.

## Funciones principales

- Lectura de páginas, publicaciones e insights mediante Meta Graph API.
- Comparación de Facebook e Instagram por periodo, formato y tipo de distribución.
- Diagnóstico automático de métricas disponibles y depreciadas.
- Vinculación de una misma pieza publicada en ambas redes.
- Exportación Excel con pestañas separadas.
- Snapshots diarios de seguidores y snapshots individuales por publicación.
- Buyer personas guardados por cliente.
- Laboratorio de contenido con objetivos configurables y paquete para Codex.
- Registro manual de mensajes, prospectos, ventas e ingresos.

## Uso local

Abre `index.html` en el navegador o sirve la carpeta con un servidor estático. No existe proceso de compilación ni dependencias que instalar.

El Access Token se guarda solamente en el navegador. Nunca debe escribirse en los archivos del proyecto ni publicarse en GitHub.

Permisos habituales de Meta:

- `pages_show_list`
- `pages_read_engagement`
- `pages_read_user_content`
- `read_insights`
- `instagram_basic`
- `instagram_manage_insights`

## Estructura

```text
index.html
assets/
  css/
    styles.css
  js/
    state.js       Estado y configuración local
    storage.js     Snapshots, respaldos e IndexedDB
    meta-api.js    Meta Graph API e insights
    charts.js      Gráficas Canvas
    views.js       Vistas de analítica
    reports.js     Reportes y exportación Excel
    laboratory.js Buyer personas y Laboratorio
    app.js         Navegación e inicio de la aplicación
```

## Privacidad y almacenamiento

- Token de Meta: almacenamiento local del navegador.
- Buyer personas, borradores y resultados: almacenamiento local del navegador.
- Snapshots por publicación: IndexedDB.
- Respaldos: archivo JSON exportado manualmente.
- GitHub contiene únicamente el código; no contiene datos privados de clientes.

## Publicación

GitHub Pages sirve la rama `main` desde la raíz. `index.html` debe permanecer como archivo de entrada.

## Verificación

Los archivos JavaScript pueden validarse con `node --check assets/js/*.js`. El smoke test de estructura y funciones principales está en `tests/smoke.js`.
