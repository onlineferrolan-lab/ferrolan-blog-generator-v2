// ─── Keyword Utils ────────────────────────────────────────────────────────────
// Utilidades para normalización y comparación de keywords en español.
// Usado por check-keyword.js, sync-blog-posts.js y keywords-data.js.

const STOP_WORDS = new Set([
  "de", "la", "el", "los", "las", "un", "una", "y", "en", "con",
  "para", "por", "del", "al", "que", "se", "lo", "le", "su", "sus",
  "como", "este", "esta", "estos", "estas", "es", "son", "hay",
  "mas", "mas", "pero", "sin", "sobre", "entre", "desde", "hasta",
  "si", "no", "tu", "mi", "te", "me", "nos", "os", "les", "les",
]);

/**
 * Normaliza una keyword para comparación:
 * - Minúsculas
 * - Quita acentos y diacríticos
 * - Elimina caracteres no alfanuméricos (salvo espacios)
 * - Filtra stop words y palabras de menos de 3 caracteres
 */
function normalizeKeyword(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
    .join(" ")
    .trim();
}

/**
 * Normaliza un slug de URL:
 * - Quita acentos
 * - Convierte guiones en espacios
 * - Aplica normalizeKeyword
 */
function normalizeSlug(slug) {
  if (!slug || typeof slug !== "string") return "";
  const withSpaces = slug.replace(/-/g, " ");
  return normalizeKeyword(withSpaces);
}

/**
 * Determina el tipo de coincidencia entre una keyword normalizada
 * y un campo (título, slug, keywords) también normalizado.
 *
 * @returns {"exact"|"contains"|"overlap"|null}
 */
function matchType(normalizedKw, normalizedField) {
  if (!normalizedKw || !normalizedField) return null;

  // 1. Exacto
  if (normalizedKw === normalizedField) return "exact";

  // 2. Contenido (uno dentro del otro)
  if (normalizedField.includes(normalizedKw) || normalizedKw.includes(normalizedField)) {
    return "contains";
  }

  // 3. Solapamiento: ≥60% de palabras del keyword aparecen en el campo
  const kwWords = normalizedKw.split(" ").filter(Boolean);
  const fieldWords = new Set(normalizedField.split(" ").filter(Boolean));
  if (kwWords.length === 0) return null;

  const matched = kwWords.filter((w) => fieldWords.has(w)).length;
  const ratio = matched / kwWords.length;
  if (ratio >= 0.6) return "overlap";

  return null;
}

module.exports = { normalizeKeyword, normalizeSlug, matchType };
