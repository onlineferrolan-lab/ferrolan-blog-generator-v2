import { describe, it, expect } from "vitest";
import { markdownToHtml } from "../lib/markdown-to-html";

describe("markdownToHtml", () => {
  it("convierte encabezados", () => {
    const html = markdownToHtml("# Uno\n## Dos\n### Tres");
    expect(html).toContain("<h1>Uno</h1>");
    expect(html).toContain("<h2>Dos</h2>");
    expect(html).toContain("<h3>Tres</h3>");
  });

  it("convierte negrita y cursiva", () => {
    const html = markdownToHtml("Texto **fuerte** y *suave*.");
    expect(html).toContain("<strong>fuerte</strong>");
    expect(html).toContain("<em>suave</em>");
  });

  it("envuelve párrafos en <p>", () => {
    const html = markdownToHtml("Primer párrafo.\n\nSegundo párrafo.");
    expect(html).toContain("<p>Primer párrafo.</p>");
    expect(html).toContain("<p>Segundo párrafo.</p>");
  });

  it("agrupa listas consecutivas en <ul>", () => {
    const html = markdownToHtml("- uno\n- dos\n- tres");
    expect(html).toMatch(/<ul>\s*<li>uno<\/li>\s*<li>dos<\/li>\s*<li>tres<\/li>\s*<\/ul>/);
  });

  it("convierte enlaces absolutos de ferrolan.es a relativos", () => {
    const html = markdownToHtml("Visita [baños](https://ferrolan.es/banos) hoy.");
    expect(html).toContain('<a href="/banos">baños</a>');
  });

  it("convierte dominio desnudo ferrolan.es a relativo", () => {
    const html = markdownToHtml("Mira [esto](ferrolan.es/cocinas).");
    expect(html).toContain('<a href="/cocinas">esto</a>');
  });

  it("deja URLs externas intactas", () => {
    const html = markdownToHtml("Fuente: [estudio](https://example.com/datos).");
    expect(html).toContain('<a href="https://example.com/datos">estudio</a>');
  });

  it("deja URLs relativas intactas", () => {
    const html = markdownToHtml("[parquet](/parquet)");
    expect(html).toContain('<a href="/parquet">parquet</a>');
  });

  it("descarta el bloque meta tras ---", () => {
    const html = markdownToHtml("# Título\n\nContenido.\n---\nMeta título: X\nSlug: y");
    expect(html).not.toContain("Meta título");
    expect(html).not.toContain("Slug");
  });

  it("no envuelve encabezados en <p>", () => {
    const html = markdownToHtml("# Título\n\nTexto.");
    expect(html).not.toContain("<p><h1>");
  });
});
