# Ferrolan Blog Generator

Generador de contenido SEO para el blog de [ferrolan.es](https://ferrolan.es). Dashboard interno (Next.js en Vercel) que investiga temas, genera artículos con IA en streaming, los enriquece con agentes especializados (enlaces internos, titulares, keywords, CRO), genera imágenes, y los programa o publica directamente en WordPress.

## Stack

- **Next.js 14** (Pages Router) desplegado en **Vercel**
- **Vercel KV** (Redis/Upstash) — historial de artículos, programados, caché
- **Anthropic Claude** (generación; tiers main/analysis/fast con prompt caching) y **OpenAI** (alternativa de chat + imágenes `gpt-image-1`)
- **Google Search Console** (datos SEO en vivo) y **Google Sheets** (calendario del departamento) vía Service Account
- **WordPress REST API** (publicación + media library) y **Prestashop webservice** (catálogo)
- **SWR** (estado de servidor en cliente) · **Vitest** (tests)

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellenar credenciales
npm run dev                  # http://localhost:3000
npm test                     # suite de tests (Vitest)
npm run build                # build de producción
```

Variables de entorno: ver [.env.example](.env.example). Las imprescindibles:

| Variable | Para qué |
|---|---|
| `AUTH_PASSWORD` | Acceso a la app. **Sin ella, en producción se deniega todo** (fail-closed). |
| `CRON_SECRET` | **Obligatoria** para la autopublicación (`/api/cron/publish`). Vercel la envía como Bearer automáticamente. |
| `ANTHROPIC_API_KEY` | Generación de artículos y agentes. |
| `OPENAI_API_KEY` | Imágenes (gpt-image-1) y proveedor alternativo de chat. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel KV (se configuran al vincular el store). |

Opcionales: `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` + `GSC_SITE_URL` (GSC en vivo y panel de rendimiento), `GOOGLE_SHEETS_ID` (programación), `KEYWORDS_SHEET_ID`, `PRESTASHOP_API_KEY` + `PRESTASHOP_API_URL`, `WORDPRESS_URL` + `WORDPRESS_USER` + `WORDPRESS_APP_PASSWORD`, y para el resumen quincenal por email: `SMTP_USER` + `SMTP_PASS` (+ `SMTP_HOST`/`SMTP_PORT` y `DIGEST_EMAIL_FROM` opcionales) + `DIGEST_EMAIL_TO`.

## Arquitectura

```
pages/index.js          Orquestador del dashboard (estado del artículo + composición)
pages/login.js          Login (cookie HttpOnly, token SHA-256)
middleware.js           Auth de toda la app (fail-closed en producción)
pages/api/              Endpoints: generate (SSE streaming), research, enhance-article
                        (5 agentes en paralelo), generate-images (por unidad),
                        seo-analyze, meta-create, fix-keywords, keyword-mapper,
                        gsc-data, keywords-data, evergreen-analysis, performance,
                        publish-now, schedule-article, scheduled, articles,
                        save-article, sync-blog-posts, check-keyword,
                        wp-categories, prestashop-categories, cron/publish
components/             Paneles de UI (Opportunities, Evergreen, SEO, Enhance,
                        EditorialCalendar, PerformancePanel, editor markdown...)
hooks/useDashboardData  Datos de servidor con SWR
lib/                    Núcleo compartido:
  ai-client.js            callAI/callAIStream (tiers, prompt caching, usage)
  ai-cost.js              tabla de precios + estimación de coste
  llm-json.js             parser robusto de respuestas JSON de LLM
  article-store.js        acceso a KV (hash de metadatos, sin N+1)
  article-editor.js       manipulación del markdown del artículo (puro)
  article-utils.js        extractores del bloque meta SEO
  coverage.js             detección de temas ya cubiertos (anti-canibalización)
  keyword-utils.js        normalización/matching de keywords en español
  markdown-to-html.js     markdown → HTML para WordPress (con imágenes)
  markdown-preview.js     markdown → HTML para el preview del dashboard
  wp-media.js             subida de imágenes base64 a la media library de WP
  google-auth.js          JWT de Service Account compartido
  prestashop.js           fetch del catálogo compartido
  edge-auth.js            lógica de auth del middleware (Edge-safe, testeada)
  cron-auth.js            verificación CRON_SECRET (obligatorio)
  validate.js             validación de inputs de la API
context/                Guías de marca inyectadas en los prompts
.claude/                Agentes, comandos y skills para Claude Code; los .md de
                        agents/ se cargan también en runtime como system prompts
tests/                  Vitest — 100 tests de lib/
```

## Flujo de publicación

1. **Idea**: paneles de oportunidades (GSC + Prestashop + evergreen) o tema manual; verificador de canibalización.
2. **Investigación** (opcional): análisis competitivo con Claude.
3. **Generación**: streaming SSE — el artículo aparece según se escribe; coste estimado por generación visible.
4. **Mejora**: 5 agentes en paralelo (enlaces internos, titulares, keywords + autofix, CRO, landing) + análisis SEO + metas.
5. **Imágenes**: 4 imágenes IA (prompts con Haiku, render con gpt-image-1), drag & drop al artículo.
6. **Salida**: guardar en historial · programar (Google Sheets + cron diario 9:00) · borrador en WordPress. Al publicar, las imágenes embebidas se suben a la media library de WP automáticamente.
7. **Seguimiento**: calendario editorial + panel de rendimiento (clics/posición reales por artículo publicado).

## Notas operativas

- El cron de autopublicación corre a diario a las 9:00 ([vercel.json](vercel.json)). **Requiere `CRON_SECRET`**: sin él, el endpoint responde 503 y no publica.
- El **resumen quincenal** (`/api/cron/article-digest`, días 1 y 16 a las 8:00) genera 2 propuestas de artículo + informe de metadatos/keywords y las envía por email (SMTP). Requiere `CRON_SECRET` + `SMTP_USER`/`SMTP_PASS` + `DIGEST_EMAIL_TO`; sin email configurado responde 503. Lógica de generación compartida con el dashboard en [lib/article-generator.js](lib/article-generator.js).
- Acceso a KV centralizado en [lib/kv.js](lib/kv.js) (cliente `@upstash/redis` que lee las variables `KV_REST_API_URL` / `KV_REST_API_TOKEN` ya existentes — mismo store, sin cambios en Vercel). Se migró desde el `@vercel/kv` deprecado.
- `npm audit`: las advisories restantes de `next` requieren saltar a Next 16 (breaking) y afectan a App Router/self-hosted, que este proyecto no usa.
- Precios de los modelos para el medidor de coste: [lib/ai-cost.js](lib/ai-cost.js) (actualizar la tabla cuando cambien las tarifas).
