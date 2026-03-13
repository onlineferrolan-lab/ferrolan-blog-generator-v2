import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
import { google } from "googleapis";

// ─── Prestashop Config ──────────────────────────────────────────────────────

const EXCLUDED_CATEGORY_TREES = [16, 9498, 3554, 8186, 11699];
const EXCLUDED_CATEGORIES = [2735]; // Grifería parent excluded but child 2745 kept
const KEPT_CHILDREN = [2745]; // Children to keep despite parent exclusion

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return null;
  return new google.auth.JWT(email, null, key.replace(/\\n/g, "\n"), [
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
}

// ─── Prestashop: fetch and filter categories ────────────────────────────────

async function fetchPrestashopCategories() {
  const apiUrl = process.env.PRESTASHOP_API_URL || "https://ferrolan.es/api";
  const apiKey = process.env.PRESTASHOP_API_KEY;

  if (!apiKey) return null;

  const url = `${apiUrl}/categories?output_format=JSON&display=[id,name,id_parent,active,level_depth]&limit=500`;

  const res = await fetch(url, {
    headers: {
      Authorization: "Basic " + Buffer.from(apiKey + ":").toString("base64"),
    },
  });

  if (!res.ok) throw new Error(`Prestashop API error: ${res.status}`);

  const data = await res.json();
  const allCats = (data.categories || []).filter(
    (c) => c.active === "1" && c.name && c.level_depth >= 2
  );

  // Build set of all IDs to exclude (tree traversal for EXCLUDED_CATEGORY_TREES)
  const excludedIds = new Set();

  // Add full trees
  function addTree(parentId) {
    excludedIds.add(parentId);
    allCats
      .filter((c) => c.id_parent === parentId)
      .forEach((c) => addTree(c.id));
  }
  EXCLUDED_CATEGORY_TREES.forEach((id) => addTree(id));

  // Add specific excluded categories and their children (except kept ones)
  EXCLUDED_CATEGORIES.forEach((id) => {
    excludedIds.add(id);
    allCats
      .filter((c) => c.id_parent === id && !KEPT_CHILDREN.includes(c.id))
      .forEach((c) => {
        excludedIds.add(c.id);
        // Also exclude grandchildren of excluded children
        allCats.filter((gc) => gc.id_parent === c.id).forEach((gc) => excludedIds.add(gc.id));
      });
  });

  // Filter
  const filtered = allCats.filter((c) => !excludedIds.has(c.id));

  // Build hierarchy for display
  const byParent = {};
  filtered.forEach((c) => {
    if (!byParent[c.id_parent]) byParent[c.id_parent] = [];
    byParent[c.id_parent].push(c);
  });

  // Get top-level categories (depth 2 = direct children of "Inicio")
  const topLevel = filtered.filter((c) => c.level_depth === 2);

  return topLevel.map((cat) => ({
    id: cat.id,
    name: cat.name,
    children: (byParent[cat.id] || []).map((child) => ({
      id: child.id,
      name: child.name,
      children: (byParent[child.id] || []).map((gc) => ({
        id: gc.id,
        name: gc.name,
      })),
    })),
  }));
}

// ─── KV: get published articles ─────────────────────────────────────────────

async function getArticleHistory() {
  try {
    const ids = await kv.lrange("articles:index", 0, -1);
    if (!ids || ids.length === 0) return [];
    const records = await Promise.all(ids.map((id) => kv.get(id)));
    return records
      .filter(Boolean)
      .map((r) => (typeof r === "string" ? JSON.parse(r) : r));
  } catch {
    return [];
  }
}

// ─── GSC: get current queries ───────────────────────────────────────────────

async function getGSCQueries(auth) {
  if (!auth) return {};
  const siteUrl = process.env.GSC_SITE_URL || "sc-domain:ferrolan.es";
  const searchconsole = google.searchconsole({ version: "v1", auth });

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 27);
  const fmt = (d) => d.toISOString().split("T")[0];

  try {
    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ["query"],
        rowLimit: 500,
        dataState: "final",
      },
    });

    const queries = {};
    (res.data.rows || []).forEach((r) => {
      queries[r.keys[0].toLowerCase()] = {
        clics: r.clicks,
        impresiones: r.impressions,
        posicion: Math.round(r.position * 10) / 10,
        ctr: Math.round(r.ctr * 1000) / 10,
      };
    });
    return queries;
  } catch {
    return {};
  }
}

