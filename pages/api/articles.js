import { kv } from "@vercel/kv";

// ─── Articles List API ─────────────────────────────────────────────────────
// Devuelve todos los artículos publicados, ordenados por fecha (más recientes primero).
// Usado por el frontend para mostrar el historial y por generate.js para evitar repetir temas.

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const ids = await kv.lrange("articles:index", 0, -1);

    if (!ids || ids.length === 0) {
      return res.status(200).json({ articles: [], total: 0 });
    }

    const records = await Promise.all(ids.map((id) => kv.get(id)));

    const articles = records
      .filter(Boolean)
      .map((r) => {
        const parsed = typeof r === "string" ? JSON.parse(r) : r;
        // No devolvemos el contenido completo en el listado para ahorrar ancho de banda
        return {
          id: parsed.id,
          tema: parsed.tema,
          titulo: parsed.titulo,
          categoria: parsed.categoria,
          keywords: parsed.keywords,
          slug: parsed.slug,
          tags: parsed.tags,
          fecha: parsed.fecha,
          wpStatus: parsed.wpStatus || null,
        };
      })
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return res.status(200).json({ articles, total: articles.length });
  } catch (err) {
    console.error("KV fetch error:", err);
    return res.status(200).json({ articles: [], total: 0, error: err.message });
  }
}
