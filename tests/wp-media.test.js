import { describe, it, expect } from "vitest";
import { findDataUrlImages } from "../lib/wp-media";

const PNG_B64 = "iVBORw0KGgoAAAANSUhEUg=="; // cabecera PNG mínima

describe("findDataUrlImages", () => {
  it("encuentra imágenes base64 embebidas con su alt", () => {
    const md = `# Título\n\n![Baño moderno](data:image/png;base64,${PNG_B64})\n\nTexto.`;
    const imgs = findDataUrlImages(md);
    expect(imgs).toHaveLength(1);
    expect(imgs[0].alt).toBe("Baño moderno");
    expect(imgs[0].format).toBe("png");
    expect(imgs[0].base64).toBe(PNG_B64);
  });

  it("ignora imágenes con URL normal y enlaces", () => {
    const md = "![foto](https://cdn.x/a.png) y [enlace](/banos)";
    expect(findDataUrlImages(md)).toHaveLength(0);
  });

  it("encuentra varias imágenes", () => {
    const md = `![a](data:image/png;base64,${PNG_B64})\n![b](data:image/jpeg;base64,${PNG_B64})`;
    const imgs = findDataUrlImages(md);
    expect(imgs).toHaveLength(2);
    expect(imgs[1].format).toBe("jpeg");
  });
});