// ─── Claude: generate keywords ──────────────────────────────────────────────

async function generateKeywords(categories, articles, gscQueries) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  // Build category summary
  const catSummary = categories
    .map((cat) => {
      const children = cat.children
        .map((c) => {
          const grandchildren = c.children.map((gc) => gc.name).join(", ");
          return grandchildren ? `${c.name} (${grandchildren})` : c.name;
        })
        .join("; ");
      return `- ${cat.name}: ${children || "(sin subcategorías)"}`;
    })
    .join("\n");

  // Build article summary
  const artSummary =
    articles.length > 0
      ? articles
          .slice(0, 50)
          .map((a) => `- "${a.titulo || a.tema}" [${a.categoria}]`)
          .join("\n")
      : "No hay artículos publicados todavía.";

  // Build GSC summary (top queries)
  const gscKeys = Object.keys(gscQueries);
  const topGSC =
    gscKeys.length > 0
      ? gscKeys
          .sort((a, b) => gscQueries[b].impresiones - gscQueries[a].impresiones)
          .slice(0, 30)
          .map(
            (q) =>
              `- "${q}" (pos: ${gscQueries[q].posicion}, impr: ${gscQueries[q].impresiones})`
          )
          .join("\n")
      : "Sin datos de GSC disponibles.";

  const prompt = `Eres un experto SEO para Ferrolan, distribuidor de materiales de construcción en Barcelona.

CATÁLOGO DE PRODUCTOS (categorías del ecommerce):
${catSummary}

ARTÍCULOS YA PUBLICADOS EN EL BLOG:
${artSummary}

QUERIES ACTUALES EN GOOGLE SEARCH CONSOLE (top 30):
${topGSC}

TAREA: Genera keywords para el blog cruzando estas tres fuentes. Clasifícalas en tres grupos:

1. **sin_cubrir**: Keywords basadas en categorías del catálogo que NO tienen artículo dedicado en el blog. Son las más importantes porque representan productos que vendemos pero no tenemos contenido. Genera 8-12.

2. **oportunidades**: Keywords donde ya hay algo de presencia en GSC pero se podría mejorar con un artículo dedicado o mejor optimizado. Busca queries con muchas impresiones pero posición > 10 o sin artículo directo. Genera 5-8.

3. **sugeridas**: Keywords long-tail creativas que combinen productos del catálogo con intención de búsqueda informativa (cómo elegir, diferencias, guía, tendencias, etc). Genera 6-10.

Para cada keyword incluye:
- keyword: la frase de búsqueda
- categoria_ps: nombre de la categoría de Prestashop relacionada
- tipo: "sin_cubrir" | "oportunidad" | "sugerida"
- prioridad: "alta" | "media" | "baja"
- razon: por qué es relevante (1 frase corta)
- titulo_sugerido: un título de artículo sugerido

Responde SOLO con JSON válido, sin explicaciones ni markdown. El formato debe ser:
{"keywords": [...]}`;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0]?.text || "";

    // Parse JSON — handle various Claude response formats
    try {
      // Remove markdown fences, leading/trailing whitespace
      let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      // If Claude added any text before the JSON, find the first {
      const jsonStart = cleaned.indexOf("{");
      if (jsonStart > 0) cleaned = cleaned.slice(jsonStart);
      // Find last }
      const jsonEnd = cleaned.lastIndexOf("}");
      if (jsonEnd > 0) cleaned = cleaned.slice(0, jsonEnd + 1);
      return JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr.message, "Raw response (first 300):", text.slice(0, 300));
      return { keywords: [], _parseError: true, _raw: text.slice(0, 200) };
    }
  } catch (apiErr) {
    console.error("Anthropic API error:", apiErr.message);
    return { keywords: [], _apiError: apiErr.message };
  }
}

// ─── Sync to Google Sheet ───────────────────────────────────────────────────

