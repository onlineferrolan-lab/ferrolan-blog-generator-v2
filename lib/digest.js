// ─── lib/digest.js ───────────────────────────────────────────────────────────
// Resumen quincenal: propone temas nuevos (a partir del catálogo Prestashop y
// el historial publicado), genera los artículos completos, calcula un pequeño
// informe de metadatos/keywords y compone el email. Lo usa el cron
// /api/cron/article-digest.

import { callAI } from "./ai-client";
import { parseLLMJson } from "./llm-json";
import { fetchPrestashopCategoriesRaw } from "./prestashop";
import { getArticlesMeta } from "./article-store";
import { loadGenerationContext, buildContextBlock } from "./context-loader";
import { generateArticleMarkdown } from "./article-generator";
import { extractTitle, extractSlug, extractMetaDescription, extractTags } from "./article-utils";
import { markdownToPreviewHtml } from "./markdown-preview";

const BLOG_CATEGORIES = [
  "Baño", "Cocinas", "Cerámica y parquet", "Espacios exteriores",
  "Consejos", "Guía paso a paso", "Soluciones constructivas",
  "Nuevos productos", "Sector", "Eventos",
];

// ─── Propuesta de temas (Claude, tier analysis) ──────────────────────────────
async function proposeTopics(count, history) {
  let catalogo = "";
  try {
    const cats = await fetchPrestashopCategoriesRaw();
    if (cats) {
      catalogo = cats
        .filter((c) => c.name && Number(c.level_depth) >= 2)
        .map((c) => c.name)
        .slice(0, 60)
        .join(", ");
    }
  } catch {
    // sin catálogo seguimos con historial + sectores de marca
  }

  const publicados =
    (history || []).slice(0, 60).map((a) => `- ${a.titulo}`).join("\n") || "(ninguno todavía)";

  const systemPrompt = `Eres un estratega de contenidos SEO para el blog de Ferrolan (materiales de construcción, cerámica, baño, cocina, parquet, ferretería y jardinería; tiendas en Barcelona). Propones temas de artículo frescos, útiles e informativos — el blog NO es un catálogo de ventas. Respondes únicamente con JSON válido.`;

  const userPrompt = `Propón ${count} temas NUEVOS para el blog que NO se solapen con lo ya publicado.
${catalogo ? `\nCATEGORÍAS DEL CATÁLOGO (inspírate en productos reales):\n${catalogo}\n` : ""}
ARTÍCULOS YA PUBLICADOS (NO repitas estos temas ni ángulos):
${publicados}

Para cada tema devuelve estos campos:
- "tema": título de trabajo del artículo
- "categoria": una de estas categorías del blog → ${BLOG_CATEGORIES.join(", ")}
- "keywords": 2-4 keywords SEO separadas por comas
- "publico": "General" | "Particulares / DIY" | "Profesionales" | "Arquitectos / Diseñadores"
- "intencion": "Informativa" | "Comparativa" | "Transaccional" | "Guía técnica"
- "longitud": "Corto" | "Estándar" | "Largo"
- "motivo": en 1 frase, por qué es una buena oportunidad ahora

Responde SOLO con JSON: {"topics":[ ... ]}`;

  const raw = await callAI({ provider: "anthropic", tier: "analysis", systemPrompt, userPrompt, maxTokens: 1024 });
  const data = parseLLMJson(raw);
  return Array.isArray(data.topics) ? data.topics.slice(0, count) : [];
}

