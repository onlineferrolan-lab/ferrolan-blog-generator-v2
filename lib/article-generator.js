// ─── lib/article-generator.js ────────────────────────────────────────────────
// Construcción del prompt de generación de artículos y generación completa.
// Compartido entre /api/generate (streaming en el dashboard) y el cron del
// resumen quincenal (/api/cron/article-digest), para no duplicar el prompt.

import { callAI } from "./ai-client";
import { loadGenerationContext, buildContextBlock } from "./context-loader";
import { getArticlesMeta } from "./article-store";

const ROLE_INTRO = `Eres el redactor especializado del blog de Ferrolan, una empresa distribuidora de materiales de construcción, cerámica, baño, cocina, parquet, ferretería y jardinería con tiendas en Barcelona, Rubí, Badalona y Santa Coloma de Gramenet.

Tu trabajo es escribir artículos de blog que sigan fielmente la voz de marca, las reglas SEO y las convenciones editoriales de Ferrolan que se definen en los documentos de referencia adjuntos. Léelos con atención — son tu guía obligatoria.`;

const SECTIONS_AND_STRUCTURE = `

SECCIONES DEL BLOG:
1. "Inspiración e ideas" → subcategorías: Baño, Cocinas, Cerámica y parquet, Espacios exteriores
2. "Aprende con nosotros" → subcategorías: Consejos, Guía paso a paso, Soluciones constructivas
3. "Noticias" → subcategorías: Nuevos productos, Sector, Eventos

ADAPTACIÓN POR PÚBLICO OBJETIVO:
- "General": Escribe para cualquiera, nivel principiante, sin asumir conocimiento previo.
- "Particulares / DIY": Enfoque práctico paso a paso, "hazlo tú mismo", consejos de aplicación doméstica.
- "Profesionales": Tono técnico, detalles específicos, normativas, durabilidad, mantenimiento profesional.
- "Arquitectos / Diseñadores": Énfasis en estética, tendencias, combinaciones, posibilidades creativas, inspiración.

ADAPTACIÓN POR INTENCIÓN DE BÚSQUEDA:
- "Informativa": Artículo educativo que responde preguntas, resuelve dudas, enseña conceptos.
- "Comparativa": Contrasta opciones, materiales o soluciones. Usa tablas comparativas, pros/contras.
- "Transaccional": El lector busca comprar o actuar. Incluye guía de selección y dónde encontrarlo. CTA natural.
- "Guía técnica": Paso a paso detallado. Numera los pasos, proporciona medidas/cantidades, trucos prácticos.

META SEO:
Al final del artículo (después de una línea ---), añade un bloque con:
- Meta título (máx 60 caracteres)
- Meta descripción (máx 155 caracteres)
- Slug URL sugerido
- Etiquetas sugeridas (3-5)

IMPORTANTE: Responde ÚNICAMENTE con el artículo en formato Markdown. Sin explicaciones previas ni comentarios.`;

// Máximo de artículos del historial que se inyectan en el prompt.
// Sin límite, el prompt crecía sin tope con la vida del blog (coste + latencia).
export const HISTORY_PROMPT_LIMIT = 100;

// Bloque ESTÁTICO del system prompt: rol + documentos de contexto + estructura.
// Es idéntico entre llamadas → se marca cacheable (prompt caching de Anthropic).
export function buildStaticSystemBlock(contextBlock) {
  const parts = [ROLE_INTRO];
  if (contextBlock) {
    parts.push(`\n\n# DOCUMENTOS DE REFERENCIA OBLIGATORIA\n\n${contextBlock}`);
  }
  parts.push(SECTIONS_AND_STRUCTURE);
  return parts.join("");
}

