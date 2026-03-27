import { kv } from "@vercel/kv";
import { callAI } from "../../lib/ai-client";
import { extractSlug, extractTitle } from "../../lib/article-utils";
import { loadGenerationContext, buildContextBlock } from "../../lib/context-loader";

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
    // Guardamos el registro individual
    await kv.set(id, JSON.stringify(entry));
    // Añadimos el id al índice general (lista ordenada por fecha)
    await kv.lpush("articles:index", id);
    return entry;
  } catch (err) {
    // Si KV falla no rompemos la generación, solo logueamos
    console.error("KV save error:", err);
    return null;
  }
}

// Recupera todos los artículos del índice para pasarlos al prompt
async function getArticleHistory() {
  try {
    const ids = await kv.lrange("articles:index", 0, -1); // todos
    if (!ids || ids.length === 0) return [];
    const records = await Promise.all(ids.map((id) => kv.get(id)));
    return records
      .filter(Boolean)
      .map((r) => (typeof r === "string" ? JSON.parse(r) : r))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // más recientes primero
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

// Construye el system prompt completo:
// 1. Rol + intro
// 2. Documentos de contexto reales (brand-voice, seo, links, style)
// 3. Estructura y adaptaciones
// 4. Historial de artículos publicados (anti-duplicados)
function buildSystemPrompt(history, contextBlock) {
  const parts = [ROLE_INTRO];

  if (contextBlock) {
    parts.push(`\n\n# DOCUMENTOS DE REFERENCIA OBLIGATORIA\n\n${contextBlock}`);
  }

  parts.push(SECTIONS_AND_STRUCTURE);

  if (history && history.length > 0) {
    const historialTexto = history
      .map((a, i) => `${i + 1}. [${a.fecha}] "${a.titulo}" — Categoría: ${a.categoria}${a.slug ? ` — Slug: ${a.slug}` : ""}`)
      .join("\n");

    parts.push(`\n\nHISTORIAL DE ARTÍCULOS YA PUBLICADOS — MUY IMPORTANTE:
A continuación se listan todos los artículos que ya existen en el blog. Debes tenerlos en cuenta para:
1. NO repetir temas ya cubiertos — aborda el tema desde un ángulo diferente o más específico.
2. NO repetir el mismo enfoque o estructura que artículos previos de la misma categoría.
3. Puedes hacer referencias internas a artículos existentes usando el slug como ruta del enlace.

ARTÍCULOS EXISTENTES (${history.length} en total):
${historialTexto}

Teniendo en cuenta este historial, genera el nuevo artículo con un enfoque fresco y diferenciado.`);
  }

  return parts.join("");
}

// ─── Handler principal ───────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tema, categoria, keywords, tono, contexto, researchData, publico, longitud, intencion, urlProducto, provider = "anthropic" } = req.body;

  if (!tema || !categoria) {
    return res.status(400).json({ error: "Tema y categoría son obligatorios" });
  }

  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY no configurada en el servidor" });
  }
  if (provider !== "openai" && !process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada en el servidor" });
  }

  // 1. Recuperar historial de KV (no bloquea si falla)
  const history = await getArticleHistory();

  // 2. Cargar contexto de marca desde /context/ e inyectarlo en el system prompt
  const contextFiles = loadGenerationContext();
  const contextBlock = buildContextBlock(contextFiles);
  const systemPrompt = buildSystemPrompt(history, contextBlock);

  const userPrompt = `Escribe un artículo de blog para Ferrolan con las siguientes características:

**Tema:** ${tema}
**Categoría:** ${categoria}
**Público objetivo:** ${publico || "General"}
**Intención de búsqueda:** ${intencion || "Informativa"}
**Longitud:** ${longitud ? (longitud === "Corto" ? "~600 palabras" : longitud === "Estándar" ? "~900 palabras" : "~1200 palabras") : "~900 palabras"}
**Tono:** ${tono || "Informativo / Educativo"}
**Keywords SEO a incluir:** ${keywords || "los que consideres más relevantes para el tema"}
${contexto ? `**Contexto e idea concreta del artículo:** ${contexto}` : ""}
${urlProducto ? `**URL de producto a referenciar:** ${urlProducto}` : ""}
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
    const text = await callAI({ provider, tier: "main", systemPrompt, userPrompt, maxTokens: 2048 });

    return res.status(200).json({
      articulo: text,
      historialCount: history.length,
    });
  } catch (err) {
    console.error("AI generation error:", err);
    return res.status(500).json({ error: "Error al generar el artículo. Inténtalo de nuevo." });
  }
}