async function syncToSheet(auth, keywords) {
  const sheetId = process.env.KEYWORDS_SHEET_ID;
  if (!auth || !sheetId) return;

  try {
    const sheets = google.sheets({ version: "v4", auth });

    // Prepare rows
    const rows = keywords.map((kw) => [
      kw.keyword,
      kw.tipo,
      kw.categoria_ps || "",
      kw.prioridad || "",
      kw.razon || "",
      kw.titulo_sugerido || "",
      kw.estado || "pendiente",
      new Date().toISOString().split("T")[0],
    ]);

    // Clear and rewrite
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "Keywords!A2:H500",
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });

    // Update headers if empty
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "Keywords!A1:H1",
      valueInputOption: "RAW",
      requestBody: {
        values: [["Keyword", "Tipo", "Categoría PS", "Prioridad", "Razón", "Título sugerido", "Estado", "Fecha"]],
      },
    });
  } catch (err) {
    console.error("Sheet sync error:", err.message);
  }
}

// ─── KV Cache ───────────────────────────────────────────────────────────────

const CACHE_KEY = "keywords:latest";
const CACHE_TTL = 3600 * 6; // 6 hours

async function getCachedKeywords() {
  try {
    const cached = await kv.get(CACHE_KEY);
    if (cached) return typeof cached === "string" ? JSON.parse(cached) : cached;
  } catch {}
  return null;
}

async function setCachedKeywords(data) {
  try {
    await kv.set(CACHE_KEY, JSON.stringify(data), { ex: CACHE_TTL });
  } catch {}
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const forceRefresh = req.method === "POST" || req.query.refresh === "true";

  // Check Prestashop config
  if (!process.env.PRESTASHOP_API_KEY) {
    return res.status(200).json({
      configured: false,
      error: "PRESTASHOP_API_KEY no configurada en Vercel.",
    });
  }

  // Return cached if available and not forcing refresh
  if (!forceRefresh) {
    const cached = await getCachedKeywords();
    if (cached) {
      return res.status(200).json({ ...cached, cached: true });
    }
  }

  try {
    const googleAuth = getGoogleAuth();

    // Fetch all data in parallel
    const [categories, articles, gscQueries] = await Promise.all([
      fetchPrestashopCategories(),
      getArticleHistory(),
      getGSCQueries(googleAuth),
    ]);

    if (!categories || categories.length === 0) {
      return res.status(200).json({
        configured: true,
        error: "No se pudieron obtener categorías de Prestashop.",
      });
    }

    // Generate keywords with Claude
    const result = await generateKeywords(categories, articles, gscQueries);

    if (!result || !result.keywords || result.keywords.length === 0) {
      const detail = result?._apiError
        ? `Error API Claude: ${result._apiError}`
        : result?._parseError
        ? `Error parseando respuesta de Claude: ${result._raw || "sin datos"}`
        : "Error generando keywords con Claude.";
      return res.status(200).json({
        configured: true,
        error: detail,
        categories: categories.map((c) => c.name),
      });
    }

    // Classify
    const sinCubrir = result.keywords.filter((k) => k.tipo === "sin_cubrir");
    const oportunidades = result.keywords.filter((k) => k.tipo === "oportunidad");
    const sugeridas = result.keywords.filter((k) => k.tipo === "sugerida");

    const responseData = {
      configured: true,
      generatedAt: new Date().toISOString(),
      categoriasPrestashop: categories.map((c) => ({
        name: c.name,
        childCount: c.children.length,
      })),
      resumen: {
        total: result.keywords.length,
        sinCubrir: sinCubrir.length,
        oportunidades: oportunidades.length,
        sugeridas: sugeridas.length,
      },
      sinCubrir,
      oportunidades,
      sugeridas,
    };

    // Cache in KV
    await setCachedKeywords(responseData);

    // Sync to Google Sheet (async, don't block response)
    syncToSheet(googleAuth, result.keywords).catch(() => {});

    return res.status(200).json(responseData);
  } catch (err) {
    console.error("Keywords data error:", err);
    return res.status(200).json({
      configured: true,
      error: err.message,
    });
  }
}
