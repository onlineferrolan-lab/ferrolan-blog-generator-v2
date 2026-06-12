import { getArticlesMeta } from "../../lib/article-store";

// ─── Articles List API ─────────────────────────────────────────────────────
// Devuelve los artículos publicados, ordenados por fecha (más recientes primero).
// Usado por el frontend para mostrar el historial.
// Paginación opcional: ?limit=20&offset=0 (sin parámetros devuelve todos,
// como hasta ahora). "total" siempre es el total real.

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const metas = await getArticlesMeta();

    const all = metas
      .map((parsed) => ({
        id: parsed.id,
        tema: parsed.tema,
        titulo: parsed.titulo,
        categoria: parsed.categoria,
        keywords: parsed.keywords,
        slug: parsed.slug,
        tags: parsed.tags,
        fecha: parsed.fecha,
        wpStatus: parsed.wpStatus || null,
      }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const limit = parseInt(req.query.limit, 10);
    const offset = parseInt(req.query.offset, 10) || 0;
    const articles = Number.isFinite(limit) && limit > 0 ? all.slice(offset, offset + limit) : all;

    return res.status(200).json({ articles, total: all.length });
  } catch (err) {
    console.error("KV fetch error:", err);
    return res.status(200).json({ articles: [], total: 0, error: "No se pudo cargar el historial" });
  }
}
