import { callAI } from "../../lib/ai-client";
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
async function runInternalLinker(provider, { articulo, tema, categoria, ctx }) {
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

  const raw = await callAI({ provider, tier: "fast", systemPrompt, userPrompt, maxTokens: 1536 });
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
async function runHeadlineGenerator(provider, { articulo, tema, keywords, categoria, ctx }) {
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

  const raw = await callAI({ provider, tier: "fast", systemPrompt, userPrompt, maxTokens: 1536 });
  const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Respuesta del agente de titulares no es JSON válido");
  }
}

// Agent 3: Keyword Mapper
// Uses keyword-mapper.md + seo-guidelines context
// Returns JSON: { primary, density, locations, issues, suggestions, suggested_meta }
async function runKeywordMapper(provider, { articulo, tema, keywords, ctx }) {
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
  "suggested_meta": {
    "title": "Meta título optimizado con keyword principal (máx 60 chars) o null si ya está bien",
    "description": "Meta descripción optimizada con keyword (máx 155 chars) o null si ya está bien"
  },
  "score": 82
}
Status posibles: "ok" | "low" | "high". Types: "error" | "warning" | "info".
Para "suggested_meta": solo incluye título/descripción si los actuales son mejorables o no existen. Usa null si no hay mejora que proponer.`;

  const userPrompt = `Analiza la distribución de keywords en este artículo de Ferrolan:

**Tema:** ${tema}
**Keywords objetivo:** ${keywords || "Extraer del artículo"}

**Artículo completo:**
${articulo.slice(0, 4000)}`;

  const raw = await callAI({ provider, tier: "fast", systemPrompt, userPrompt, maxTokens: 2048 });
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

// Agent 4: CRO Analyst
// Uses cro-analyst.md + brand-voice + internal-links-map
// Returns JSON: { score, strategy_summary, elements: [{ id, type, label, text, placement, position, reason }] }
async function runCROAnalyst(provider, { articulo, tema, keywords, categoria, ctx }) {
  const agentDef = readAgentDef("cro-analyst.md");

  const systemPrompt = `${agentDef}

## VOZ DE MARCA
${ctx.brandVoice}

## MAPA DE ENLACES INTERNOS
${ctx.internalLinksMap}

## INSTRUCCIÓN DE SALIDA
Devuelve ÚNICAMENTE un JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:
{
  "score": 72,
  "strategy_summary": "Frase de 1 línea sobre la estrategia de conversión del artículo",
  "elements": [
    {
      "id": "cro_0",
      "type": "cta|objection|social_proof|trust|authority",
      "label": "Nombre descriptivo del elemento (ej: CTA de asesoramiento, Manejo objeción precio)",
      "text": "Texto markdown completo y listo para insertar en el artículo. Incluye salto de línea si es un párrafo nuevo.",
      "placement": "H2: Nombre exacto de la sección destino del artículo",
      "position": "inicio|fin",
      "reason": "Por qué mejora la conversión en 1 frase corta"
    }
  ]
}
Genera entre 3 y 5 elementos accionables. Persuasión ética, sin urgencia artificial ni presión de compra.
El "text" debe ser texto markdown real que se insertará directamente en el artículo — no descripciones de lo que habría que escribir.`;

  const userPrompt = `Analiza este artículo de Ferrolan desde perspectiva CRO y genera elementos persuasivos aplicables:

**Tema:** ${tema}
**Categoría:** ${categoria || "No especificada"}
**Keywords:** ${keywords || "Extraer del artículo"}

