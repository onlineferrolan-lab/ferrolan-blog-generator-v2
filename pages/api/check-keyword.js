import { kv } from "@vercel/kv";
import { normalizeKeyword, normalizeSlug, matchType } from "../../lib/keyword-utils";

// ─── Check Keyword API ────────────────────────────────────────────────────────
// POST { keyword: string }
//
// Comprueba si una keyword ya está cubierta por algún artículo publicado,
// consultando tanto los artículos generados en esta app (KV articles:index)
// como los posts sincronizados de WordPress (KV wp:posts:index).
//
// Respuesta:
// {
//   available: boolean,
//   conflicts: [{ title, slug, url, source: "kv"|"wordpress", matchType: "exact"|"contains"|"overlap" }]
// }

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { keyword } = req.body;
  if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
    return res.status(400).json({ error: "El parámetro 'keyword' es obligatorio." });
  }

  const normalizedKw = normalizeKeyword(keyword.trim());
  if (!normalizedKw) {
    return res.status(400).json({ error: "Keyword inválida después de normalización." });
  }

  try {
    // ── 1. Cargar artículos KV ───────────────────────────────────────────────
    const [kvIds, wpIds] = await Promise.all([
      kv.lrange("articles:index", 0, -1),
      kv.lrange("wp:posts:index", 0, -1),
    ]);

    // ── 2. Cargar registros en paralelo ──────────────────────────────────────
    const [kvRecordsRaw, wpRecordsRaw] = await Promise.all([
      kvIds.length > 0
        ? Promise.all(kvIds.map((id) => kv.get(id)))
        : Promise.resolve([]),
      wpIds.length > 0
        ? Promise.all(wpIds.map((id) => kv.get(`wp:post:${id}`)))
        : Promise.resolve([]),
    ]);

    const conflicts = [];

    // ── 3. Chequear artículos KV ─────────────────────────────────────────────
    for (const raw of kvRecordsRaw) {
      if (!raw) continue;
      const article = typeof raw === "string" ? JSON.parse(raw) : raw;

      const fieldsToCheck = [
        { value: article.titulo, type: "title" },
        { value: article.slug, type: "slug", isSlug: true },
        { value: article.keywords, type: "keywords" },
        { value: article.tema, type: "tema" },
      ];

      let bestMatch = null;
      for (const field of fieldsToCheck) {
        if (!field.value) continue;
        const normalizedField = field.isSlug
          ? normalizeSlug(field.value)
          : normalizeKeyword(field.value);
        const mt = matchType(normalizedKw, normalizedField);
        if (mt) {
          // Priorizar: exact > contains > overlap
          if (
            !bestMatch ||
            mt === "exact" ||
            (mt === "contains" && bestMatch !== "exact")
          ) {
            bestMatch = mt;
          }
        }
      }

      if (bestMatch) {
        const wpUrl = process.env.WORDPRESS_URL
          ? `${process.env.WORDPRESS_URL.replace(/\/$/, "")}/blog/${article.slug}`
          : null;
        conflicts.push({
          title: article.titulo || article.tema || "Sin título",
          slug: article.slug || "",
          url: wpUrl,
          source: "kv",
          matchType: bestMatch,
          date: article.fecha || "",
        });
      }
    }

    // ── 4. Chequear posts WordPress ──────────────────────────────────────────
    for (const raw of wpRecordsRaw) {
      if (!raw) continue;
      const post = typeof raw === "string" ? JSON.parse(raw) : raw;

      const fieldsToCheck = [
        { value: post.title, type: "title" },
        { value: post.slug, type: "slug", isSlug: true },
      ];

      let bestMatch = null;
      for (const field of fieldsToCheck) {
        if (!field.value) continue;
        const normalizedField = field.isSlug
          ? normalizeSlug(field.value)
          : normalizeKeyword(field.value);
        const mt = matchType(normalizedKw, normalizedField);
        if (mt) {
          if (
            !bestMatch ||
            mt === "exact" ||
            (mt === "contains" && bestMatch !== "exact")
          ) {
            bestMatch = mt;
          }
        }
      }

      if (bestMatch) {
        conflicts.push({
          title: post.title || post.slug || "Sin título",
          slug: post.slug || "",
          url: post.link || null,
          source: "wordpress",
          matchType: bestMatch,
          date: post.date ? post.date.slice(0, 10) : "",
        });
      }
    }

    // Ordenar: exactos primero, luego contains, luego overlap
    const order = { exact: 0, contains: 1, overlap: 2 };
    conflicts.sort((a, b) => (order[a.matchType] || 2) - (order[b.matchType] || 2));

    return res.status(200).json({
      available: conflicts.length === 0,
      keyword: keyword.trim(),
      normalizedKeyword: normalizedKw,
      conflicts,
    });
  } catch (err) {
    console.error("[check-keyword] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
