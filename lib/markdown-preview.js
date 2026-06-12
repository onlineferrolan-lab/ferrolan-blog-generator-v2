// ─── lib/markdown-preview.js ─────────────────────────────────────────────────
// Conversión Markdown → HTML para la pestaña "HTML" del frontend (preview).
// OJO: lo que se publica en WordPress usa lib/markdown-to-html.js — esta
// versión normaliza los enlaces a absolutos (https://ferrolan.es/...) para
// que el preview sea navegable, mientras que la de WP los hace relativos.

export function markdownToPreviewHtml(md) {
  let html = md
    // Headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italics
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links — normaliza URLs de ferrolan.es para el preview
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      const u = (url || "").trim();
      let fullUrl;
      if (u.startsWith("http://") || u.startsWith("https://")) {
        fullUrl = u; // ya absoluta
      } else if (/^ferrolan\.es/.test(u)) {
        fullUrl = `https://${u}`; // dominio desnudo → añadir protocolo
      } else if (u.startsWith("/")) {
        fullUrl = `https://ferrolan.es${u}`; // relativa → absoluta para el preview
      } else {
        fullUrl = u;
      }
      return `<a href="${fullUrl}">${text}</a>`;
    })
    // Horizontal rules
    .replace(/^---$/gm, "<hr>")
    // Line breaks between blocks
    .replace(/\n\n/g, "\n</p>\n<p>\n")
    // List items
    .replace(/^- (.+)$/gm, "<li>$1</li>");

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>\n$1</ul>\n");

  // Wrap remaining loose text in <p>
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

  // Clean up double <p> wrapping
  return result.join("\n")
    .replace(/<p><p>/g, "<p>")
    .replace(/<\/p><\/p>/g, "</p>")
    .replace(/<p><h/g, "<h")
    .replace(/<\/h([1-6])><\/p>/g, "</h$1>")
    .replace(/<p><ul>/g, "<ul>")
    .replace(/<\/ul><\/p>/g, "</ul>")
    .replace(/<p><hr><\/p>/g, "<hr>")
    .replace(/<p><hr>/g, "<hr>")
    .replace(/<p>\s*<\/p>/g, "");
}
