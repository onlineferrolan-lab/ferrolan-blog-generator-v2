import { kv } from "@vercel/kv";
import { extractSlug, extractTitle, extractMetaDescription, extractTags } from "../../lib/article-utils";
import { markdownToHtml } from "../../lib/markdown-to-html";

// ─── Publish Now API ────────────────────────────────────────────────────────
// Publica un artículo directamente en WordPress sin esperar al cron.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tema, categoria, keywords, tono, articulo } = req.body;

  if (!articulo || !tema) {
    return res.status(400).json({ error: "Faltan datos: tema y artículo son obligatorios" });
  }

  const wpUrl = process.env.WORDPRESS_URL;
  const wpUser = process.env.WORDPRESS_USER;
  const wpAppPassword = process.env.WORDPRESS_APP_PASSWORD;

  if (!wpUrl || !wpUser || !wpAppPassword) {
    return res.status(500).json({ error: "WordPress no configurado. Añade WORDPRESS_URL, WORDPRESS_USER y WORDPRESS_APP_PASSWORD en Vercel." });
  }

  try {
    const titulo = extractTitle(articulo) || tema;
    const slug = extractSlug(articulo);
    const metaDescription = extractMetaDescription(articulo);
    const tags = extractTags(articulo);
    const htmlContent = markdownToHtml(articulo);

    const apiUrl = `${wpUrl.replace(/\/$/, "")}/wp-json/wp/v2`;
    const authHeader = "Basic " + Buffer.from(`${wpUser}:${wpAppPassword}`).toString("base64");

    // 1. Resolver tags
    let tagIds = [];
    for (const tagName of tags) {
      try {
        const searchRes = await fetch(`${apiUrl}/tags?search=${encodeURIComponent(tagName)}`, {
          headers: { Authorization: authHeader },
        });
        const existingTags = await searchRes.json();
        const match = existingTags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());

        if (match) {
          tagIds.push(match.id);
        } else {
          const createRes = await fetch(`${apiUrl}/tags`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify({ name: tagName }),
          });
          if (createRes.ok) {
            const newTag = await createRes.json();
            tagIds.push(newTag.id);
          }
        }
      } catch (tagErr) {
        console.error(`Tag error for "${tagName}":`, tagErr.message);
      }
    }

    // 2. Crear el post
    const postData = {
      title: titulo,
      content: htmlContent,
      status: "publish",
      slug: slug || undefined,
      excerpt: metaDescription || undefined,
      tags: tagIds.length > 0 ? tagIds : undefined,
    };

    const wpRes = await fetch(`${apiUrl}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(postData),
    });

    if (!wpRes.ok) {
      const errorText = await wpRes.text();
      throw new Error(`WordPress API error ${wpRes.status}: ${errorText}`);
    }

    const wpPost = await wpRes.json();

    // 3. Guardar en historial de artículos para que Claude no repita
    const articleId = `article:${Date.now()}`;
    await kv.set(articleId, JSON.stringify({
      id: articleId,
      tema,
      categoria: categoria || "",
      keywords: keywords || "",
      titulo,
      slug,
      tags,
      fecha: new Date().toISOString().split("T")[0],
      contenido: articulo,
      wpPostId: wpPost.id,
      wpLink: wpPost.link,
    }));
    await kv.lpush("articles:index", articleId);

    return res.status(200).json({
      published: true,
      wpPostId: wpPost.id,
      wpLink: wpPost.link,
      titulo,
    });
  } catch (err) {
    console.error("Publish error:", err);
    return res.status(500).json({ error: "Error al publicar: " + err.message });
  }
}
