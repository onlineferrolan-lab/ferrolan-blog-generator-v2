import { extractSlug, extractTitle, extractMetaDescription, extractTags } from "../../lib/article-utils";
import { saveArticleRecord } from "../../lib/article-store";
import { markdownToHtml } from "../../lib/markdown-to-html";
import { uploadEmbeddedImagesToWP } from "../../lib/wp-media";
import { validateBody, MAX } from "../../lib/validate";

// ─── Publish Now API ────────────────────────────────────────────────────────
// Sube un artículo a WordPress como BORRADOR para revisión final.

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const validationError = validateBody(req.body, {
    articulo: { required: true, max: MAX.articulo },
    tema: { required: true, max: MAX.tema },
    keywords: { max: MAX.keywords },
    categoria: { max: MAX.corto },
  });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { tema, categoria, keywords, tono, articulo, wpCategoryId } = req.body;

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

    const apiUrl = `${wpUrl.replace(/\/$/, "")}/wp-json/wp/v2`;
    const authHeader = "Basic " + Buffer.from(`${wpUser}:${wpAppPassword}`).toString("base64");

    // 0. Subir las imágenes IA embebidas (base64) a la media library de WP
    //    y sustituirlas por sus URLs reales antes de convertir a HTML.
    const { markdown: articuloConMedia, uploaded: mediaUploaded } =
      await uploadEmbeddedImagesToWP(articulo, { apiUrl, authHeader, slug });
    const htmlContent = markdownToHtml(articuloConMedia);

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

    // 2. Crear el post como BORRADOR
    const postData = {
      title: titulo,
      content: htmlContent,
      status: "draft",
      slug: slug || undefined,
      excerpt: metaDescription || undefined,
      tags: tagIds.length > 0 ? tagIds : undefined,
      categories: wpCategoryId ? [Number(wpCategoryId)] : undefined,
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
    await saveArticleRecord({
      id: articleId,
      tema,
      categoria: categoria || "",
      keywords: keywords || "",
      titulo,
      slug,
      tags,
      fecha: new Date().toISOString().split("T")[0],
      contenido: articuloConMedia,
      wpPostId: wpPost.id,
      wpLink: wpPost.link,
      wpStatus: "draft",
    });

    return res.status(200).json({
      published: true,
      wpPostId: wpPost.id,
      wpLink: wpPost.link,
      wpEditLink: `${wpUrl.replace(/\/$/, "")}/wp-admin/post.php?post=${wpPost.id}&action=edit`,
      titulo,
      mediaUploaded,
      status: "draft",
    });
  } catch (err) {
    // El detalle (respuesta cruda de WordPress incluida) queda en logs
    console.error("Publish error:", err);
    return res.status(500).json({ error: "Error al subir el borrador a WordPress. Revisa los logs del servidor." });
  }
}
