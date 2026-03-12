import { kv } from "@vercel/kv";

// ─── Publish Now API ────────────────────────────────────────────────────────
// Publica un artículo directamente en WordPress sin esperar al cron.

function extractSlug(text) {
  const match = text.match(/slug[^:]*:\s*([^\n]+)/i);
  return match ? match[1].trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") : null;
}

function extractTitle(text) {
  const match = text.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : null;
}

function extractMetaDescription(text) {
  const match = text.match(/meta\s*descripci[oó]n[^:]*:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

function extractTags(text) {
  const match = text.match(/etiquetas?[^:]*:\s*([^\n]+)/i);
  if (!match) return [];
  return match[1].split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5);
}

function markdownToHtml(md) {
  const parts = md.split(/\n---\n/);
  const content = parts[0];

  let html = content
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      const fullUrl = url.startsWith("/") ? `https://ferrolan.es${url}` : url;
      return `<a href="${fullUrl}">${text}</a>`;
    })
    .replace(/^- (.+)$/gm, "<li>$1</li>");

  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>\n$1</ul>\n");

  const lines = html.split("\n");
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^<(h[1-6]|ul|li|hr|p|\/p|\/ul)/.test(trimmed)) {
      result.push(trimmed);
    } else {
      result.push(`<p>${trimmed}</p>`);
    }
  }

  return result.join("\n")
    .replace(/<p><h/g, "<h")
    .replace(/<\/h([1-6])><\/p>/g, "</h$1>")
    .replace(/<p><ul>/g, "<ul>")
    .replace(/<\/ul><\/p>/g, "</ul>")
    .replace(/<p>\s*<\/p>/g, "");
}

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
