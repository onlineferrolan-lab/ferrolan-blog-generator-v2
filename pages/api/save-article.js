import { extractSlug, extractTitle, extractMetaDescription, extractTags } from "../../lib/article-utils";
import { saveArticleRecord, deleteArticleRecord } from "../../lib/article-store";
import { validateBody, MAX } from "../../lib/validate";

// ─── Save Article API ──────────────────────────────────────────────────────
// Solo guarda artículos que el usuario decide publicar explícitamente.
// Esto alimenta el historial que generate.js inyecta en el prompt de Claude
// para evitar repetir temas o enfoques.

export default async function handler(req, res) {
  // ─── POST: Guardar artículo ───
  if (req.method === "POST") {
    const validationError = validateBody(req.body, {
      articulo: { required: true, max: MAX.articulo },
      tema: { required: true, max: MAX.tema },
      keywords: { max: MAX.keywords },
      categoria: { max: MAX.corto },
      tono: { max: MAX.corto },
    });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { tema, categoria, keywords, tono, articulo } = req.body;

    try {
      const id = `article:${Date.now()}`;
      const entry = {
        id,
        tema,
        categoria: categoria || "",
        keywords: keywords || "",
        tono: tono || "",
        titulo: extractTitle(articulo) || tema,
        slug: extractSlug(articulo),
        metaDescription: extractMetaDescription(articulo),
        tags: extractTags(articulo),
        fecha: new Date().toISOString().split("T")[0],
        fechaCompleta: new Date().toISOString(),
        contenido: articulo,
      };

      await saveArticleRecord(entry);

      return res.status(200).json({ saved: true, id, entry: { ...entry, contenido: undefined } });
    } catch (err) {
      console.error("KV save error:", err);
      return res.status(500).json({ error: "Error al guardar el artículo" });
    }
  }

  // ─── DELETE: Eliminar artículo ───
  if (req.method === "DELETE") {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Falta el ID del artículo" });
    }

    try {
      await deleteArticleRecord(id);
      return res.status(200).json({ deleted: true, id });
    } catch (err) {
      console.error("KV delete error:", err);
      return res.status(500).json({ error: "Error al eliminar el artículo" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
