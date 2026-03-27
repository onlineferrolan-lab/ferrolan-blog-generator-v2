import { callAI } from "../../lib/ai-client";

// ─── Fix Keywords API ─────────────────────────────────────────────────────────
// Recibe el artículo + el análisis de keywords del agente y reescribe el
// artículo corrigiendo los problemas de ubicación y densidad detectados.
// Preserva la estructura, el tono, el contenido y el bloque meta (---).

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { articulo, tema, keywords, keywordAnalysis, provider = "anthropic" } = req.body;

  if (!articulo || !keywordAnalysis) {
    return res.status(400).json({ error: "Artículo y análisis de keywords son obligatorios." });
  }

  // Separar cuerpo del bloque meta para no tocarlo
  const metaSepIndex = articulo.indexOf("\n---\n");
  const cuerpo = metaSepIndex !== -1 ? articulo.slice(0, metaSepIndex) : articulo;
  const metaBloque = metaSepIndex !== -1 ? articulo.slice(metaSepIndex) : "";

  // Construir lista de problemas concretos a corregir
  const issues = (keywordAnalysis.issues || []).map(i => `- [${i.type.toUpperCase()}] ${i.text}`).join("\n");
  const suggestions = (keywordAnalysis.suggestions || []).map(s => `- ${s}`).join("\n");

  const locationProblems = [];
  const locs = keywordAnalysis.locations || {};
  if (!locs.h1)               locationProblems.push("La keyword principal NO está en el H1.");
  if (!locs.first_100_words)  locationProblems.push("La keyword principal NO aparece en las primeras 100 palabras.");
  if (!locs.last_paragraph)   locationProblems.push("La keyword principal NO aparece en el último párrafo. Añádela de forma natural.");
  if (locs.h2_count === 0)    locationProblems.push("Ningún H2 contiene la keyword principal. Incluye variaciones en 2-3 H2.");
  const primaryStatus = keywordAnalysis.density?.primary?.status;
  if (primaryStatus === "low") locationProblems.push(`Densidad de keyword muy baja (${keywordAnalysis.density?.primary?.percent}%). Objetivo: 1-2%.`);
  if (primaryStatus === "high") locationProblems.push(`Densidad de keyword demasiado alta (${keywordAnalysis.density?.primary?.percent}%). Reduce repeticiones forzadas.`);

  const systemPrompt = `Eres un especialista SEO para el blog de Ferrolan (materiales de construcción, cerámica, baño, cocina, parquet en España).

Tu tarea: corregir la distribución de keywords en el artículo sin cambiar su estructura, tono ni contenido esencial.

REGLAS ESTRICTAS:
- Mantén TODOS los H1, H2, H3 existentes (puedes modificar su redacción para incluir la keyword de forma natural)
- Mantén la longitud aproximada del artículo (±10%)
- No añadas secciones nuevas ni elimines secciones existentes
- Integra la keyword de forma natural, sin repetición forzada
- Tono: experto, cercano, didáctico. Sin frases comerciales.
- Devuelve ÚNICAMENTE el cuerpo del artículo en Markdown, sin explicaciones, sin comentarios, sin el bloque meta (---)`;

  const userPrompt = `Keyword principal: "${keywordAnalysis.primary_keyword}"
Tema: ${tema || "No especificado"}
Keywords objetivo: ${keywords || keywordAnalysis.primary_keyword}

PROBLEMAS DE UBICACIÓN A CORREGIR:
${locationProblems.length > 0 ? locationProblems.join("\n") : "- Ningún problema crítico de ubicación"}

OTROS PROBLEMAS DETECTADOS:
${issues || "- Ninguno"}

SUGERENCIAS DEL ANÁLISIS:
${suggestions || "- Ninguna"}

ARTÍCULO A CORREGIR:
${cuerpo}

Devuelve el artículo corregido en Markdown. Solo el cuerpo, sin el bloque de metadatos.`;

  try {
    const text = await callAI({ provider, tier: "main", systemPrompt, userPrompt, maxTokens: 4096 });

    // Limpiar posibles markdown fences
    const cleaned = text.replace(/^```(?:markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();

    return res.status(200).json({ articulo: cleaned + metaBloque });
  } catch (err) {
    console.error("fix-keywords error:", err);
    return res.status(500).json({ error: "Error al corregir las keywords. Inténtalo de nuevo." });
  }
}
