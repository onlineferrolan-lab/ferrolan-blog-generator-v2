import { kv } from "@vercel/kv";

// ─── Sync Blog Posts API ──────────────────────────────────────────────────────
// GET  → Devuelve estado de la última sincronización con WordPress.
// POST → Sincroniza todos los posts publicados de WordPress a Vercel KV.
//
// Estructura KV resultante:
//   wp:posts:index        → Lista de IDs (strings) de los posts
//   wp:post:{id}          → JSON con metadatos del post
//   wp:sync:meta          → JSON con lastSync, count, totalPages

const WP_POSTS_INDEX = "wp:posts:index";
const WP_SYNC_META = "wp:sync:meta";

function getWpAuth() {
  const url = process.env.WORDPRESS_URL;
  const user = process.env.WORDPRESS_USER;
  const pass = process.env.WORDPRESS_APP_PASSWORD;
  if (!url || !user || !pass) return null;
  return {
    baseUrl: url.replace(/\/$/, ""),
    authHeader: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64"),
  };
}

async function fetchWpPostsPage(auth, page) {
  const url = `${auth.baseUrl}/wp-json/wp/v2/posts?per_page=100&status=publish&page=${page}&_fields=id,slug,title,excerpt,tags,date,link`;
  const res = await fetch(url, {
    headers: { Authorization: auth.authHeader },
  });

  if (res.status === 400) return { posts: [], totalPages: 0 }; // sin posts
  if (!res.ok) throw new Error(`WordPress API error: ${res.status} ${res.statusText}`);

  const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1", 10);
  const posts = await res.json();
  return { posts, totalPages };
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    // ── Estado del sync ──────────────────────────────────────────────────────
    const meta = await kv.get(WP_SYNC_META);
    const count = meta ? meta.count : 0;
    const lastSync = meta ? meta.lastSync : null;

    return res.status(200).json({
      synced: !!meta,
      count,
      lastSync,
      totalPages: meta ? meta.totalPages : 0,
    });
  }

  if (req.method === "POST") {
    // ── Sincronización completa ──────────────────────────────────────────────
    const auth = getWpAuth();
    if (!auth) {
      return res.status(500).json({
        error: "WordPress no configurado. Añade WORDPRESS_URL, WORDPRESS_USER y WORDPRESS_APP_PASSWORD.",
      });
    }

    try {
      // 1. Obtener primera página para conocer el total
      const firstPage = await fetchWpPostsPage(auth, 1);
      const { totalPages } = firstPage;
      let allPosts = [...firstPage.posts];

      // 2. Obtener el resto de páginas en paralelo (máx 10 páginas = 1000 posts)
      const remainingPages = Math.min(totalPages, 10);
      if (remainingPages > 1) {
        const pagePromises = [];
        for (let p = 2; p <= remainingPages; p++) {
          pagePromises.push(fetchWpPostsPage(auth, p));
        }
        const results = await Promise.all(pagePromises);
        for (const r of results) allPosts = allPosts.concat(r.posts);
      }

      // 3. Limpiar índice anterior
      await kv.del(WP_POSTS_INDEX);

      // 4. Guardar cada post + construir índice
      const pipeline = [];
      const savedIds = [];

      for (const post of allPosts) {
        const id = String(post.id);
        const record = {
          id,
          slug: post.slug || "",
          title: post.title?.rendered || post.slug || "",
          excerpt: post.excerpt?.rendered
            ? post.excerpt.rendered.replace(/<[^>]+>/g, "").trim().slice(0, 200)
            : "",
          tags: post.tags || [],
          date: post.date || "",
          link: post.link || "",
        };

        pipeline.push(kv.set(`wp:post:${id}`, JSON.stringify(record)));
        savedIds.push(id);
      }

      // Guardar todos los registros en paralelo
      await Promise.all(pipeline);

      // Guardar índice (lpush en orden inverso para mantener cronológico)
      if (savedIds.length > 0) {
        await kv.lpush(WP_POSTS_INDEX, ...savedIds.reverse());
      }

      // 5. Guardar metadatos del sync
      const meta = {
        lastSync: new Date().toISOString(),
        count: savedIds.length,
        totalPages,
      };
      await kv.set(WP_SYNC_META, JSON.stringify(meta));

      return res.status(200).json({
        success: true,
        synced: savedIds.length,
        totalPages,
        lastSync: meta.lastSync,
      });
    } catch (err) {
      console.error("[sync-blog-posts] Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
