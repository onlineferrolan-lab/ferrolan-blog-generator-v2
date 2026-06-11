// ─── lib/article-utils.js ───────────────────────────────────────────────────
// Funciones compartidas para extraer metadatos del Markdown generado por Claude.
// Usadas por: generate.js, save-article.js, publish-now.js, schedule-article.js

/**
 * Limpia la decoración markdown que Claude suele añadir a los valores del
 * bloque meta ("- **Slug URL:** valor"): asteriscos de negrita, comillas
 * y espacios/guiones de lista alrededor del valor.
 */
function cleanMetaValue(value) {
  return (value || "")
    .replace(/\*+/g, "")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .trim();
}

/**
 * Extrae el slug del bloque meta SEO que Claude genera al final del artículo.
 * Busca patrones como "Slug URL: mi-articulo-sobre-x"
 */
export function extractSlug(text) {
  const match = text.match(/slug[^:]*:\s*([^\n]+)/i);
  if (!match) return null;
  return cleanMetaValue(match[1])
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");
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
  return match ? cleanMetaValue(match[1]) : null;
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
    .map((t) => cleanMetaValue(t))
    .filter(Boolean)
    .slice(0, 5);
}
