import { google } from "googleapis";

// ─── Ads Data API ───────────────────────────────────────────────────────────
// Lee los datos de Google Ads exportados al Google Sheet y los cruza
// con datos de GSC para identificar oportunidades de contenido.

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) throw new Error("Google Service Account not configured");
  return new google.auth.JWT(email, null, key.replace(/\\n/g, "\n"), [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
  ]);
}

// Leer keywords de Google Ads desde el Sheet
async function readAdsSheet(auth) {
  const sheetId = process.env.GOOGLE_ADS_SHEET_ID;
  if (!sheetId) return null;

  const sheets = google.sheets({ version: "v4", auth });

  // Leer los datos de keywords
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "AdsKeywords!A2:M5000", // Skip header row
  });

  const rows = res.data.values || [];
  if (rows.length === 0) return [];

  // Leer metadata (última actualización)
  let lastUpdated = null;
  try {
    const metaRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "_metadata!B1",
    });
    lastUpdated = metaRes.data.values?.[0]?.[0] || null;
  } catch { /* no metadata sheet */ }

  return {
    lastUpdated,
    keywords: rows.map((row) => ({
      keyword: (row[0] || "").toLowerCase().trim(),
      campana: row[1] || "",
      grupoAnuncios: row[2] || "",
      clics: parseInt(row[3]) || 0,
      impresiones: parseInt(row[4]) || 0,
      ctr: parseFloat(row[5]) || 0,
      cpcMedio: parseFloat(row[6]) || 0,
      costeTotal: parseFloat(row[7]) || 0,
      conversiones: parseFloat(row[8]) || 0,
      costeConversion: parseFloat(row[9]) || 0,
      estado: row[10] || "",
      matchType: row[11] || "",
      qualityScore: row[12] ? parseInt(row[12]) : null,
    })),
  };
}

// Leer queries de GSC para cruzar datos
async function readGSCQueries(auth) {
  const siteUrl = process.env.GSC_SITE_URL || "sc-domain:ferrolan.es";

  const searchconsole = google.searchconsole({ version: "v1", auth });

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 27);

  const fmt = (d) => d.toISOString().split("T")[0];

  const res = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions: ["query"],
      rowLimit: 500,
      dataState: "final",
    },
  });

  const queries = {};
  (res.data.rows || []).forEach((r) => {
    queries[r.keys[0].toLowerCase()] = {
      clics: r.clicks,
      impresiones: r.impressions,
      posicion: Math.round(r.position * 10) / 10,
      ctr: Math.round(r.ctr * 1000) / 10,
    };
  });

  return queries;
}

// Leer URLs del blog para detectar keywords sin contenido
async function readBlogPages(auth) {
  const siteUrl = process.env.GSC_SITE_URL || "sc-domain:ferrolan.es";
  const searchconsole = google.searchconsole({ version: "v1", auth });

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 27);
  const fmt = (d) => d.toISOString().split("T")[0];

  const res = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions: ["page"],
      dimensionFilterGroups: [{
        filters: [{ dimension: "page", operator: "contains", expression: "/blog/" }],
      }],
      rowLimit: 100,
      dataState: "final",
    },
  });

  return (res.data.rows || []).map((r) => r.keys[0].toLowerCase()).join(" ");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sheetId = process.env.GOOGLE_ADS_SHEET_ID;
  if (!sheetId) {
    return res.status(200).json({
      configured: false,
      error: "GOOGLE_ADS_SHEET_ID no configurada",
    });
  }

  try {
    const auth = getAuth();

    // Leer datos en paralelo
    const [adsData, gscQueries, blogPagesText] = await Promise.all([
      readAdsSheet(auth),
      readGSCQueries(auth).catch(() => ({})),
      readBlogPages(auth).catch(() => ""),
    ]);

    if (!adsData || adsData.keywords.length === 0) {
      return res.status(200).json({
        configured: true,
        empty: true,
        error: "No hay datos en el Sheet de Ads. Ejecuta el script de Google Ads.",
      });
    }

    const ads = adsData.keywords;

    // ─── Tab 1: Keywords sin blog ────────────────────────────────────
    // Keywords de Ads donde pagamos pero NO hay artículo de blog dedicado
    const sinBlog = ads
      .filter((ad) => {
        if (ad.impresiones < 10) return false;
        const words = ad.keyword.split(/\s+/).filter((w) => w.length > 3);
        if (words.length === 0) return false;
        const matchCount = words.filter((w) => blogPagesText.includes(w)).length;
        return matchCount < words.length * 0.5; // Menos de la mitad de palabras en blog
      })
      .sort((a, b) => b.costeTotal - a.costeTotal)
      .slice(0, 12)
      .map((ad) => ({
        keyword: ad.keyword,
        clics: ad.clics,
        impresiones: ad.impresiones,
        cpcMedio: ad.cpcMedio,
        costeTotal: ad.costeTotal,
        campana: ad.campana,
        enGSC: !!gscQueries[ad.keyword],
        posicionOrganica: gscQueries[ad.keyword]?.posicion || null,
      }));

    // ─── Tab 2: Ahorro potencial ─────────────────────────────────────
    // Keywords con CPC alto → crear contenido orgánico ahorraría dinero
    const ahorroPotencial = ads
      .filter((ad) => ad.cpcMedio > 0.3 && ad.clics > 5)
      .sort((a, b) => b.costeTotal - a.costeTotal)
      .slice(0, 12)
      .map((ad) => {
        const gsc = gscQueries[ad.keyword];
        return {
          keyword: ad.keyword,
          cpcMedio: ad.cpcMedio,
          costeTotal: ad.costeTotal,
          clics: ad.clics,
          impresiones: ad.impresiones,
          posicionOrganica: gsc?.posicion || null,
          ahorroPotencial: ad.costeTotal, // Si posicionamos orgánico, ahorramos todo el coste
          campana: ad.campana,
        };
      });

    // ─── Tab 3: Ideas nuevas ─────────────────────────────────────────
    // Keywords de Ads que NO aparecen en GSC (ni siquiera con impresiones)
    // Son temas completamente nuevos para el blog
    const ideasNuevas = ads
      .filter((ad) => {
        if (ad.impresiones < 10) return false;
        // No aparece en GSC en absoluto
        return !gscQueries[ad.keyword];
      })
      .sort((a, b) => b.impresiones - a.impresiones)
      .slice(0, 12)
      .map((ad) => ({
        keyword: ad.keyword,
        clics: ad.clics,
        impresiones: ad.impresiones,
        cpcMedio: ad.cpcMedio,
        costeTotal: ad.costeTotal,
        campana: ad.campana,
      }));

    // Resumen
    const totalCoste = ads.reduce((s, a) => s + a.costeTotal, 0);
    const totalClics = ads.reduce((s, a) => s + a.clics, 0);
    const totalImpresiones = ads.reduce((s, a) => s + a.impresiones, 0);
    const avgCPC = totalClics > 0 ? totalCoste / totalClics : 0;

    return res.status(200).json({
      configured: true,
      lastUpdated: adsData.lastUpdated,
      resumen: {
        totalKeywords: ads.length,
        totalCoste: Math.round(totalCoste * 100) / 100,
        totalClics,
        totalImpresiones,
        cpcMedio: Math.round(avgCPC * 100) / 100,
      },
      sinBlog,
      ahorroPotencial,
      ideasNuevas,
    });
  } catch (err) {
    console.error("Ads data error:", err);
    return res.status(200).json({
      configured: true,
      error: err.message,
    });
  }
}
