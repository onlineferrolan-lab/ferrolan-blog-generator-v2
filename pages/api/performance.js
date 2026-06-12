// ─── /api/performance ────────────────────────────────────────────────────────
// Bucle de feedback SEO: cruza los artículos publicados por la app con los
// datos reales de Google Search Console por página, para responder a la
// pregunta "¿está posicionando lo que publicamos?".
//
// GET → { configured, periodo, articulos: [{ titulo, slug, url, fecha, dias,
//         clics, impresiones, posicion, ctr, enGSC }] }
// Caché KV de 6h; ?refresh=true fuerza datos frescos.

import { google } from "googleapis";
import { kv } from "../../lib/kv";
import { getGoogleAuth, SCOPES } from "../../lib/google-auth";
import { getArticlesMeta } from "../../lib/article-store";

export const config = { maxDuration: 60 };

const CACHE_KEY = "performance:data:cache";
const CACHE_TTL = 6 * 60 * 60;

// GSC por página (solo /blog/), últimos 90 días
async function fetchGSCPages(auth) {
  const siteUrl = process.env.GSC_SITE_URL || "sc-domain:ferrolan.es";
  const searchconsole = google.searchconsole({ version: "v1", auth });

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3); // delay de GSC
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 89);
  const fmt = (d) => d.toISOString().split("T")[0];

  const res = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions: ["page"],
      dimensionFilterGroups: [{
        filters: [{ dimension: "page", operator: "contains", expression: "/blog/" }],
      }],
      rowLimit: 500,
      dataState: "final",
    },
  });

  const pages = {};
  (res.data.rows || []).forEach((r) => {
    pages[r.keys[0].toLowerCase()] = {
      clics: r.clicks,
      impresiones: r.impressions,
      posicion: Math.round(r.position * 10) / 10,
      ctr: Math.round(r.ctr * 1000) / 10,
    };
  });
  return { pages, periodo: `${fmt(startDate)} — ${fmt(endDate)}` };
}

// Busca la página GSC que corresponde a un artículo (por slug en la URL)
function matchPage(pages, slug, wpLink) {
  if (wpLink) {
    const direct = pages[wpLink.toLowerCase()] || pages[`${wpLink.toLowerCase()}/`];
    if (direct) return direct;
  }
  if (!slug) return null;
  const needle = `/${slug.toLowerCase()}`;
  for (const [url, data] of Object.entries(pages)) {
    if (url.includes(needle)) return data;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const forceRefresh = req.query.refresh === "true";

  if (!forceRefresh) {
    try {
      const cached = await kv.get(CACHE_KEY);
      if (cached) {
        const data = typeof cached === "string" ? JSON.parse(cached) : cached;
        return res.status(200).json({ ...data, cached: true });
      }
    } catch { /* seguimos sin caché */ }
  }

  const auth = getGoogleAuth([SCOPES.searchConsole]);
  if (!auth) {
    return res.status(200).json({ configured: false, articulos: [] });
  }

  try {
    const [{ pages, periodo }, metas] = await Promise.all([
      fetchGSCPages(auth),
      getArticlesMeta(),
    ]);

    const hoy = new Date();
    const articulos = metas
      .filter((a) => a.slug || a.wpLink)
      .map((a) => {
        const gsc = matchPage(pages, a.slug, a.wpLink);
        const dias = a.fecha ? Math.max(0, Math.round((hoy - new Date(a.fecha)) / 86400000)) : null;
        return {
          titulo: a.titulo || a.tema,
          slug: a.slug || "",
          url: a.wpLink || null,
          fecha: a.fecha || "",
          dias,
          enGSC: !!gsc,
          clics: gsc?.clics ?? 0,
          impresiones: gsc?.impresiones ?? 0,
          posicion: gsc?.posicion ?? null,
          ctr: gsc?.ctr ?? null,
        };
      })
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const data = { configured: true, periodo, generatedAt: new Date().toISOString(), articulos };

    try {
      await kv.set(CACHE_KEY, JSON.stringify(data), { ex: CACHE_TTL });
    } catch { /* sin caché seguimos */ }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Performance API error:", err);
    return res.status(200).json({ configured: true, articulos: [], error: "No se pudo cargar el rendimiento" });
  }
}