// ─── Informe de metadatos/keywords (puro, sin llamadas a la IA) ──────────────
export function buildMetaReport(markdown, topic = {}) {
  const md = typeof markdown === "string" ? markdown : "";
  const cuerpo = md.split(/\n---\n/)[0] || md;
  const palabras = (cuerpo.trim().match(/\S+/g) || []).length;
  const h2 = (cuerpo.match(/^##\s+/gm) || []).length;
  const h3 = (cuerpo.match(/^###\s+/gm) || []).length;
  return {
    titulo: extractTitle(md) || topic.tema || "(sin título)",
    slug: extractSlug(md) || "",
    metaDescripcion: extractMetaDescription(md) || "",
    tags: extractTags(md),
    keywords: topic.keywords || "",
    categoria: topic.categoria || "",
    palabras,
    h2,
    h3,
  };
}

// ─── Construcción del resumen completo ───────────────────────────────────────
export async function buildDigest({ count = 2 } = {}) {
  const history = await getArticlesMeta().catch(() => []);
  const contextBlock = buildContextBlock(loadGenerationContext());

  const topics = await proposeTopics(count, history);
  if (topics.length === 0) throw new Error("No se pudieron proponer temas para el resumen");

  // Generar en paralelo reutilizando historial y contexto ya cargados
  const articles = await Promise.all(
    topics.map(async (topic) => {
      const markdown = await generateArticleMarkdown({ ...topic, history, contextBlock });
      return { topic, markdown, report: buildMetaReport(markdown, topic) };
    })
  );

  return { articles, generatedAt: new Date().toISOString() };
}

// ─── Render del email (puro) ─────────────────────────────────────────────────
const C = { red: "#E31E24", dark: "#1A1A1A", mid: "#4A4A4A", muted: "#888", border: "#E5E5E5", light: "#F8F8F8" };

function chip(text) {
  return `<span style="display:inline-block;background:${C.light};border:1px solid ${C.border};border-radius:4px;padding:2px 8px;font-size:12px;color:${C.mid};margin:0 4px 4px 0">${text}</span>`;
}

function renderArticle(item, i) {
  const r = item.report;
  const bodyHtml = markdownToPreviewHtml(item.markdown);
  const tagsHtml = (r.tags || []).map(chip).join("") || "<span style=\"color:#888;font-size:12px\">—</span>";
  return `
  <div style="margin:0 0 28px;border:1px solid ${C.border};border-radius:12px;overflow:hidden">
    <div style="background:${C.dark};padding:14px 20px">
      <div style="color:#fff;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Propuesta ${i + 1}${r.categoria ? ` · ${r.categoria}` : ""}</div>
      <div style="color:#fff;font-size:18px;font-weight:700;margin-top:4px">${r.titulo}</div>
    </div>
    <div style="padding:16px 20px">
      ${item.topic?.motivo ? `<p style="margin:0 0 14px;color:${C.mid};font-size:14px;font-style:italic">${item.topic.motivo}</p>` : ""}
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:${C.mid};margin-bottom:14px">
        <tr><td style="padding:4px 0;width:130px;color:${C.muted}">Slug</td><td style="padding:4px 0;font-family:monospace">${r.slug || "—"}</td></tr>
        <tr><td style="padding:4px 0;color:${C.muted}">Meta descripción</td><td style="padding:4px 0">${r.metaDescripcion || "—"}</td></tr>
        <tr><td style="padding:4px 0;color:${C.muted}">Keywords</td><td style="padding:4px 0">${r.keywords || "—"}</td></tr>
        <tr><td style="padding:4px 0;color:${C.muted}">Etiquetas</td><td style="padding:4px 0">${tagsHtml}</td></tr>
        <tr><td style="padding:4px 0;color:${C.muted}">Extensión</td><td style="padding:4px 0">${r.palabras} palabras · ${r.h2} H2 · ${r.h3} H3</td></tr>
      </table>
      <div style="border-top:1px solid ${C.border};padding-top:14px;color:${C.dark};font-size:15px;line-height:1.6">
        ${bodyHtml}
      </div>
    </div>
  </div>`;
}

/**
 * Compone el email del resumen. Puro: recibe el digest y devuelve { subject, html, text }.
 */
export function renderDigestEmail(digest) {
  const fecha = new Date(digest.generatedAt || Date.now()).toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });
  const n = digest.articles.length;
  const subject = `Ferrolan · ${n} propuesta${n !== 1 ? "s" : ""} de artículo para el blog (${fecha})`;

  const articlesHtml = digest.articles.map(renderArticle).join("");

  const html = `<!DOCTYPE html><html><body style="margin:0;background:#f3f3f3;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:680px;margin:0 auto;padding:24px 16px">
    <div style="border-bottom:3px solid ${C.red};padding-bottom:12px;margin-bottom:20px">
      <div style="font-size:20px;font-weight:800;color:${C.dark}">Propuestas de artículo · Blog Ferrolan</div>
      <div style="font-size:13px;color:${C.muted};margin-top:4px">Resumen quincenal · ${fecha} · ${n} propuesta${n !== 1 ? "s" : ""} generada${n !== 1 ? "s" : ""} con IA</div>
    </div>
    ${articlesHtml}
    <p style="font-size:12px;color:${C.muted};line-height:1.5;margin-top:24px">
      Borradores generados automáticamente como propuestas — revísalos en el generador antes de publicar.
      Los temas se han elegido evitando los ya cubiertos en el blog.
    </p>
  </div></body></html>`;

  const text = digest.articles
    .map((it, i) => `PROPUESTA ${i + 1}: ${it.report.titulo}\nCategoría: ${it.report.categoria}\nKeywords: ${it.report.keywords}\nSlug: ${it.report.slug}\nMeta: ${it.report.metaDescripcion}\nExtensión: ${it.report.palabras} palabras\n\n${it.markdown}\n\n${"─".repeat(40)}\n`)
    .join("\n");

  return { subject, html, text };
}
