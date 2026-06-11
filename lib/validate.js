// ─── lib/validate.js ─────────────────────────────────────────────────────────
// Validación ligera de cuerpos de petición para los endpoints de la API.
// Evita dos problemas reales:
//  - TypeError 500 cuando un campo llega con tipo inesperado (p.ej. número)
//  - prompts (y costes de API) descontrolados cuando un campo llega gigante

export const MAX = {
  articulo: 60000, // ~10.000 palabras; el blog publica 700-3.000
  tema: 300,
  keywords: 1000,
  contexto: 4000,
  corto: 200, // categoría, tono, público, intención...
};

/**
 * Valida body[name] como string opcional u obligatorio con límite de longitud.
 * @returns {string|null} mensaje de error o null si es válido
 */
export function checkString(body, name, { required = false, max = 10000 } = {}) {
  const value = body?.[name];
  if (value == null || value === "") {
    return required ? `El campo '${name}' es obligatorio` : null;
  }
  if (typeof value !== "string") {
    return `El campo '${name}' debe ser texto`;
  }
  if (value.length > max) {
    return `El campo '${name}' supera el máximo de ${max} caracteres`;
  }
  return null;
}

/**
 * Valida varias reglas de golpe. rules = { nombre: { required, max } }
 * @returns {string|null} el primer error encontrado o null si todo es válido
 */
export function validateBody(body, rules) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Cuerpo de la petición inválido";
  }
  for (const [name, rule] of Object.entries(rules)) {
    const err = checkString(body, name, rule);
    if (err) return err;
  }
  return null;
}
