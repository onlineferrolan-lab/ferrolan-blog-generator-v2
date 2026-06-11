import { normalizeKeyword } from "../../lib/keyword-utils";
import { loadCoverageIndex, findAllConflicts } from "../../lib/coverage";

// ─── Check Keyword API ────────────────────────────────────────────────────────
// POST { keyword: string }
//
// Comprueba si una keyword ya está cubierta por algún artículo publicado,
// consultando tanto los artículos generados en esta app como los posts
// sincronizados de WordPress (vía lib/coverage + lib/article-store).
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
    const index = await loadCoverageIndex();
    const conflicts = findAllConflicts(keyword.trim(), index);

    return res.status(200).json({
      available: conflicts.length === 0,
      keyword: keyword.trim(),
      normalizedKeyword: normalizedKw,
      conflicts,
    });
  } catch (err) {
    console.error("[check-keyword] Error:", err);
    return res.status(500).json({ error: "No se pudo comprobar la keyword." });
  }
}
