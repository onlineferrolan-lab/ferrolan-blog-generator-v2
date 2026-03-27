import { kv } from "@vercel/kv";

// ─── Prestashop Categories API ───────────────────────────────────────────────
// Devuelve el árbol de categorías de Prestashop con URL construida desde el nombre.
// Usa el mismo endpoint que keywords-data.js (sin link_rewrite en display).
// Excluye la categoría 16 y todos sus descendientes, más las meta-categorías
// internas de Prestashop (raíz, inicio, etc.).
// Cachea el resultado 24h en Vercel KV.

const EXCLUIR_RAIZ = new Set([1, 2, 16, 9498, 3554, 8186, 11699]);
const CACHE_KEY = "prestashop:categories:v4";

// Prestashop JSON (convertido desde XML) puede usar varios formatos para campos multilingüe:
// { language: [{ "@attributes": { id: "3" }, "#text": "Nombre" }] }   ← XML→JSON clásico
// { language: [{ attrs: { id: "3" }, value: "Nombre" }] }             ← formato alternativo
// { language: [{ id: "3", value: "Nombre" }] }                        ← formato simplificado
function getLang(field) {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (field.language) {
    const langs = Array.isArray(field.language) ? field.language : [field.language];
    const getId = l => l?.["@attributes"]?.id ?? l?.attrs?.id ?? l?.id;
    const getVal = l => l?.["#text"] ?? l?.value ?? "";
    const es = langs.find(l => ["2", "3", 2, 3].includes(String(getId(l))));
    return String(getVal(es || langs[0]));
  }
  return String(field);
}

// Deriva el slug de URL desde el nombre de categoría (igual que Prestashop)
function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const forceRefresh = req.query.refresh === "true";

  if (!forceRefresh) {
    try {
      const cached = await kv.get(CACHE_KEY);
      if (cached) return res.status(200).json(cached);
    } catch { /* continuar sin caché */ }
  }

  const apiKey = process.env.PRESTASHOP_API_KEY;
  const apiUrl = process.env.PRESTASHOP_API_URL || "https://ferrolan.es/api";

  if (!apiKey) {
    return res.status(200).json({ categories: [], fallback: true });
  }

  try {
    // Mismo formato que keywords-data.js (probado y funcional)
    const url = `${apiUrl}/categories?output_format=JSON&display=[id,name,id_parent,active,level_depth]&limit=500`;
    const resp = await fetch(url, {
      headers: { Authorization: "Basic " + Buffer.from(apiKey + ":").toString("base64") },
    });

    if (!resp.ok) {
      throw new Error(`Prestashop responded with ${resp.status}`);
    }

    const json = await resp.json();
    const all = (json.categories || []).filter((c) => c.active === "1");

    // Construir set de IDs excluidos propagando hacia abajo en el árbol
    const excluidos = new Set(EXCLUIR_RAIZ);
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of all) {
        if (!excluidos.has(Number(c.id)) && excluidos.has(Number(c.id_parent))) {
          excluidos.add(Number(c.id));
          changed = true;
        }
      }
    }

    // Filtrar: categorías activas a partir de level_depth 2, sin excluidas
    const validas = all.filter(
      (c) => Number(c.level_depth) >= 2 && !excluidos.has(Number(c.id))
    );

    // Construir árbol (dos niveles visibles: padre → hijos directos)
    const byId = {};
    validas.forEach((c) => {
      const name = getLang(c.name);
      byId[c.id] = { ...c, children: [], _name: name, _slug: slugify(name) };
    });

    const raices = [];
    validas.forEach((c) => {
      if (byId[c.id_parent]) {
        byId[c.id_parent].children.push(byId[c.id]);
      } else {
        raices.push(byId[c.id]);
      }
    });

    const sortByName = (arr) => arr.sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));

    const toNode = (c) => ({
      id: Number(c.id),
      name: c._name,
      slug: c._slug,
      url: `https://ferrolan.es/es/${c._slug}`,
      children: sortByName(c.children.map(toNode)),
    });

    const categories = sortByName(raices.map(toNode));

    // Debug: muestra el campo name crudo de las primeras categorías válidas para diagnosticar formato PS
    const _nameSample = validas.slice(0, 3).map(c => ({ id: c.id, name_raw: JSON.stringify(c.name) }));
    const result = { categories, _total: all.length, _validas: validas.length, _nameSample };

    try {
      await kv.set(CACHE_KEY, result, { ex: 86400 });
    } catch { /* no bloquear si KV falla */ }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Prestashop categories error:", err);
    return res.status(200).json({ categories: [], error: err.message });
  }
}
