import { callAI, callAIStream } from "../../lib/ai-client";
import { estimateCost } from "../../lib/ai-cost";
import { extractSlug, extractTitle } from "../../lib/article-utils";
import { getArticlesMeta, saveArticleRecord } from "../../lib/article-store";
import { loadGenerationContext, buildContextBlock } from "../../lib/context-loader";
import { buildSystemBlocks, buildUserPrompt } from "../../lib/article-generator";
import { validateBody, MAX } from "../../lib/validate";

// La generación con el modelo principal puede tardar más de un minuto.
// supportsResponseStreaming permite la respuesta SSE en Vercel.
export const config = { maxDuration: 60, supportsResponseStreaming: true };

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

// El prompt de generación (rol, estructura, historial, user prompt) vive en
// lib/article-generator.js — compartido con el cron del resumen quincenal.

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
  const contextBlock = buildContextBlock(loadGenerationContext());
  const systemPrompt = buildSystemBlocks(contextBlock, history);
  const userPrompt = buildUserPrompt({
    tema, categoria, keywords, tono, contexto, researchData,
    publico, longitud, intencion, urlCategoriaPrestashop, nombreCategoriaPrestashop,
  });

  // 4096 tokens: un artículo "Largo" (~1200 palabras) + bloque meta ronda los
  // 2000-2400 tokens en castellano; con 2048 se truncaba a media frase.

  // ── Modo streaming (SSE): el dashboard pinta el artículo según se escribe ──
  if (req.body.stream === true) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    try {
      let usage = null;
      for await (const delta of callAIStream({
        provider, tier: "main", systemPrompt, userPrompt, maxTokens: 4096,
        onUsage: (u) => { usage = u; },
      })) {
        send({ delta });
      }
      const cost = usage ? estimateCost(usage) : null;
      send({ done: true, historialCount: history.length, usage, cost });
    } catch (err) {
      console.error("AI generation error (stream):", err);
      send({ error: "Error al generar el artículo. Inténtalo de nuevo." });
    }
    return res.end();
  }

  // ── Modo clásico (JSON completo) ──
  try {
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
