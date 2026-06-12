// ─── lib/gsc-examples.js ─────────────────────────────────────────────────────
// Generación de ideas de artículo a partir de los datos de GSC para el panel
// "Ideas desde GSC" del formulario. Extraído de pages/index.js.

export const EJEMPLOS_FALLBACK = [
  { tema: "Tendencias en pavimentos exteriores para 2026", categoria: "Espacios exteriores", keywords: "pavimento exterior, antideslizante, porcelánico, terraza" },
  { tema: "Cómo elegir el mejor adhesivo para cerámica", categoria: "Consejos", keywords: "adhesivo cerámica, colas, colocación azulejos" },
  { tema: "Cocinas de diseño nórdico: materiales y acabados", categoria: "Cocinas", keywords: "cocina nórdica, madera, blanco, encimera" },
];

const TITLE_PATTERNS = {
  guia: ["Guía completa de {kw}: tipos, usos y cómo elegir", "{Kw}: guía definitiva para acertar en tu proyecto", "Todo lo que necesitas saber sobre {kw}", "{Kw}: la guía que todo profesional debería leer"],
  comparativa: ["{Kw}: ventajas, inconvenientes y alternativas", "{Kw} vs las alternativas más populares del mercado", "Comparativa de {kw}: ¿cuál es la mejor opción?", "{Kw}: diferencias clave que debes conocer antes de decidir"],
  tips: ["Los 7 errores más comunes al elegir {kw}", "Cómo elegir {kw} sin equivocarte: consejos de experto", "5 claves para acertar con {kw} en tu reforma", "{Kw}: lo que nadie te cuenta antes de comprar"],
  tendencias: ["Tendencias en {kw} para 2026: lo que viene este año", "{Kw}: las novedades que están marcando tendencia", "Así se usa {kw} en los proyectos más actuales", "{Kw} en 2026: ideas que inspiran"],
  tutorial: ["Cómo instalar {kw} paso a paso", "{Kw}: instalación, mantenimiento y consejos prácticos", "Cómo trabajar con {kw}: guía práctica", "{Kw}: todo sobre su colocación y cuidado"],
  inspiracion: ["10 ideas con {kw} que transformarán tu espacio", "{Kw}: inspiración para tu próximo proyecto", "Proyectos reales con {kw} que querrás copiar", "Cómo usar {kw} para renovar cualquier estancia"],
};

export function generateArticleTitle(keyword, source) {
  const kw = keyword.toLowerCase();
  const Kw = kw.charAt(0).toUpperCase() + kw.slice(1);
  const groups = source === "nuevo" ? ["guia", "tutorial", "tips"] : source === "quickwin" ? ["tendencias", "inspiracion", "comparativa"] : ["guia", "comparativa", "tips", "tendencias", "tutorial", "inspiracion"];
  const group = groups[Math.floor(Math.random() * groups.length)];
  const patterns = TITLE_PATTERNS[group];
  return patterns[Math.floor(Math.random() * patterns.length)].replace(/\{kw\}/g, kw).replace(/\{Kw\}/g, Kw);
}

// Muestreo ponderado por impresiones: 3 ideas variadas de oportunidades,
// nuevos temas y quick wins.
export function generateExamplesFromGSC(gscData) {
  if (!gscData) return EJEMPLOS_FALLBACK;
  const pool = [];
  (gscData.oportunidades || []).forEach((item) => pool.push({ keywords: item.query, categoria: item.categoria || "", source: "oportunidad", impresiones: item.impresiones }));
  (gscData.nuevosTemasGSC || []).forEach((item) => pool.push({ keywords: item.query, categoria: item.categoria || "", source: "nuevo", impresiones: item.impresiones }));
  (gscData.quickWins || []).forEach((item) => pool.push({ keywords: item.query, categoria: item.categoria || "", source: "quickwin", impresiones: item.impresiones }));
  if (pool.length < 3) return EJEMPLOS_FALLBACK;
  const pick = (arr, count) => {
    const result = [], remaining = [...arr];
    for (let i = 0; i < count && remaining.length > 0; i++) {
      const tw = remaining.reduce((s, x) => s + (x.impresiones || 100), 0);
      let r = Math.random() * tw, idx = 0;
      for (let j = 0; j < remaining.length; j++) { r -= remaining[j].impresiones || 100; if (r <= 0) { idx = j; break; } }
      result.push(remaining.splice(idx, 1)[0]);
    }
    return result;
  };
  return pick(pool, 3).map((item) => ({ tema: generateArticleTitle(item.keywords, item.source), categoria: item.categoria, keywords: item.keywords, source: item.source, impresiones: item.impresiones }));
}
