// Devuelve la lista de categorías de WordPress para el selector de publicación.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const wpUrl = process.env.WORDPRESS_URL;
  const wpUser = process.env.WORDPRESS_USER;
  const wpAppPassword = process.env.WORDPRESS_APP_PASSWORD;

  if (!wpUrl || !wpUser || !wpAppPassword) {
    return res.status(500).json({ error: "WordPress no configurado." });
  }

  try {
    const apiUrl = `${wpUrl.replace(/\/$/, "")}/wp-json/wp/v2`;
    const authHeader = "Basic " + Buffer.from(`${wpUser}:${wpAppPassword}`).toString("base64");

    const r = await fetch(`${apiUrl}/categories?per_page=100&orderby=name&order=asc`, {
      headers: { Authorization: authHeader },
    });
    if (!r.ok) throw new Error(`WP API ${r.status}`);
    const cats = await r.json();

    // Devolver id, name y parent para poder agruparlas en el selector
    return res.status(200).json(cats.map(c => ({ id: c.id, name: c.name, parent: c.parent })));
  } catch (err) {
    console.error("wp-categories error:", err);
    return res.status(500).json({ error: err.message });
  }
}
