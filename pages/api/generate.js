import { callAI } from "../../lib/ai-client";
import { extractSlug, extractTitle } from "../../lib/article-utils";
import { getArticlesMeta, saveArticleRecord } from "../../lib/article-store";
import { loadGenerationContext, buildContextBlock } from "../../lib/context-loader";
import { validateBody, MAX } from "../../lib/validate";

// La generación con el modelo principal puede tardar más de un minuto
export const config = { maxDuration: 60 };

// ─── Helpers KV ─────────────────────────────────────────────────────────────

// Guarda el artículo en KV después de generarlo
async function saveArticle(tema, categoria, text) {
  try {
    const id = `article:${Date.now()}`;
    const entry = {
      id,
      tema,
      categoria,
      titulo: extractTitle(text) || tema,
      slug: extractSlug(text),
      fecha: new Date().toISOString().split("T")[0], // YYYY-MM-DD
    };
    await saveArticleRecord(entry);
    return entry;
  } catch (err) {
    // Si KV falla no rompemos la generación, solo logueamos
    console.error("KV save error:", err);
    return null;
  }
}

// Recupera los metadatos del historial para el prompt (un solo comando KV)
async function getArticleHistory() {
  try {
    const metas = await getArticlesMeta();
    return metas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // más recientes primero
  } catch (err) {
    console.error("KV fetch error:", err);
    return [];
  }
}

// ─── System Prompt ────────────────────────────────────────────────────────────
// Construido dinámicamente inyectando los archivos de contexto reales de /context/

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
const HISTORY_PROMPT_LIMIT = 100;

// Bloque ESTÁTICO del system prompt: rol + documentos de contexto + estructura.
// Es idéntico entre llamadas → se marca cacheable (prompt caching de Anthropic).
function buildStaticSystemBlock(contextBlock) {
  const parts = [ROLE_INTRO];
  if (contextBlock) {
    parts.push(`\n\n# DOCUMENTOS DE REFERENCIA OBLIGATORIA\n\n${contextBlock}`);
  }
  parts.push(SECTIONS_AND_STRUCTURE);
  return parts.join("");
}

// Bloque VARIABLE: historial de artículos publicados (anti-duplicados).
// Limitado a los más recientes — los antiguos aportan poco para evitar repetir.
function buildHistoryBlock(history) {
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

// ─── Handler principal ───────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const validationError = validateBody(req.body, {
    tema: { required: true, max: MAX.tema },
    categoria: { required: true, max: MAX.corto },
    keywords: { max: MAX.keywords },
    tono: { max: MAX.corto },
    contexto: { max: MAX.contexto },
    publico: { max: MAX.corto },
    longitud: { max: MAX.corto },
    intencion: { max: MAX.corto },
  });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { tema, categoria, keywords, tono, contexto, researchData, publico, longitud, intencion, urlCategoriaPrestashop, nombreCategoriaPrestashop, provider = "anthropic" } = req.body;

  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY no configurada en el servidor" });
  }
  if (provider !== "openai" && !process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada en el servidor" });
  }

  // 1. Recuperar historial de KV (no bloquea si falla)
  const history = await getArticleHistory();

  // 2. Cargar contexto de marca desde /context/ e inyectarlo en el system prompt.
  // El bloque estático (rol + contexto + estructura) va cacheado; el historial
  // cambia con cada artículo guardado y va en un bloque aparte sin cachear.
  const contextFiles = loadGenerationContext();
  const contextBlock = buildContextBlock(contextFiles);
  const historyBlock = buildHistoryBlock(history);
  const systemPrompt = [
    { text: buildStaticSystemBlock(contextBlock), cache: true },
    ...(historyBlock ? [{ text: historyBlock }] : []),
  ];

  const userPrompt = `Escribe un artículo de blog para Ferrolan con las siguientes características:

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

  try {
    // 4096 tokens: un artículo "Largo" (~1200 palabras) + bloque meta ronda los
    // 2000-2400 tokens en castellano; con 2048 se truncaba a media frase.
    const text = await callAI({ provider, tier: "main", systemPrompt, userPrompt, maxTokens: 4096 });

    return res.status(200).json({
      articulo: text,
      historialCount: history.length,
    });
  } catch (err) {
    console.error("AI generation error:", err);
    return res.status(500).json({ error: "Error al generar el artículo. Inténtalo de nuevo." });
  }
}
