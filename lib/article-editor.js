// ─── lib/article-editor.js ───────────────────────────────────────────────────
// Manipulación del artículo en markdown como FUNCIONES PURAS (string → string).
// Antes esta lógica vivía dentro del componente Home usando setArticulo
// directamente, lo que obligaba a encadenar setTimeout(50ms) para aplicar
// varios elementos seguidos (carrera de estados). Puras = encadenables + testeables.

/** Divide el markdown en bloques por secciones H2. */
export function splitBlocks(text) {
  const lines = text.split("\n");
  const blocks = [];
  let current = [];
  for (const line of lines) {
    if (line.startsWith("## ") && current.length > 0) {
      blocks.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current.join("\n"));
  return blocks.filter((b) => b.trim());
}

/** Inserta una imagen markdown después del bloque indicado. */
export function insertImageAfterBlock(articulo, img, afterBlockIdx) {
  const blocks = splitBlocks(articulo);
  blocks.splice(afterBlockIdx + 1, 0, `![${img.descripcion || ""}](${img.src})`);
  return blocks.join("\n\n");
}

/**
 * Inserta un elemento CRO/Landing en la posición semánticamente correcta.
 * Lógica de posicionamiento (en orden de prioridad):
 *   1. INTRO          → tras el H1
 *   2. CIERRE         → en la ÚLTIMA sección H2 (al fin)
 *   3. H2: <nombre>   → sección que mejor encaje (fuzzy matching por solapamiento)
 *   4. Fallback       → según tipo: objeción → 2ª sección; CTA/prueba → última
 * Siempre antes del bloque de metadatos SEO (delimitado por \n---\n).
 * @returns {string} el artículo con el elemento insertado
 */
export function insertElementInArticle(articulo, element) {
  if (!element?.text) return articulo;
  const { text, placement, position, type } = element;

  // ── Separar cuerpo del bloque meta ─────────────────────────────────────
  const metaIdx = articulo.indexOf("\n---\n");
  const cuerpo = metaIdx !== -1 ? articulo.slice(0, metaIdx) : articulo;
  const metaBloque = metaIdx !== -1 ? articulo.slice(metaIdx) : "";

  const lines = cuerpo.split("\n");

  // ── Índice de todas las secciones H2 ───────────────────────────────────
  const h2Indices = lines.reduce((acc, l, i) => {
    if (/^## /.test(l)) acc.push(i);
    return acc;
  }, []);

  // Helper: inserta text en una sección (sectIdx = línea del H2)
  const insertarEnSeccion = (sectIdx, nextSectIdx, pos) => {
    if (pos === "inicio") {
      lines.splice(sectIdx + 1, 0, "", text, "");
    } else if (nextSectIdx !== -1) {
      lines.splice(nextSectIdx, 0, text, "");
    } else {
      lines.push("", text);
    }
    return lines.join("\n") + metaBloque;
  };

  // ── 1. INTRO: tras el H1 ───────────────────────────────────────────────
  if (/^INTRO$/i.test(placement)) {
    const h1Idx = lines.findIndex((l) => /^# /.test(l));
    lines.splice(h1Idx >= 0 ? h1Idx + 1 : 0, 0, "", text, "");
    return lines.join("\n") + metaBloque;
  }

  // ── 2. CIERRE: última sección H2, al fin ───────────────────────────────
  if (/^CIERRE$/i.test(placement)) {
    if (h2Indices.length > 0) {
      return insertarEnSeccion(h2Indices[h2Indices.length - 1], -1, "fin");
    }
    lines.push("", text);
    return lines.join("\n") + metaBloque;
  }

  // ── 3. H2 específico: fuzzy matching ───────────────────────────────────
  const h2Match = placement?.match(/H2:\s*(.+)/i);
  if (h2Match) {
    const targetSection = h2Match[1].trim().toLowerCase();
    const targetWords = targetSection.split(/\s+/).filter((w) => w.length > 3);

    let bestIdx = -1;
    let bestScore = 0;
    let bestNextIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      if (!/^## /.test(lines[i])) continue;
      const h2text = lines[i].replace(/^## /, "").trim().toLowerCase();

      let score = 0;
      if (h2text.includes(targetSection) || targetSection.includes(h2text)) {
        score = 2;
      } else if (targetWords.length > 0) {
        const h2Words = h2text.split(/\s+/);
        const matched = targetWords.filter((w) => h2Words.some((hw) => hw.includes(w) || w.includes(hw))).length;
        score = matched / targetWords.length; // 0–1
      }

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
        bestNextIdx = -1;
        for (let j = i + 1; j < lines.length; j++) {
          if (/^## /.test(lines[j])) { bestNextIdx = j; break; }
        }
      }
    }

    if (bestScore >= 0.5) {
      return insertarEnSeccion(bestIdx, bestNextIdx, position || "fin");
    }
    // Si no hay match suficiente, cae al fallback por tipo
  }

  // ── 4. Fallback por tipo del elemento ──────────────────────────────────
  if (h2Indices.length === 0) {
    lines.push("", text);
    return lines.join("\n") + metaBloque;
  }

  const isEarlyType = /^(objecion|objecci|especificidad|reciprocidad)$/i.test(type || "");

  let targetIdx, nextIdx;
  if (isEarlyType && h2Indices.length >= 2) {
    targetIdx = h2Indices[1];
    nextIdx = h2Indices[2] ?? -1;
  } else {
    targetIdx = h2Indices[h2Indices.length - 1];
    nextIdx = -1;
  }

  return insertarEnSeccion(targetIdx, nextIdx, position || "fin");
}

/** Aplica varios elementos en cadena. */
export function insertElementsInArticle(articulo, elements) {
  return (elements || []).reduce((acc, el) => insertElementInArticle(acc, el), articulo);
}

/**
 * Aplica un enlace interno: busca el anchor text sin enlazar en el artículo
 * y lo convierte en [anchor](url). Devuelve el artículo (igual si no aplica).
 * Nota: la versión original concatenaba el match completo "](url)" y producía
 * "[anchor]](url)" con un corchete de más en el artículo publicado.
 */
export function applyInternalLink(articulo, sentence) {
  if (!sentence) return articulo;
  const anchorMatch = sentence.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (!anchorMatch) return articulo;
  const [, anchorText, url] = anchorMatch;
  if (articulo.includes(anchorText) && !articulo.includes(`[${anchorText}](`)) {
    return articulo.replace(anchorText, `[${anchorText}](${url})`);
  }
  return articulo;
}

/** Reemplaza el H1 del artículo por un título nuevo. */
export function applyTitle(articulo, newTitle) {
  return articulo.replace(/^# .+$/m, `# ${newTitle}`);
}
