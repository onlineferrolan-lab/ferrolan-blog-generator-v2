import { getScheduledMeta } from "../../lib/article-store";

// ─── Scheduled Articles List API ────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const metas = await getScheduledMeta();

    const scheduled = metas
      .map((parsed) => {
        return {
          id: parsed.id,
          status: parsed.status,
          titulo: parsed.titulo,
          categoria: parsed.categoria,
          slug: parsed.slug,
          publishDate: parsed.publishDate,
          publishDateFormatted: parsed.publishDateFormatted,
          dayName: parsed.dayName,
          sheetRow: parsed.sheetRow,
          createdAt: parsed.createdAt,
          wpPostId: parsed.wpPostId,
          wpLink: parsed.wpLink,
          error: parsed.error,
        };
      })
      .sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate));

    return res.status(200).json({ scheduled, total: scheduled.length });
  } catch (err) {
    console.error("Scheduled list error:", err);
    return res.status(200).json({ scheduled: [], total: 0, error: "No se pudieron cargar los programados" });
  }
}
