// ─── lib/markdown-to-html.js ────────────────────────────────────────────────
// Conversión Markdown → HTML para publicación en WordPress.
// Usada por: publish-now.js, schedule-article.js, cron/publish.js
//
// Nota: existe otra versión en pages/index.js para el preview del frontend.
// Esta es la versión server-side optimizada para WordPress.

/**
 * Convierte Markdown a HTML listo para WordPress.
 * Separa el contenido del bloque meta SEO (delimitado por ---).
 * Convierte headings, bold, italic, links, listas.
 * Los enlaces relativos se expanden a https://ferrolan.es
 */
export function markdownToHtml(md) {
  // Separar contenido del bloque meta SEO
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

  // Envolver <li> consecutivos en <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>\n$1</ul>\n");

  // Envolver texto suelto en <p>
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

  // Limpiar wrapping doble
  return result
    .join("\n")
    .replace(/<p><h/g, "<h")
    .replace(/<\/h([1-6])><\/p>/g, "</h$1>")
    .replace(/<p><ul>/g, "<ul>")
    .replace(/<\/ul><\/p>/g, "</ul>")
    .replace(/<p>\s*<\/p>/g, "");
}
