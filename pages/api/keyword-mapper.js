import { callAI } from "../../lib/ai-client";
import fs from "fs";
import path from "path";
import { loadAgentContext } from "../../lib/context-loader";

function readAgentDef(filename) {
  try {
    return fs.readFileSync(path.join(process.cwd(), ".claude", "agents", filename), "utf-8");
  } catch {
    return "";
  }
}

// Endpoint standalone del keyword mapper — usado para refrescar el análisis
// tras corregir el artículo sin tener que re-ejecutar todos los agentes.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { articulo, tema, keywords, provider = "anthropic" } = req.body;
  if (!articulo) return res.status(400).json({ error: "Artículo obligatorio." });

  const ctx = await loadAgentContext();
  const agentDef = readAgentDef("keyword-mapper.md");

  const systemPrompt = `${agentDef}

## REGLAS SEO
${ctx.seoGuidelines}

## INSTRUCCIÓN DE SALIDA
Devuelve ÚNICAMENTE un JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:
{
  "primary_keyword": "keyword principal identificada",
  "word_count": 950,
  "density": {
    "primary": { "count": 12, "percent": "1.26", "status": "ok" },
    "secondary": [
      { "keyword": "keyword secundaria", "count": 5, "percent": "0.53", "status": "ok" }
    ]
  },
  "locations": {
    "h1": true,
    "first_100_words": true,
    "h2_count": 3,
    "last_paragraph": true,
    "meta_title": true,
    "meta_description": true
  },
  "issues": [
    { "type": "warning", "text": "descripción del problema" }
  ],
  "suggestions": [
    "sugerencia concreta de mejora"
  ],
  "score": 82
}
Status posibles: "ok" | "low" | "high". Types: "error" | "warning" | "info".`;

  const userPrompt = `Analiza la distribución de keywords en este artículo de Ferrolan:

**Tema:** ${tema || ""}
**Keywords objetivo:** ${keywords || "Extraer del artículo"}

**Artículo completo:**
${articulo.slice(0, 4000)}`;

  try {
    const raw = await callAI({ provider, tier: "analysis", systemPrompt, userPrompt, maxTokens: 2048 });

    let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd   = cleaned.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) cleaned = cleaned.slice(jsonStart, jsonEnd + 1);

    try {
      return res.status(200).json(JSON.parse(cleaned));
    } catch {
      const opens  = (cleaned.match(/\[/g) || []).length - (cleaned.match(/\]/g) || []).length;
      const bracks = (cleaned.match(/\{/g) || []).length - (cleaned.match(/\}/g) || []).length;
      let repaired = cleaned.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, "").replace(/,\s*$/, "");
      for (let i = 0; i < opens;  i++) repaired += "]";
      for (let i = 0; i < bracks; i++) repaired += "}";
      return res.status(200).json(JSON.parse(repaired));
    }
  } catch (err) {
    console.error("keyword-mapper error:", err);
    return res.status(500).json({ error: err.message || "Error en el mapeador de keywords." });
  }
}
