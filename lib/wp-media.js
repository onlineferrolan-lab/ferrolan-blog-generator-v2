// ─── lib/wp-media.js ─────────────────────────────────────────────────────────
// Subida de imágenes a la media library de WordPress.
//
// Las imágenes generadas por IA viven como data URLs base64 dentro del
// markdown del artículo (las inserta el drag & drop del dashboard). Publicar
// eso tal cual incrustaría megabytes de base64 en el post. Antes de publicar,
// cada data URL se sube a wp/v2/media y se sustituye por la URL real.

const DATA_IMAGE_RE = /!\[([^\]]*)\]\((data:image\/([a-z+]+);base64,([^)]+))\)/g;

/** Encuentra las imágenes base64 embebidas en el markdown. */
export function findDataUrlImages(markdown) {
  const out = [];
  for (const m of markdown.matchAll(DATA_IMAGE_RE)) {
    out.push({ full: m[0], alt: m[1], dataUrl: m[2], format: m[3], base64: m[4] });
  }
  return out;
}

function slugifyFilename(text, fallback) {
  const slug = (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

async function uploadOne(img, index, { apiUrl, authHeader, slug }) {
  const ext = img.format === "jpeg" ? "jpg" : img.format.replace("+xml", "");
  const filename = `${slugifyFilename(slug || img.alt, "imagen")}-${index + 1}.${ext}`;
  const buffer = Buffer.from(img.base64, "base64");

  const res = await fetch(`${apiUrl}/media`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": `image/${img.format}`,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
    body: buffer,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WP media upload error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const media = await res.json();
  // Marcar el alt text en WP para accesibilidad/SEO (best-effort)
  if (img.alt && media.id) {
    fetch(`${apiUrl}/media/${media.id}`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ alt_text: img.alt }),
    }).catch(() => {});
  }
  return media.source_url;
}

/**
 * Sube todas las imágenes base64 del markdown a WordPress y devuelve el
 * markdown con las URLs reales. Si una subida falla, se conserva la imagen
 * embebida (mejor publicar pesado que perder la imagen).
 *
 * @returns {Promise<{ markdown: string, uploaded: number, failed: number }>}
 */
export async function uploadEmbeddedImagesToWP(markdown, { apiUrl, authHeader, slug }) {
  const images = findDataUrlImages(markdown);
  if (images.length === 0) return { markdown, uploaded: 0, failed: 0 };

  let result = markdown;
  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    try {
      const url = await uploadOne(img, i, { apiUrl, authHeader, slug });
      result = result.replace(img.full, `![${img.alt}](${url})`);
      uploaded++;
    } catch (err) {
      console.error(`[wp-media] fallo subiendo imagen ${i + 1}:`, err.message);
      failed++;
    }
  }

  return { markdown: result, uploaded, failed };
}
