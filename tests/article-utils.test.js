import { describe, it, expect } from "vitest";
import {
  extractSlug,
  extractTitle,
  extractMetaDescription,
  extractTags,
} from "../lib/article-utils";

const ARTICULO = `# Cómo elegir azulejos para el baño

Texto del artículo con varias secciones.

## Una sección

Más texto.

---

Meta título: Azulejos de baño: guía completa
Meta descripción: Aprende a elegir los azulejos perfectos para tu baño.
Slug URL sugerido: como-elegir-azulejos-bano
Etiquetas: azulejos, baño, cerámica, reforma
`;

describe("extractTitle", () => {
  it("extrae el primer H1 del markdown", () => {
    expect(extractTitle(ARTICULO)).toBe("Cómo elegir azulejos para el baño");
  });

  it("devuelve null si no hay H1", () => {
    expect(extractTitle("Texto sin encabezados")).toBeNull();
  });

  it("ignora H2/H3", () => {
    expect(extractTitle("## Solo un H2\nTexto")).toBeNull();
  });
});

describe("extractSlug", () => {
  it("extrae el slug del bloque meta", () => {
    expect(extractSlug(ARTICULO)).toBe("como-elegir-azulejos-bano");
  });

  it("normaliza a minúsculas y guiones", () => {
    expect(extractSlug("Slug: Mi Artículo Nuevo")).toBe("mi-art-culo-nuevo");
  });

  it("devuelve null si no hay slug", () => {
    expect(extractSlug("# Título\nSin bloque meta")).toBeNull();
  });
});

describe("extractMetaDescription", () => {
  it("extrae la meta descripción", () => {
    expect(extractMetaDescription(ARTICULO)).toBe(
      "Aprende a elegir los azulejos perfectos para tu baño."
    );
  });

  it("acepta 'Meta descripcion' sin acento", () => {
    expect(extractMetaDescription("Meta descripcion: Texto plano")).toBe("Texto plano");
  });

  it("devuelve null si no existe", () => {
    expect(extractMetaDescription("# Título")).toBeNull();
  });
});

// Claude a menudo formatea el bloque meta con negrita markdown:
// "- **Slug URL:** valor". Los extractores deben limpiar esa decoración:
// sin esto, el slug llega a WordPress como "---valor" y la meta description
// con asteriscos literales.
describe("bloque meta con formato markdown (negrita/listas)", () => {
  const META_BOLD = `# Título

Contenido.

---

- **Meta título:** Azulejos de baño: guía
- **Meta descripción:** Aprende a elegir los azulejos para tu baño.
- **Slug URL sugerido:** como-elegir-azulejos-bano
- **Etiquetas:** azulejos, baño, **cerámica**
`;

  it("extractSlug limpia negrita y no genera guiones espurios", () => {
    expect(extractSlug(META_BOLD)).toBe("como-elegir-azulejos-bano");
  });

  it("extractMetaDescription limpia asteriscos", () => {
    expect(extractMetaDescription(META_BOLD)).toBe(
      "Aprende a elegir los azulejos para tu baño."
    );
  });

  it("extractTags limpia negrita en cada etiqueta", () => {
    expect(extractTags(META_BOLD)).toEqual(["azulejos", "baño", "cerámica"]);
  });
});

describe("extractTags", () => {
  it("extrae las etiquetas como array", () => {
    expect(extractTags(ARTICULO)).toEqual(["azulejos", "baño", "cerámica", "reforma"]);
  });

  it("limita a 5 etiquetas", () => {
    expect(extractTags("Etiquetas: a, b, c, d, e, f, g")).toHaveLength(5);
  });

  it("devuelve array vacío si no hay etiquetas", () => {
    expect(extractTags("# Título")).toEqual([]);
  });
});
