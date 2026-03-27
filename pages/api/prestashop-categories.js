import { kv } from "@vercel/kv";

// ─── Prestashop Categories API ───────────────────────────────────────────────
// Excluye categoría 16 y sus descendientes.
// Cats 1 (raíz, level=0) y 2 (inicio, level=1) se excluyen automáticamente
// por el filtro level_depth >= 2 — NO se propaga desde ellas.
// Cachea el resultado 24h en Vercel KV.

const CACHE_KEY = "prestashop:categories:v8";

function slugify(name) {
  return (name || "")
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

  const headers = { Authorization: "Basic " + Buffer.from(apiKey + ":").toString("base64") };

  try {
    // language=1 = español confirmado en ferrolan.es
    const url = `${apiUrl}/categories?output_format=JSON&language=1&display=[id,name,id_parent,active,level_depth]&limit=500`;
    const resp = await fetch(url, { headers });

    if (!resp.ok) throw new Error(`Prestashop responded with ${resp.status}`);

    const json = await resp.json();
    const all = (json.categories || []).filter((c) => c.active === "1");

    // Solo excluir cat 16 y sus descendientes por propagación.
    // NO incluir cat 1 ni 2 aquí — su propagación eliminaría todo el catálogo.
    // level_depth >= 2 ya se encarga de filtrarlas.
    const excluidos = new Set([16]);
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

    // level_depth >= 2 excluye raíz (0) e inicio (1) naturalmente
    const validas = all.filter(
      (c) => Number(c.level_depth) >= 2 && !excluidos.has(Number(c.id))
    );

    const byId = {};
    validas.forEach((c) => {
      const name = typeof c.name === "string" ? c.name : "";
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
    const result = { categories };

    try { await kv.set(CACHE_KEY, result, { ex: 86400 }); } catch { /* ok */ }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Prestashop categories error:", err);
    return res.status(200).json({ categories: [], error: err.message });
  }
}
