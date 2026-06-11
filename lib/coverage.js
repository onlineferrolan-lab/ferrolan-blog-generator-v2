// ─── lib/coverage.js ─────────────────────────────────────────────────────────
// Capa reutilizable para detectar si un tema/keyword YA está cubierto por algún
// artículo publicado, cruzando:
//   - Artículos generados por la app   → KV "articles:index"
//   - Posts de WordPress sincronizados → KV "wp:posts:index" (vía /api/sync-blog-posts)
//
// Reutiliza el motor de matching de lib/keyword-utils.js (normalización sin
// acentos/stopwords + matchType exact|contains|overlap).
//
// Usado por: gsc-data.js (Oportunidades GSC, Nuevos temas) y keywords-data.js
// (Sin cubrir / Oportunidades / Sugeridas). check-keyword.js mantiene su propia
// lógica equivalente para la verificación manual.

import { kv } from "@vercel/kv";
import { normalizeKeyword, normalizeSlug, matchType } from "./keyword-utils";

// Niveles de coincidencia que cuentan como "ya cubierto".
//   - strict   → solo coincidencia exacta o contenida
//   - balanced → exacta/contenida + solapamiento alto (matchType "overlap" = ≥60%)
//   - broad    → igual que balanced (matchType no devuelve overlap por debajo del 60%)
const LEVELS = {
  strict:   new Set(["exact", "contains"]),
  balanced: new Set(["exact", "contains", "overlap"]),
  broad:    new Set(["exact", "contains", "overlap"]),
};

const ORDER = { exact: 0, contains: 1, overlap: 2 };

// ─── Carga del índice de cobertura ──────────────────────────────────────────
// Devuelve una lista de entradas normalizadas:
//   { title, url, source: "kv"|"wordpress", date, fields: [{ norm }] }
// Se llama una vez por request (sin caché en memoria por el entorno serverless).
export async function loadCoverageIndex() {
  let kvIds = [];
  let wpIds = [];
  try {
    [kvIds, wpIds] = await Promise.all([
      kv.lrange("articles:index", 0, -1),
      kv.lrange("wp:posts:index", 0, -1),
    ]);
  } catch {
    return [];
  }
  kvIds = kvIds || [];
  wpIds = wpIds || [];

  const [kvRecords, wpRecords] = await Promise.all([
    kvIds.length ? Promise.all(kvIds.map((id) => kv.get(id))) : Promise.resolve([]),
    wpIds.length ? Promise.all(wpIds.map((id) => kv.get(`wp:post:${id}`))) : Promise.resolve([]),
  ]);

  const index = [];
  const wpBase = (process.env.WORDPRESS_URL || "").replace(/\/$/, "");

  // ── Artículos generados por la app (KV) ──
  for (const raw of kvRecords) {
    if (!raw) continue;
    const a = typeof raw === "string" ? JSON.parse(raw) : raw;
    const url = a.wpLink || (wpBase && a.slug ? `${wpBase}/blog/${a.slug}` : null);
    const fields = [
      normalizeKeyword(a.titulo || ""),
      normalizeSlug(a.slug || ""),
      normalizeKeyword(a.keywords || ""),
      normalizeKeyword(a.tema || ""),
    ].filter(Boolean).map((norm) => ({ norm }));
    if (fields.length === 0) continue;
    index.push({
      title: a.titulo || a.tema || "Sin título",
      url,
      source: "kv",
      date: a.fecha || "",
      fields,
    });
  }

  // ── Posts de WordPress sincronizados ──
  for (const raw of wpRecords) {
    if (!raw) continue;
    const p = typeof raw === "string" ? JSON.parse(raw) : raw;
    const fields = [
      normalizeKeyword(p.title || ""),
      normalizeSlug(p.slug || ""),
    ].filter(Boolean).map((norm) => ({ norm }));
    if (fields.length === 0) continue;
    index.push({
      title: p.title || p.slug || "Sin título",
      url: p.link || null,
      source: "wordpress",
      date: p.date ? p.date.slice(0, 10) : "",
      fields,
    });
  }

  return index;
}

// ─── Búsqueda de cobertura para una keyword ─────────────────────────────────
// Devuelve { covered: boolean, conflict: { title, url, source, matchType, date } | null }
export function findCoverage(keyword, index, level = "balanced") {
  const accepted = LEVELS[level] || LEVELS.balanced;
  const normKw = normalizeKeyword(keyword || "");
  if (!normKw || !Array.isArray(index) || index.length === 0) {
    return { covered: false, conflict: null };
  }

  let best = null;
  for (const entry of index) {
    let entryBest = null;
    for (const f of entry.fields) {
      const mt = matchType(normKw, f.norm);
      if (mt && accepted.has(mt)) {
        if (!entryBest || ORDER[mt] < ORDER[entryBest]) entryBest = mt;
      }
    }
    if (entryBest && (!best || ORDER[entryBest] < ORDER[best.matchType])) {
      best = {
        title: entry.title,
        url: entry.url,
        source: entry.source,
        matchType: entryBest,
        date: entry.date,
      };
    }
  }

  return { covered: !!best, conflict: best };
}

// ─── Anotación de una lista de items ────────────────────────────────────────
// Añade a cada item: { cubierto: boolean, articuloExistente?: conflict }.
// keyField = nombre del campo que contiene la keyword (ej "query" o "keyword").
export function annotateCoverage(items, index, keyField, level = "balanced") {
  if (!Array.isArray(items)) return items;
  return items.map((item) => {
    const { covered, conflict } = findCoverage(item[keyField] || "", index, level);
    return covered
      ? { ...item, cubierto: true, articuloExistente: conflict }
      : { ...item, cubierto: false };
  });
}