// Bloque VARIABLE: historial de artículos publicados (anti-duplicados).
// Limitado a los más recientes — los antiguos aportan poco para evitar repetir.
export function buildHistoryBlock(history) {
  if (!history || history.length === 0) return null;

  const shown = history.slice(0, HISTORY_PROMPT_LIMIT);
  const historialTexto = shown
    .map((a, i) => `${i + 1}. [${a.fecha}] "${a.titulo}" — Categoría: ${a.categoria}${a.slug ? ` — Slug: ${a.slug}` : ""}`)
    .join("\n");

  return `HISTORIAL DE ARTÍCULOS YA PUBLICADOS — MUY IMPORTANTE:
A continuación se listan los artículos más recientes del blog. Debes tenerlos en cuenta para:
1. NO repetir temas ya cubiertos — aborda el tema desde un ángulo diferente o más específico.
2. NO repetir el mismo enfoque o estructura que artículos previos de la misma categoría.
3. Puedes hacer referencias internas a artículos existentes usando el slug como ruta del enlace.

ARTÍCULOS EXISTENTES (${shown.length} más recientes de ${history.length} en total):
${historialTexto}

Teniendo en cuenta este historial, genera el nuevo artículo con un enfoque fresco y diferenciado.`;
}

// System prompt como bloques (estático cacheable + historial sin cachear).
export function buildSystemBlocks(contextBlock, history) {
  const historyBlock = buildHistoryBlock(history);
  return [
    { text: buildStaticSystemBlock(contextBlock), cache: true },
    ...(historyBlock ? [{ text: historyBlock }] : []),
  ];
}

// User prompt con todas las características del artículo a generar.
export function buildUserPrompt({
  tema, categoria, keywords, tono, contexto, researchData,
  publico, longitud, intencion, urlCategoriaPrestashop, nombreCategoriaPrestashop,
}) {
  return `Escribe un artículo de blog para Ferrolan con las siguientes características:

**Tema:** ${tema}
**Categoría:** ${categoria}
**Público objetivo:** ${publico || "General"}
**Intención de búsqueda:** ${intencion || "Informativa"}
**Longitud:** ${longitud ? (longitud === "Corto" ? "~600 palabras" : longitud === "Estándar" ? "~900 palabras" : "~1200 palabras") : "~900 palabras"}
**Tono:** ${tono || "Informativo / Educativo"}
**Keywords SEO a incluir:** ${keywords || "los que consideres más relevantes para el tema"}
${contexto ? `**Contexto e idea concreta del artículo:** ${contexto}` : ""}
${urlCategoriaPrestashop ? `**Categoría de producto de Ferrolan:** ${nombreCategoriaPrestashop} — ${urlCategoriaPrestashop}
Incluye una mención o enlace natural a esta categoría cuando sea relevante en el artículo.` : ""}
${researchData ? `
**INVESTIGACIÓN PREVIA DEL TEMA:**
- Secciones que cubren los competidores: ${researchData.competitorInsights?.commonSections?.join(", ") || "No disponible"}
- Formato dominante: ${researchData.competitorInsights?.contentFormat || "No disponible"}
- Gaps de contenido identificados: ${researchData.gaps?.join("; ") || "No disponible"}
- Preguntas frecuentes (PAA): ${researchData.peopleAlsoAsk?.join("; ") || "No disponible"}
- Ángulo recomendado: ${researchData.suggestedAngle || "No disponible"}
- Keywords adicionales: ${researchData.additionalKeywords?.join(", ") || "No disponible"}

IMPORTANTE: Usa esta investigación para crear un artículo que cubra los gaps identificados, responda las preguntas frecuentes y siga el ángulo recomendado. Diferénciate de lo que ya cubre la competencia.` : ""}

Genera el artículo completo siguiendo todas las instrucciones de estilo editorial. Recuerda consultar el historial de artículos existentes para asegurarte de que el enfoque es nuevo y diferenciado.`;
}

/**
 * Genera un artículo completo en markdown (no streaming). Usado por el cron
 * del resumen. Carga contexto e historial si no se le pasan (para reutilizar
 * una sola carga al generar varios artículos seguidos).
 * @returns {Promise<string>} el artículo en markdown
 */
export async function generateArticleMarkdown(opts = {}) {
  const provider = opts.provider || "anthropic";
  const history = opts.history || (await getArticlesMeta().catch(() => []));
  const contextBlock = opts.contextBlock != null
    ? opts.contextBlock
    : buildContextBlock(loadGenerationContext());

  const systemPrompt = buildSystemBlocks(contextBlock, history);
  const userPrompt = buildUserPrompt(opts);

  return callAI({ provider, tier: "main", systemPrompt, userPrompt, maxTokens: 4096 });
}
