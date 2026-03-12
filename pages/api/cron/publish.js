import { kv } from "@vercel/kv";

// ─── Cron: Auto-publish scheduled articles to WordPress ────────────────────
// Ejecutado por Vercel Cron cada hora (configurable en vercel.json).
// Comprueba si hay artículos programados cuya fecha ya ha pasado
// y los publica en WordPress via REST API.

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
  // Verificar que es una llamada legítima del cron
  // Vercel envía el header Authorization con CRON_SECRET
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();
  const results = { checked: 0, published: 0, failed: 0, errors: [] };

  try {
    // Obtener todos los artículos programados
    const ids = await kv.lrange("scheduled:index", 0, -1);
    if (!ids || ids.length === 0) {
      return res.status(200).json({ message: "No scheduled articles", ...results });
    }

    const records = await Promise.all(ids.map((id) => kv.get(id)));

    for (let i = 0; i < records.length; i++) {
      const raw = records[i];
      if (!raw) continue;

      const entry = typeof raw === "string" ? JSON.parse(raw) : raw;
      results.checked++;

      // Solo procesar artículos con status "scheduled"
      if (entry.status !== "scheduled") continue;

      // Comprobar si la fecha de publicación ya pasó
      const publishTime = new Date(entry.publishDate);
      if (publishTime > now) continue; // Aún no es la hora

      // ¡Es hora de publicar!
      try {
        const wpResult = await publishToWordPress(entry);

        // Actualizar estado en KV
        entry.status = "published";
        entry.wpPostId = wpResult.id;
        entry.wpLink = wpResult.link;
        entry.publishedAt = now.toISOString();
        await kv.set(entry.id, JSON.stringify(entry));

        results.published++;
        console.log(`✅ Published: "${entry.titulo}" → ${wpResult.link}`);
      } catch (pubErr) {
        // Marcar como fallido
        entry.status = "failed";
        entry.error = pubErr.message;
        entry.failedAt = now.toISOString();
        await kv.set(entry.id, JSON.stringify(entry));

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
