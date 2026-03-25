import Anthropic from "@anthropic-ai/sdk";

// ─── Meta Creator API ─────────────────────────────────────────────────────────
// Genera opciones de meta título y descripción para un artículo de Ferrolan.

const META_SYSTEM_PROMPT = `Eres un copywriter de conversión especializado en meta títulos y meta descripciones para SEO en España.

Contexto: Blog de Ferrolan, distribuidor de materiales de construcción con tiendas en Barcelona, Rubí, Badalona y Santa Coloma de Gramenet. Blog informativo y didáctico, NO catálogo de ventas.

REGLAS META TÍTULO:
- Longitud: 50-60 caracteres (máximo absoluto 60)
- Keyword principal: obligatoria, preferiblemente al inicio
- Sin punto final
- Solo primera palabra y nombres propios en mayúscula
- Sin emojis, sin palabras en mayúsculas completas
- Separadores válidos: | — :
- Incluir año 2026 si el tema se beneficia de frescura

REGLAS META DESCRIPCIÓN:
- Longitud: 150-160 caracteres (máximo 160)
- Keyword principal incluida de forma natural
- CTA suave: invitar a leer, descubrir, aprender — nunca a comprar
- Sin comillas dobles, sin emojis
- Primera frase con lo esencial (se trunca a ~120 car en móvil)
- 2-3 frases cortas y claras

PROHIBIDO en ambos: "no esperes más", "consíguelo ahora", "el mejor precio", "oferta", "gratis", "increíble"

Genera 3 opciones variadas usando diferentes enfoques (curiosidad, beneficio concreto, resolución de problema).

IMPORTANTE: Responde ÚNICAMENTE con JSON válido, sin markdown, sin explicaciones. Solo el JSON puro.

Estructura exacta:
{
  "options": [
    {
      "titulo": "meta título opción 1",
      "tituloChars": número de caracteres del título,
      "descripcion": "meta descripción opción 1",
      "descripcionChars": número de caracteres de la descripción,
      "enfoque": "curiosidad | beneficio | problema | autoridad",
      "nota": "breve explicación del enfoque (1 frase)"
    }
  ]
}`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { articulo, tema, keywords } = req.body;

  if (!tema && !articulo) {
    return res.status(400).json({ error: "El tema o el artículo son necesarios para generar metas." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key no configurada en el servidor" });
  }

  // Extract H1 and intro from the article for better meta generation
  const h1Match = articulo?.match(/^#\s+(.+)$/m);
  const h1Text = h1Match ? h1Match[1] : null;
  const intro = articulo?.split("\n\n").slice(0, 3).join("\n\n").slice(0, 500);

  const userPrompt = `Genera 3 opciones de meta título y descripción para:

**Tema:** ${tema || "No especificado"}
**Keywords objetivo:** ${keywords || "No especificadas"}
${h1Text ? `**H1 del artículo:** ${h1Text}` : ""}
${intro ? `**Intro del artículo:**\n${intro}` : ""}

Responde con el JSON de las 3 opciones.`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: META_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content[0]?.text || "";
    const cleaned = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
    const data = JSON.parse(cleaned);

    return res.status(200).json(data);
  } catch (err) {
    console.error("Meta Creator API error:", err);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: "Error al procesar las metas. Inténtalo de nuevo." });
    }
    return res.status(500).json({ error: "Error al generar meta elementos. Inténtalo de nuevo." });
  }
}
