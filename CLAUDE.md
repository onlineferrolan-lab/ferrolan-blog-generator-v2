# CLAUDE.md

Este archivo guía a Claude Code cuando trabaja en este repositorio.

## Visión General del Proyecto

Ferrolan Blog Generator es un sistema de creación de contenido SEO-optimizado para el blog de Ferrolan, una empresa distribuidora de materiales de construcción, cerámica, baño, cocina, parquet, ferretería y jardinería con tiendas en Barcelona, Rubí, Badalona y Santa Coloma de Gramenet.

El proyecto combina:
- **App web Next.js** (dashboard visual en Vercel) para generar, programar y publicar artículos
- **Comandos Claude Code** (slash commands) para investigación SEO, análisis y optimización
- **Agentes especializados** para tareas concretas (SEO, meta, linking, keywords)
- **Skills de marketing** para estrategias avanzadas

## Stack Técnico

- **Framework**: Next.js 14 (Pages Router)
- **Despliegue**: Vercel
- **Storage**: Vercel KV (Redis)
- **IA Generación**: Anthropic Claude API (@anthropic-ai/sdk)
- **Imágenes**: OpenAI gpt-image-1
- **Datos SEO**: Google Search Console (Service Account)
- **E-commerce**: Prestashop API (catálogo productos)
- **Keywords**: Google Sheets API

## Comandos Disponibles

Todos los comandos están en `.claude/commands/` y se invocan como slash commands:

### Investigación
- `/research [tema]` — Investigación SEO completa: keywords, competencia, gaps, brief
- `/cluster [tema]` — Estrategia de cluster temático: pillar page + artículos soporte + mapa de enlaces
- `/priorities` — Matriz de priorización de contenido basada en datos GSC
- `/research-serp [tema]` — Análisis SERP para un tema específico

### Creación
- `/write [tema]` — Crear artículo completo optimizado para SEO (2000+ palabras)
- `/article [tema]` — Pipeline completo: research → plan → escritura → optimización
- `/rewrite [tema]` — Actualizar y mejorar contenido existente

### Optimización
- `/optimize [archivo]` — Revisión SEO final antes de publicación
- `/analyze-existing [URL]` — Auditoría de contenido existente
- `/scrub [archivo]` — Limpiar marcas invisibles de IA del contenido
- `/performance-review` — Análisis de rendimiento con datos de analytics

### Planificación
- `/content-calendar [posts/semana]` — Calendario editorial mensual

## Arquitectura: Modelo Command → Agent

**Comandos** (`.claude/commands/`) orquestan workflows completos.
**Agentes** (`.claude/agents/`) son roles especializados invocados por los comandos.

Después de `/write`, estos agentes se ejecutan automáticamente:
1. **SEO Optimizer** — Optimización SEO del contenido
2. **Meta Creator** — Genera opciones de meta título y descripción
3. **Internal Linker** — Recomienda enlaces internos a ferrolan.es
4. **Keyword Mapper** — Analiza distribución y densidad de keywords

Otros agentes disponibles:
- `content-analyzer.md` — Análisis integral del contenido con módulos de evaluación
- `editor.md` — Edición y mejora de estilo humano (con scoring JSON automatizado)
- `headline-generator.md` — Generación de titulares con 10 fórmulas y scoring
- `cluster-strategist.md` — Estrategia de clusters temáticos pillar/spoke
- `cro-analyst.md` — Análisis de conversión con psicología de persuasión
- `performance.md` — Análisis de rendimiento basado en datos GSC
- `landing-page-optimizer.md` — Optimización de landing pages con framework CRO

## Skills de Marketing

**Skills** (`.claude/skills/`) proporcionan capacidades especializadas de marketing:

### Estrategia y Análisis
- `growth-lead.md` — Asesor senior de crecimiento para retail de construcción
- `content-strategy.md` — Planificación de estrategia de contenido y clusters
- `marketing-psychology.md` — 50+ modelos mentales aplicados al marketing
- `marketing-ideas.md` — 78+ ideas de marketing para distribuidores de materiales
- `competitor-alternatives.md` — Páginas de comparación con competidores

### Creación y Edición
- `copywriting.md` — Copywriting para páginas de ferrolan.es
- `copy-editing.md` — Edición con framework de Siete Barridos

### SEO Técnico
- `seo-audit.md` — Auditoría SEO completa del sitio
- `schema-markup.md` — Datos estructurados JSON-LD para las 4 tiendas
- `programmatic-seo.md` — SEO programático para catálogo de productos

### Medición
- `analytics-tracking.md` — Implementación de GA4, GTM y plan de tracking

## Integraciones de Datos

### Google Search Console (ya configurado)
- Variables: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GSC_SITE_URL`
- Endpoint: `/api/gsc-data` — Rankings, impresiones, clics por página y keyword
- Usado por: `/priorities`, `/performance-review`

### Prestashop (ya configurado)
- Variables: `PRESTASHOP_API_KEY`, `PRESTASHOP_API_URL`
- Endpoint: `/api/keywords-data` — Datos de catálogo de productos
- Usado por: contexto de productos en artículos

### Vercel KV (ya configurado)
- Almacena historial de artículos generados
- Índice: `articles:index` → lista de IDs
- Registros: `article:{timestamp}` → metadatos del artículo

## Archivos de Contexto

`context/` contiene las guías de marca que informan toda la generación de contenido:

- `brand-voice.md` — Tono, pilares de mensaje, voz de Ferrolan
- `style-guide.md` — Gramática, formato, convenciones editoriales
- `seo-guidelines.md` — Reglas de keywords, estructura, meta elementos
- `internal-links-map.md` — Páginas clave de ferrolan.es para enlazar
- `competitor-analysis.md` — Inteligencia competitiva del sector
- `target-keywords.md` — Keywords objetivo por cluster temático

## Pipeline de Contenido

El flujo de trabajo es:

1. **Investigación**: `/research [tema]` o `/cluster [tema]`
2. **Creación**: `/write [tema]` o `/article [tema]`
3. **Optimización**: Agentes automáticos (SEO, meta, links, keywords)
4. **Revisión**: `/optimize [archivo]` para pulido final
5. **Publicación**: Dashboard web → `/api/publish-now` o programación

## Secciones del Blog de Ferrolan

1. **Inspiración e ideas** → Baño, Cocinas, Cerámica y parquet, Espacios exteriores
2. **Aprende con nosotros** → Consejos, Guía paso a paso, Soluciones constructivas
3. **Noticias** → Nuevos productos, Sector, Eventos

## Reglas Editoriales Críticas

- El blog es un recurso informativo útil, NO un catálogo de ventas
- PROHIBIDO: "no esperes más", "consíguelo ahora", "el mejor precio", "oferta"
- Ferrolan es el contexto, no el protagonista
- Las menciones a Ferrolan deben sentirse como recomendación honesta al final
- Los enlaces internos se integran de forma natural, nunca como botones de compra
- CTA final: invitar a explorar, consultar o visitar — nunca a comprar
- Tono: experto, cercano y didáctico
- Longitud artículos estándar: 700-1.100 palabras (blog)
- Longitud artículos SEO profundos: 1.500-3.000 palabras (vía comandos)

## Desarrollo

```bash
npm run dev    # Servidor de desarrollo
npm run build  # Build de producción
```

Variables de entorno necesarias: ver `.env.example`
