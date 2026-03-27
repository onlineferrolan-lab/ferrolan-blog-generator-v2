import { callAI } from "../../lib/ai-client";

// ─── Research API ─────────────────────────────────────────────────────────────
// Analiza el panorama competitivo para un tema dado usando Claude.
// Devuelve insights estructurados para informar la generación del artículo.

const RESEARCH_SYSTEM_PROMPT = `Eres un analista SEO experto en el sector de la construcción, reforma del hogar, cerámica, baño, cocina, parquet, ferretería y jardinería en España.

Tu tarea es analizar un tema propuesto para un artículo de blog y devolver un análisis competitivo estructurado que ayude a crear contenido diferenciado y de alto rendimiento SEO.

Analiza desde tu conocimiento:
1. Qué secciones (H2) suelen tener los artículos top de Google para este tema
2. Qué formato de contenido domina (guía, listicle, comparativa, how-to)
3. Qué gaps de contenido existen (subtemas que se cubren poco o mal)
4. Qué preguntas relacionadas busca la gente (tipo "People Also Ask")
5. Qué ángulo único podría tomar Ferrolan como distribuidor especializado con tiendas físicas en Barcelona
6. Qué keywords semánticas adicionales deberían incluirse

Contexto de Ferrolan: distribuidor de materiales de construcción con tiendas en Barcelona, Rubí, Badalona y Santa Coloma de Gramenet. Su blog es informativo y didáctico, NO un catálogo de ventas.

IMPORTANTE: Responde ÚNICAMENTE con un JSON válido, sin markdown, sin explicaciones, sin bloques de código. Solo el JSON puro.

Estructura exacta del JSON:
{
  "competitorInsights": {
    "commonSections": ["array de 5-8 títulos H2 que suelen usar los competidores"],
    "averageWordCount": "rango estimado ej: 1200-1800",
    "contentFormat": "guide | listicle | comparison | how-to | mixed"
  },
  "gaps": ["array de 3-5 gaps de contenido que los competidores no cubren bien"],
  "peopleAlsoAsk": ["array de 4-6 preguntas frecuentes relacionadas que busca la gente"],
  "suggestedAngle": "string de 2-3 frases describiendo el ángulo único recomendado para Ferrolan",
  "additionalKeywords": ["array de 6-10 keywords semánticas/LSI adicionales"],
  "briefSummary": "resumen de 2-3 frases sintetizando los hallazgos principales"
}`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tema, categoria, keywords, contexto, provider = "anthropic" } = req.body;

  if (!tema) {
    return res.status(400).json({ error: "El tema es obligatorio para investigar." });
  }

  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY no configurada en el servidor" });
  }
  if (provider !== "openai" && !process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada en el servidor" });
  }

  const userPrompt = `Analiza el siguiente tema para un artículo de blog de Ferrolan:

**Tema:** ${tema}
${categoria ? `**Categoría del blog:** ${categoria}` : ""}
${keywords ? `**Keywords SEO iniciales:** ${keywords}` : ""}
${contexto ? `**Contexto/idea del autor:** ${contexto}` : ""}

Devuelve el análisis competitivo en formato JSON.`;

  try {
    const text = await callAI({ provider, tier: "analysis", systemPrompt: RESEARCH_SYSTEM_PROMPT, userPrompt, maxTokens: 1024 });

    // Parse JSON response — limpiar por si Claude envuelve en markdown
    const cleaned = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
    const data = JSON.parse(cleaned);

    return res.status(200).json(data);
  } catch (err) {
    console.error("Research API error:", err);

    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: "Error al procesar la investigación. Inténtalo de nuevo." });
    }

    const msg = err?.message || err?.error?.message || "Error desconocido";
    return res.status(500).json({ error: `Error al investigar: ${msg}` });
  }
}