**Artículo:**
${articulo.slice(0, 3500)}`;

  const raw = await callAI({ provider, tier: "fast", systemPrompt, userPrompt, maxTokens: 2048 });
  const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const attempts = [cleaned + '"]}', cleaned + '"}', cleaned + '}'];
    for (const attempt of attempts) {
      try { return JSON.parse(attempt); } catch { /* continue */ }
    }
    throw new Error("Respuesta del agente CRO no es JSON válido");
  }
}

// Agent 5: Landing Page Optimizer
// Uses landing-page-optimizer.md + brand-voice + internal-links-map
// Returns JSON: { score, summary, elements: [{ id, type, label, text, placement, position, reason }] }
async function runLandingPageOptimizer(provider, { articulo, tema, keywords, categoria, ctx }) {
  const agentDef = readAgentDef("landing-page-optimizer.md");

  const systemPrompt = `${agentDef}

## VOZ DE MARCA
${ctx.brandVoice}

## MAPA DE ENLACES INTERNOS
${ctx.internalLinksMap}

## INSTRUCCIÓN DE SALIDA
Devuelve ÚNICAMENTE un JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:
{
  "score": 68,
  "summary": "Frase de 1 línea sobre el estado actual del artículo como landing page",
  "elements": [
    {
      "id": "lp_0",
      "type": "cta|trust_signal|intro_hook|closing|friction_fix",
      "label": "Nombre descriptivo (ej: CTA catálogo final, Señal de confianza, Párrafo de cierre)",
      "text": "Texto markdown completo y listo para insertar directamente en el artículo.",
      "placement": "H2: Nombre exacto de la sección destino | INTRO | CIERRE",
      "position": "inicio|fin",
      "reason": "Por qué mejora la landing en 1 frase corta"
    }
  ]
}
Genera entre 3 y 5 elementos accionables. CTAs suaves, alineados con la marca Ferrolan.
El "text" debe ser texto markdown real que se insertará directamente en el artículo — no descripciones.`;

  const userPrompt = `Analiza este artículo de Ferrolan como landing page orgánica y genera mejoras aplicables:

**Tema:** ${tema}
**Categoría:** ${categoria || "No especificada"}
**Keywords:** ${keywords || "Extraer del artículo"}

**Artículo:**
${articulo.slice(0, 3500)}`;

  const raw = await callAI({ provider, tier: "fast", systemPrompt, userPrompt, maxTokens: 2048 });
  const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const attempts = [cleaned + '"]}', cleaned + '"}', cleaned + '}'];
    for (const attempt of attempts) {
      try { return JSON.parse(attempt); } catch { /* continue */ }
    }
    throw new Error("Respuesta del agente Landing no es JSON válido");
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { articulo, tema, keywords, categoria, provider = "anthropic" } = req.body;

  if (!articulo || !tema) {
    return res.status(400).json({ error: "articulo y tema son obligatorios" });
  }

  const ctx = loadAgentContext();

  try {
    // Run all 5 agents in parallel for speed
    const [linkerResult, headlineResult, keywordResult, croResult, landingResult] = await Promise.allSettled([
      runInternalLinker(provider, { articulo, tema, categoria, ctx }),
      runHeadlineGenerator(provider, { articulo, tema, keywords, categoria, ctx }),
      runKeywordMapper(provider, { articulo, tema, keywords, ctx }),
      runCROAnalyst(provider, { articulo, tema, keywords, categoria, ctx }),
      runLandingPageOptimizer(provider, { articulo, tema, keywords, categoria, ctx }),
    ]);

    return res.status(200).json({
      linker:   linkerResult.status   === "fulfilled" ? linkerResult.value   : { error: linkerResult.reason?.message },
      headlines: headlineResult.status === "fulfilled" ? headlineResult.value : { error: headlineResult.reason?.message },
      keywords: keywordResult.status  === "fulfilled" ? keywordResult.value  : { error: keywordResult.reason?.message },
      cro:      croResult.status      === "fulfilled" ? croResult.value      : { error: croResult.reason?.message },
      landing:  landingResult.status  === "fulfilled" ? landingResult.value  : { error: landingResult.reason?.message },
    });
  } catch (err) {
    console.error("enhance-article error:", err);
    return res.status(500).json({ error: "Error en el pipeline de agentes" });
  }
}
