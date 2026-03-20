// ─── lib/article-utils.js ───────────────────────────────────────────────────
// Funciones compartidas para extraer metadatos del Markdown generado por Claude.
// Usadas por: generate.js, save-article.js, publish-now.js, schedule-article.js

/**
 * Extrae el slug del bloque meta SEO que Claude genera al final del artículo.
 * Busca patrones como "Slug URL: mi-articulo-sobre-x"
 */
export function extractSlug(text) {
  const match = text.match(/slug[^:]*:\s*([^\n]+)/i);
  return match ? match[1].trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") : null;
}

/**
 * Extrae el título H1 del artículo generado.
 */
export function extractTitle(text) {
  const match = text.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : null;
}

/**
 * Extrae la meta description del bloque SEO.
 * Busca patrones como "Meta descripción: texto aquí"
 */
export function extractMetaDescription(text) {
  const match = text.match(/meta\s*descripci[oó]n[^:]*:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Extrae las etiquetas/tags del bloque SEO.
 * Busca patrones como "Etiquetas: tag1, tag2, tag3"
 */
export function extractTags(text) {
  const match = text.match(/etiquetas?[^:]*:\s*([^\n]+)/i);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);
}
