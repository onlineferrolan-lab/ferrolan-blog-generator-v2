import { describe, it, expect } from "vitest";
import { buildMetaReport, renderDigestEmail } from "../lib/digest";

const ARTICULO = `# Cómo elegir azulejos para el baño

Párrafo introductorio sobre azulejos de baño y su importancia.

## Tipos de azulejos

Contenido sobre tipos.

## Cómo combinarlos

Más contenido aquí con varias palabras de relleno.

### Subsección

Detalle.

---

Meta título: Azulejos de baño: guía
Meta descripción: Aprende a elegir los azulejos perfectos para tu baño.
Slug URL sugerido: como-elegir-azulejos-bano
Etiquetas: azulejos, baño, cerámica
`;

describe("buildMetaReport", () => {
  it("extrae metadatos y cuenta estructura del cuerpo (sin el bloque meta)", () => {
    const r = buildMetaReport(ARTICULO, { keywords: "azulejos baño, cerámica", categoria: "Baño" });
    expect(r.titulo).toBe("Cómo elegir azulejos para el baño");
    expect(r.slug).toBe("como-elegir-azulejos-bano");
    expect(r.metaDescripcion).toBe("Aprende a elegir los azulejos perfectos para tu baño.");
    expect(r.tags).toEqual(["azulejos", "baño", "cerámica"]);
    expect(r.keywords).toBe("azulejos baño, cerámica");
    expect(r.categoria).toBe("Baño");
    expect(r.h2).toBe(2);
    expect(r.h3).toBe(1);
    expect(r.palabras).toBeGreaterThan(0);
  });

  it("no cuenta el bloque meta en las palabras", () => {
    const conMeta = buildMetaReport(ARTICULO);
    const sinMeta = buildMetaReport(ARTICULO.split("\n---\n")[0]);
    expect(conMeta.palabras).toBe(sinMeta.palabras);
  });

  it("tolera markdown vacío o no-string", () => {
    expect(buildMetaReport("").titulo).toBe("(sin título)");
    expect(buildMetaReport(null, { tema: "X" }).titulo).toBe("X");
  });
});

describe("renderDigestEmail", () => {
  const digest = {
    generatedAt: "2026-06-16T08:00:00Z",
    articles: [
      { topic: { motivo: "Alto volumen de búsqueda", categoria: "Baño", keywords: "azulejos baño" }, markdown: ARTICULO, report: buildMetaReport(ARTICULO, { keywords: "azulejos baño", categoria: "Baño" }) },
    ],
  };

  it("genera subject con el número de propuestas y fecha", () => {
    const { subject } = renderDigestEmail(digest);
    expect(subject).toContain("1 propuesta");
    expect(subject).toMatch(/junio/);
  });

  it("el HTML incluye título, slug, keywords y el cuerpo del artículo", () => {
    const { html } = renderDigestEmail(digest);
    expect(html).toContain("Cómo elegir azulejos para el baño");
    expect(html).toContain("como-elegir-azulejos-bano");
    expect(html).toContain("azulejos baño");
    expect(html).toContain("Tipos de azulejos"); // del cuerpo renderizado
  });

  it("la versión texto incluye el markdown completo", () => {
    const { text } = renderDigestEmail(digest);
    expect(text).toContain("PROPUESTA 1");
    expect(text).toContain("Meta descripción");
  });

  it("pluraliza correctamente con varias propuestas", () => {
    const multi = { ...digest, articles: [digest.articles[0], digest.articles[0]] };
    expect(renderDigestEmail(multi).subject).toContain("2 propuestas");
  });
});
