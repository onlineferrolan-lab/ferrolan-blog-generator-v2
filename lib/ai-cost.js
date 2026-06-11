// ─── lib/ai-cost.js ──────────────────────────────────────────────────────────
// Estimación de coste por llamada a los modelos. Precios en USD por millón de
// tokens (MTok). ACTUALIZAR esta tabla cuando cambien las tarifas de los
// proveedores — es solo informativa para el medidor del dashboard.

export const PRICES_PER_MTOK = {
  // Anthropic
  "claude-opus-4-8":            { in: 5,    out: 25 },
  "claude-opus-4-5":            { in: 5,    out: 25 },
  "claude-sonnet-4-6":          { in: 3,    out: 15 },
  "claude-haiku-4-5-20251001":  { in: 1,    out: 5 },
  // OpenAI
  "gpt-4o":                     { in: 2.5,  out: 10 },
  "gpt-4o-mini":                { in: 0.15, out: 0.6 },
};

// Multiplicadores de prompt caching de Anthropic sobre el precio de input
const CACHE_READ_FACTOR = 0.1;   // lectura de caché: 10% del input
const CACHE_WRITE_FACTOR = 1.25; // escritura de caché: 125% del input

/**
 * Estima el coste en USD de una llamada.
 * @param {object} usage
 * @param {string} usage.model
 * @param {number} [usage.inputTokens]
 * @param {number} [usage.outputTokens]
 * @param {number} [usage.cacheReadTokens]  - tokens leídos de caché (Anthropic)
 * @param {number} [usage.cacheWriteTokens] - tokens escritos a caché (Anthropic)
 * @returns {number|null} coste en USD, o null si el modelo no está en la tabla
 */
export function estimateCost({ model, inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheWriteTokens = 0 }) {
  const price = PRICES_PER_MTOK[model];
  if (!price) return null;
  const cost =
    (inputTokens / 1e6) * price.in +
    (outputTokens / 1e6) * price.out +
    (cacheReadTokens / 1e6) * price.in * CACHE_READ_FACTOR +
    (cacheWriteTokens / 1e6) * price.in * CACHE_WRITE_FACTOR;
  return Math.round(cost * 10000) / 10000;
}

/** Formatea un coste para mostrar: "$0.043" o "<$0.001". */
export function formatCost(cost) {
  if (cost == null) return "";
  if (cost > 0 && cost < 0.001) return "<$0.001";
  return `$${cost.toFixed(3)}`;
}
