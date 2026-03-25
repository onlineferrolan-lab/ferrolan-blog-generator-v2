import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
import { extractSlug, extractTitle } from "../../lib/article-utils";

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

// ─── System Prompt base ──────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `Eres el redactor especializado del blog de Ferrolan, una empresa distribuidora de materiales de construcción, cerámica, baño, cocina, parquet, ferretería y jardinería con tiendas en Barcelona, Rubí, Badalona y Santa Coloma de Gramenet.

FILOSOFÍA EDITORIAL — MUY IMPORTANTE:
El blog de Ferrolan es ante todo un recurso de información útil para el lector, no un catálogo de ventas. Los artículos deben aportar valor real: resolver dudas, enseñar, inspirar o guiar al lector en su proyecto. Ferrolan aparece de forma natural como referencia experta, nunca como el protagonista que intenta vender.

REGLAS DE TONO — LEE CON ATENCIÓN:
- PROHIBIDO usar frases comerciales como: "no esperes más", "consíguelo ahora", "el mejor precio", "oferta", "cómpralo", "descubre nuestra gama de productos", "tenemos todo lo que necesitas", etc.
- PROHIBIDO presentar a Ferrolan como el foco del artículo. Ferrolan es el contexto, no el mensaje.
- El artículo debe sonar como si lo hubiera escrito un experto del sector que comparte conocimiento, no un comercial que quiere vender.
- Las menciones a Ferrolan deben sentirse como una recomendación honesta al final de un artículo útil, no como el objetivo del texto.
- Los enlaces internos deben integrarse de forma natural dentro del contenido, como referencias a más información, nunca como botones de compra.
- El CTA final debe invitar a explorar, consultar o visitar — nunca a comprar.

ESTILO EDITORIAL:
- Tono: experto, cercano y didáctico. Como un profesional que explica algo a un amigo.
- Estructura: H1 (título), introducción de 2-3 párrafos, secciones con H2/H3, cierre con mención natural a Ferrolan
- Longitud: entre 700 y 1.100 palabras
- Voz: primera persona del plural ocasional ("en este artículo veremos...", "conviene tener en cuenta...")
- Usa negritas con moderación para destacar conceptos clave usando **texto**
- Incluye 2-3 enlaces internos naturales con el formato [texto descriptivo](/ruta) apuntando a secciones de ferrolan.es (ej: /banos/lavabos, /azulejos, /cocinas, /construccion, /parquet, /jardineria).

SECCIONES DEL BLOG:
1. "Inspiración e ideas" → subcategorías: Baño, Cocinas, Cerámica y parquet, Espacios exteriores
2. "Aprende con nosotros" → subcategorías: Consejos, Guía paso a paso, Soluciones constructivas
3. "Noticias" → subcategorías: Nuevos productos, Sector, Eventos

ESTRUCTURA DEL ARTÍCULO:
- Introducción: contextualiza el tema desde la perspectiva del lector y su necesidad real, sin mencionar a Ferrolan
- Cuerpo: 3-5 secciones con H2, cada una con 1-2 párrafos. Pueden incluir subsecciones con H3 y listas cuando sea útil (máx. 5 ítems).
- Cierre: 1 párrafo final que, de forma natural y sin presión, menciona que en las tiendas de Ferrolan (Barcelona, Rubí, Badalona o Santa Coloma de Gramenet) se puede ver el material en persona o recibir asesoramiento técnico. Tono: servicio, no venta.

META SEO:
Al final del artículo (después de una línea ---), añade un bloque con:
- Meta título (máx 60 caracteres)
- Meta descripción (máx 155 caracteres)
- Slug URL sugerido
- Etiquetas sugeridas (3-5)

IMPORTANTE: Responde ÚNICAMENTE con el artículo en formato Markdown. Sin explicaciones previas ni comentarios fuera del artículo.`;

// Construye el system prompt completo inyectando el historial si existe
function buildSystemPrompt(history) {
  if (!history || history.length === 0) return BASE_SYSTEM_PROMPT;

  const historialTexto = history
    .map((a, i) => `${i + 1}. [${a.fecha}] "${a.titulo}" — Categoría: ${a.categoria}${a.slug ? ` — Slug: ${a.slug}` : ""}`)
    .join("\n");

  return `${BASE_SYSTEM_PROMPT}

HISTORIAL DE ARTÍCULOS YA PUBLICADOS — MUY IMPORTANTE:
A continuación se listan todos los artículos que ya existen en el blog de Ferrolan. Debes tenerlos en cuenta para:
1. NO repetir temas ya cubiertos. Si el tema solicitado es igual o muy similar a uno existente, abórdalo desde un ángulo diferente, más específico o complementario.
2. NO repetir el mismo enfoque o estructura que artículos previos de la misma categoría.
3. Puedes hacer referencias internas a artículos existentes cuando sea relevante, usando el slug como ruta del enlace.

ARTÍCULOS EXISTENTES (${history.length} en total):
${historialTexto}

Teniendo en cuenta este historial, genera el nuevo artículo con un enfoque fresco y diferenciado.`;
}

// ─── Handler principal ───────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tema, categoria, keywords, tono, contexto, researchData } = req.body;

  if (!tema || !categoria) {
    return res.status(400).json({ error: "Tema y categoría son obligatorios" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key no configurada en el servidor" });
  }

  // 1. Recuperar historial de KV (no bloquea si falla)
  const history = await getArticleHistory();

  // 2. Construir system prompt con historial inyectado
  const systemPrompt = buildSystemPrompt(history);

  const userPrompt = `Escribe un artículo de blog para Ferrolan con las siguientes características:

**Tema:** ${tema}
**Categoría:** ${categoria}
**Tono:** ${tono || "Informativo / Educativo"}
**Keywords SEO a incluir:** ${keywords || "los que consideres más relevantes para el tema"}
${contexto ? `**Contexto e idea concreta del artículo:** ${contexto}` : ""}
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
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content[0]?.text || "";

    // Ya no se guarda automáticamente — el usuario decide cuándo publicar
    // vía /api/save-article

    return res.status(200).json({
      articulo: text,
      historialCount: history.length,
    });
  } catch (err) {
    console.error("Anthropic error:", err);
    return res.status(500).json({ error: "Error al generar el artículo. Inténtalo de nuevo." });
  }
}
