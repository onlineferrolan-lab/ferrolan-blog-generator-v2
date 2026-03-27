import { callAI } from "../../lib/ai-client";

// ─── SEO Analyze API ──────────────────────────────────────────────────────────
// Analiza un artículo generado y devuelve un informe SEO estructurado.

const SEO_SYSTEM_PROMPT = `Eres un especialista senior en SEO para contenido de construcción, reforma del hogar, cerámica, baño, cocina, parquet, ferretería y jardinería en España.

Analiza el artículo del blog de Ferrolan (distribuidor de materiales de construcción con tiendas en Barcelona, Rubí, Badalona y Santa Coloma de Gramenet) y devuelve un informe SEO accionable.

El blog de Ferrolan es informativo y didáctico — NO un catálogo de ventas. Tono: experto, cercano, didáctico.

REGLAS DE ANÁLISIS:
- Keyword principal en H1, primeras 100 palabras, al menos 2 H2, último párrafo
- Densidad keyword principal: 1-2% (natural)
- Longitud ideal: 700-1100 palabras (blog estándar), 1500-3000 (SEO profundo)
- H1: único, max 60 caracteres
- H2: 3-5 secciones con keywords semánticas
- Párrafos cortos (3-5 líneas), frases directas
- Sin frases prohibidas: "no esperes más", "consíguelo ahora", "el mejor precio", "oferta"
- CTA final: invitar a explorar/consultar/visitar, nunca a comprar

IMPORTANTE: Responde ÚNICAMENTE con un JSON válido, sin markdown, sin explicaciones. Solo el JSON puro.

Estructura exacta:
{
  "score": número entre 0 y 100,
  "scoreLabel": "Excelente | Bueno | Mejorable | Deficiente",
  "wordCount": número aproximado de palabras del artículo,
  "keywordDensity": "X.X%",
  "issues": [
    { "type": "error | warning | info", "text": "descripción del problema" }
  ],
  "quickFixes": [
    "acción concreta 1",
    "acción concreta 2"
  ],
  "headingStructure": {
    "h1Count": número,
    "h2Count": número,
    "h3Count": número,
    "h1Text": "texto del H1 si existe"
  },
  "strengths": ["punto fuerte 1", "punto fuerte 2"],
  "suggestedSlug": "slug-url-sugerido-sin-tildes"
}`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { articulo, tema, keywords, provider = "anthropic" } = req.body;

  if (!articulo) {
    return res.status(400).json({ error: "El artículo es obligatorio para analizar." });
  }

  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY no configurada en el servidor" });
  }
  if (provider !== "openai" && !process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada en el servidor" });
  }

  const userPrompt = `Analiza el siguiente artículo para SEO:

**Tema:** ${tema || "No especificado"}
**Keywords objetivo:** ${keywords || "No especificadas"}

**Artículo:**
${articulo.slice(0, 4000)}${articulo.length > 4000 ? "\n\n[... artículo truncado para análisis ...]" : ""}

Devuelve el informe SEO en formato JSON.`;

  try {
    const text = await callAI({ provider, tier: "fast", systemPrompt: SEO_SYSTEM_PROMPT, userPrompt, maxTokens: 1024 });
    const cleaned = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
    const data = JSON.parse(cleaned);

    return res.status(200).json(data);
  } catch (err) {
    console.error("SEO Analyze API error:", err);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: "Error al procesar el análisis SEO. Inténtalo de nuevo." });
    }
    return res.status(500).json({ error: "Error al analizar el artículo. Inténtalo de nuevo." });
  }
}
