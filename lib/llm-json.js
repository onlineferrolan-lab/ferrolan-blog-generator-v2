// ─── lib/llm-json.js ─────────────────────────────────────────────────────────
// Parser único para respuestas JSON de los LLM. Sustituye a las 7 variantes
// que había repartidas por los endpoints (keywords-data, enhance-article ×5,
// seo-analyze...), cada una con heurísticas distintas.
//
// Maneja los fallos habituales de un modelo devolviendo JSON:
//   - fences markdown (```json ... ```)
//   - prosa antes o después del objeto JSON
//   - respuesta truncada por max_tokens (a mitad de string, array u objeto)

// Cierra llaves/corchetes/comillas pendientes siguiendo la pila real de
// anidamiento (cerrar "todos los ] y luego todos los }" rompe con
// anidamientos mixtos tipo {"a":[{"b":1 ).
function closeDangling(s) {
  const stack = [];
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = inString;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let out = s;
  if (inString) out += '"';
  while (stack.length) {
    out += stack.pop() === "{" ? "}" : "]";
  }
  return out;
}

/**
 * Extrae y parsea el objeto JSON de una respuesta de LLM.
 * @param {string} text - texto crudo devuelto por el modelo
 * @returns {object} el objeto parseado
 * @throws {Error} si no se puede recuperar un JSON válido
 */
export function parseLLMJson(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Respuesta vacía del modelo");
  }

  // 1. Quitar fences markdown y recortar a lo que parece el objeto JSON
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonStart = cleaned.indexOf("{");
  if (jsonStart === -1) {
    throw new Error("La respuesta del modelo no contiene JSON");
  }
  const jsonEnd = cleaned.lastIndexOf("}");
  cleaned =
    jsonEnd > jsonStart ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned.slice(jsonStart);

  // 2. Intento directo
  try {
    return JSON.parse(cleaned);
  } catch {
    // seguimos con la reparación
  }

  // 3. Cerrar estructuras pendientes (respuesta truncada por max_tokens)
  try {
    return JSON.parse(closeDangling(cleaned));
  } catch {
    // seguimos
  }

  // 4. Quitar el último campo parcial ("clave": "valor cortad...) y recerrar
  const withoutPartial = cleaned
    .replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, "")
    .replace(/,\s*$/, "");
  try {
    return JSON.parse(closeDangling(withoutPartial));
  } catch {
    throw new Error("La respuesta del modelo no es JSON válido");
  }
}
