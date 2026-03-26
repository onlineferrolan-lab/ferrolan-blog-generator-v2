import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { loadAgentContext } from "../../lib/context-loader";

// ─── Agent definition loader ─────────────────────────────────────────────────

function readAgentDef(filename) {
  try {
    return fs.readFileSync(
      path.join(process.cwd(), ".claude", "agents", filename),
      "utf-8"
    );
  } catch {
    return "";
  }
}

// ─── Agent runners ────────────────────────────────────────────────────────────

// Agent 1: Internal Linker
// Uses internal-linker.md + internal-links-map context
// Returns JSON: { links: [{ url, anchor, placement, sentence }] }
async function runInternalLinker(client, { articulo, tema, categoria, ctx }) {
  const agentDef = readAgentDef("internal-linker.md");

  const systemPrompt = `${agentDef}

## MAPA DE ENLACES INTERNOS (ferrolan.es)
${ctx.internalLinksMap}

## INSTRUCCIÓN DE SALIDA
Devuelve ÚNICAMENTE un JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:
{
  "links": [
    {
      "url": "/ruta-en-ferrolan",
      "anchor": "texto del enlace",
      "placement": "nombre de la sección H2 donde insertar",
      "sentence": "frase completa del artículo donde integrar el enlace de forma natural, con el anchor ya en formato markdown [anchor](/url)"
    }
  ],
  "summary": "resumen de 1 frase de la estrategia de enlazado"
}
Máximo 4 enlaces. Solo URLs de ferrolan.es. Solo anchor texts descriptivos, nunca "clic aquí".`;

  const userPrompt = `Analiza este artículo de Ferrolan e inserta los enlaces internos óptimos:

**Tema:** ${tema}
**Categoría:** ${categoria || "No especificada"}

**Artículo:**
${articulo}`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1536,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = msg.content[0]?.text || "{}";
  const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Respuesta del agente de enlaces no es JSON válido");
  }
}

// Agent 2: Headline Generator
// Uses headline-generator.md + brand-voice context
// Returns JSON: { headlines: [{ title, formula, score, reasoning }] }
async function runHeadlineGenerator(client, { articulo, tema, keywords, categoria, ctx }) {
  const agentDef = readAgentDef("headline-generator.md");

  const systemPrompt = `${agentDef}

## VOZ DE MARCA
${ctx.brandVoice}

## INSTRUCCIÓN DE SALIDA
Devuelve ÚNICAMENTE un JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:
{
  "headlines": [
    {
      "title": "El titular propuesto",
      "formula": "Nombre de la fórmula usada (ej: Cómo + Beneficio)",
      "chars": 42,
      "seoScore": 85,
      "ctrScore": 78,
      "reasoning": "Por qué este titular funciona en 1 frase"
    }
  ],
  "current_title": "El H1 actual del artículo"
}
Genera exactamente 5 titulares alternativos. Máximo 70 caracteres cada uno. Keyword principal en todos.`;

  const userPrompt = `Genera 5 titulares alternativos para este artículo de Ferrolan:

**Tema:** ${tema}
**Categoría:** ${categoria || "No especificada"}
**Keywords:** ${keywords || "Extraer del artículo"}

**Artículo:**
${articulo.slice(0, 2000)}`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1536,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = msg.content[0]?.text || "{}";
  const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Respuesta del agente de titulares no es JSON válido");
  }
}

// Agent 3: Keyword Mapper
// Uses keyword-mapper.md + seo-guidelines context
// Returns JSON: { primary, density, locations, issues, suggestions }
async function runKeywordMapper(client, { articulo, tema, keywords, ctx }) {
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

**Tema:** ${tema}
**Keywords objetivo:** ${keywords || "Extraer del artículo"}

**Artículo completo:**
${articulo.slice(0, 4000)}`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = msg.content[0]?.text || "{}";
  const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Guard against truncated JSON: try to parse, fix if unterminated
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt to close any open structures so we get partial data
    const attempts = [cleaned + '"}]}', cleaned + '"]}', cleaned + '"}', cleaned + '}'];
    for (const attempt of attempts) {
      try { return JSON.parse(attempt); } catch { /* continue */ }
    }
    throw new Error("Respuesta del agente keywords no es JSON válido");
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { articulo, tema, keywords, categoria } = req.body;

  if (!articulo || !tema) {
    return res.status(400).json({ error: "articulo y tema son obligatorios" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key no configurada" });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const ctx = loadAgentContext();

  try {
    // Run all 3 agents in parallel for speed
    const [linkerResult, headlineResult, keywordResult] = await Promise.allSettled([
      runInternalLinker(client, { articulo, tema, categoria, ctx }),
      runHeadlineGenerator(client, { articulo, tema, keywords, categoria, ctx }),
      runKeywordMapper(client, { articulo, tema, keywords, ctx }),
    ]);

    return res.status(200).json({
      linker: linkerResult.status === "fulfilled" ? linkerResult.value : { error: linkerResult.reason?.message },
      headlines: headlineResult.status === "fulfilled" ? headlineResult.value : { error: headlineResult.reason?.message },
      keywords: keywordResult.status === "fulfilled" ? keywordResult.value : { error: keywordResult.reason?.message },
    });
  } catch (err) {
    console.error("enhance-article error:", err);
    return res.status(500).json({ error: "Error en el pipeline de agentes" });
  }
}
