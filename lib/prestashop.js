// ─── lib/prestashop.js ───────────────────────────────────────────────────────
// Acceso compartido al webservice de Prestashop. El fetch + auth + filtro de
// activas estaba duplicado en keywords-data.js y prestashop-categories.js;
// cada endpoint mantiene su propio filtrado de negocio sobre el resultado.

const DEFAULT_DISPLAY = "[id,name,id_parent,active,level_depth]";

/**
 * Descarga las categorías activas del catálogo.
 * @param {object} [opts]
 * @param {string} [opts.display] - campos a pedir (formato display de PS)
 * @param {number} [opts.language] - id de idioma (1 = español)
 * @returns {Promise<object[]|null>} categorías activas, o null sin API key
 * @throws {Error} si Prestashop responde con error HTTP
 */
export async function fetchPrestashopCategoriesRaw({ display = DEFAULT_DISPLAY, language } = {}) {
  const apiUrl = process.env.PRESTASHOP_API_URL || "https://ferrolan.es/api";
  const apiKey = process.env.PRESTASHOP_API_KEY;
  if (!apiKey) return null;

  const langParam = language ? `&language=${language}` : "";
  const url = `${apiUrl}/categories?output_format=JSON${langParam}&display=${display}&limit=500`;

  const res = await fetch(url, {
    headers: {
      Authorization: "Basic " + Buffer.from(apiKey + ":").toString("base64"),
    },
  });

  if (!res.ok) throw new Error(`Prestashop API error: ${res.status}`);

  const data = await res.json();
  return (data.categories || []).filter((c) => c.active === "1");
}
