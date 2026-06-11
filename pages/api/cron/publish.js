import { verifyCronRequest } from "../../../lib/cron-auth";
import { getScheduledMeta, getFullRecord, updateScheduledRecord } from "../../../lib/article-store";

// Puede publicar varios artículos pendientes en una misma ejecución
export const config = { maxDuration: 60 };

// ─── Cron: Auto-publish scheduled articles to WordPress ────────────────────
// Ejecutado por Vercel Cron a diario a las 9:00 (configurable en vercel.json).
// Comprueba si hay artículos programados cuya fecha ya ha pasado
// y los publica en WordPress via REST API.
//
// Seguridad: el middleware deja pasar /api/cron/* sin cookie, así que este
// handler EXIGE el header "Authorization: Bearer CRON_SECRET" que Vercel
// añade automáticamente cuando la variable CRON_SECRET está definida.

async function publishToWordPress(entry) {
  const wpUrl = process.env.WORDPRESS_URL; // ej: https://ferrolan.es
  const wpUser = process.env.WORDPRESS_USER;
  const wpAppPassword = process.env.WORDPRESS_APP_PASSWORD;

  if (!wpUrl || !wpUser || !wpAppPassword) {
    throw new Error("WordPress credentials not configured");
  }

  const apiUrl = `${wpUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts`;

  const postData = {
    title: entry.titulo,
    content: entry.contenidoHtml,
    status: "publish",
    slug: entry.slug || undefined,
    excerpt: entry.metaDescription || undefined,
  };

  // Si hay categoría, intentar mapear a WordPress category ID
  // (esto se puede personalizar más adelante con un mapeo de categorías)

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${wpUser}:${wpAppPassword}`).toString("base64"),
    },
    body: JSON.stringify(postData),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`WordPress API error ${res.status}: ${errorText}`);
  }

  const wpPost = await res.json();
  return {
    id: wpPost.id,
    link: wpPost.link,
    status: wpPost.status,
  };
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Verificar que es una llamada legítima del cron (CRON_SECRET obligatorio)
  const auth = verifyCronRequest(req.headers.authorization, process.env.CRON_SECRET);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const now = new Date();
  const results = { checked: 0, published: 0, failed: 0, errors: [] };

  try {
    // Metadatos de todos los programados (un solo comando KV)
    const metas = await getScheduledMeta();
    if (metas.length === 0) {
      return res.status(200).json({ message: "No scheduled articles", ...results });
    }
    results.checked = metas.length;

    // Solo los "scheduled" cuya fecha ya pasó necesitan el registro completo
    const due = metas.filter(
      (m) => m.status === "scheduled" && m.publishDate && new Date(m.publishDate) <= now
    );

    for (const meta of due) {
      // Cargar el registro completo (con contenidoHtml) solo para los que tocan
      const entry = await getFullRecord(meta.id);
      if (!entry) continue;

      // ¡Es hora de publicar!
      try {
        const wpResult = await publishToWordPress(entry);

        // Actualizar estado en KV
        entry.status = "published";
        entry.wpPostId = wpResult.id;
        entry.wpLink = wpResult.link;
        entry.publishedAt = now.toISOString();
        await updateScheduledRecord(entry);

        results.published++;
        console.log(`✅ Published: "${entry.titulo}" → ${wpResult.link}`);
      } catch (pubErr) {
        // Marcar como fallido
        entry.status = "failed";
        entry.error = pubErr.message;
        entry.failedAt = now.toISOString();
        await updateScheduledRecord(entry);

        results.failed++;
        results.errors.push({ id: entry.id, titulo: entry.titulo, error: pubErr.message });
        console.error(`❌ Failed: "${entry.titulo}" — ${pubErr.message}`);
      }
    }

    return res.status(200).json({
      message: `Cron completed at ${now.toISOString()}`,
      ...results,
    });
  } catch (err) {
    console.error("Cron error:", err);
    return res.status(500).json({ error: err.message, ...results });
  }
}
