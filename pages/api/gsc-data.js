// pages/api/gsc-data.js
// ─── Panel de control GSC ──────────────────────────────────────────────────
// Devuelve datos de Google Search Console para el dashboard.
// Si hay credenciales de Google configuradas → datos en vivo.
// Si no → datos estáticos del último análisis manual.

import { google } from "googleapis";

// ─── Datos estáticos (último análisis GSC: marzo 2026) ─────────────────────
// Se usan como fallback si no hay credenciales de Google configuradas.
// Actualizar periódicamente con datos frescos del análisis de GSC.

const STATIC_DATA = {
  resumen: {
    clics: 22264,
    impresiones: 1297874,
    ctr: 1.71,
    posicion: 9.56,
    periodo: "11 feb – 10 mar 2026",
  },

  oportunidades: [
    { query: "tela asfaltica", impresiones: 19503, clics: 59, posicion: 10.1, ctr: 0.3, categoria: "Soluciones constructivas", sugerencia: "Guía completa de tipos, aplicaciones e instalación" },
    { query: "azulejos baño", impresiones: 10237, clics: 64, posicion: 11.8, ctr: 0.6, categoria: "Baño", sugerencia: "Tendencias, estilos y cómo elegir azulejos de baño" },
    { query: "mortero autonivelante", impresiones: 12661, clics: 44, posicion: 5.5, ctr: 0.35, categoria: "Soluciones constructivas", sugerencia: "Optimizar artículo existente — posición 5, subible a top 3" },
    { query: "silicona liquida", impresiones: 10409, clics: 42, posicion: 9.0, ctr: 0.4, categoria: "Consejos", sugerencia: "Tipos, usos y mejores marcas de silicona líquida" },
    { query: "bloques de hormigon", impresiones: 11898, clics: 95, posicion: 10.6, ctr: 0.8, categoria: "Soluciones constructivas", sugerencia: "Reforzar artículo existente de tipos y medidas" },
    { query: "silestone", impresiones: 4253, clics: 23, posicion: 7.7, ctr: 0.5, categoria: "Cocinas", sugerencia: "Comparativa Silestone vs porcelánico vs granito" },
    { query: "terrazo", impresiones: 5949, clics: 57, posicion: 8.6, ctr: 1.0, categoria: "Cerámica y parquet", sugerencia: "El regreso del terrazo — tendencia en decoración" },
    { query: "masilla de poliuretano", impresiones: 5750, clics: 51, posicion: 5.6, ctr: 0.9, categoria: "Consejos", sugerencia: "Cuándo y cómo usar masilla de poliuretano" },
    { query: "encimeras porcelanicas", impresiones: 2335, clics: 54, posicion: 7.6, ctr: 2.3, categoria: "Cocinas", sugerencia: "Guía completa de encimeras porcelánicas" },
    { query: "azulejos para baño", impresiones: 7925, clics: 48, posicion: 10.8, ctr: 0.6, categoria: "Baño", sugerencia: "Cluster con azulejos baño — combinar en un artículo amplio" },
  ],

  quickWins: [
    { query: "tipos de suelos para casas", impresiones: 2501, clics: 102, posicion: 1.5, ctr: 4.1, categoria: "Cerámica y parquet", nota: "Ya en top 2 — mantener y ampliar" },
    { query: "limpiar suelo porcelanico", impresiones: 356, clics: 39, posicion: 1.9, ctr: 11.0, categoria: "Consejos", nota: "CTR excelente — consolidar con más contenido" },
    { query: "suelo laminado vs suelo vinilico", impresiones: 146, clics: 39, posicion: 1.3, ctr: 26.7, categoria: "Consejos", nota: "Mejor CTR del blog — modelo a replicar" },
    { query: "tendencias azulejos baño 2026", impresiones: 633, clics: 37, posicion: 2.6, ctr: 5.8, categoria: "Baño", nota: "Contenido temporal — actualizar regularmente" },
    { query: "encimera imitacion madera", impresiones: 771, clics: 54, posicion: 1.9, ctr: 7.0, categoria: "Cocinas", nota: "Top 2 — expandir con comparativas" },
    { query: "toba catalana", impresiones: 528, clics: 43, posicion: 2.5, ctr: 8.1, categoria: "Soluciones constructivas", nota: "Nicho local sin competencia" },
  ],

  nuevosTemasGSC: [
    { query: "cubicar hormigon", impresiones: 673, posicion: 7.6, categoria: "Soluciones constructivas", sugerencia: "Calculadora y fórmulas para cubicar hormigón" },
    { query: "pvd que es", impresiones: 2335, posicion: 3.3, categoria: "Consejos", sugerencia: "PVD en grifería: qué es y por qué importa" },
    { query: "arena para arenero infantil", impresiones: 1587, posicion: 6.0, categoria: "Consejos", sugerencia: "Guía de arena para areneros infantiles" },
    { query: "polvo de marmol", impresiones: 1134, posicion: 4.1, categoria: "Soluciones constructivas", sugerencia: "Polvo de mármol: usos en construcción y decoración" },
    { query: "vigas de hormigon", impresiones: 1601, posicion: 10.7, categoria: "Soluciones constructivas", sugerencia: "Vigas de hormigón: tipos, precios y cálculos" },
    { query: "horno inteligente", impresiones: 676, posicion: 5.4, categoria: "Cocinas", sugerencia: "Horno inteligente: guía de compra 2026" },
  ],

  articulosActualizar: [
    { pagina: "Combinaciones azulejos baño", url: "/blog/las-mejores-combinaciones-de-azulejos-para-banos/", impresiones: 128253, clics: 1640, posicion: 8.9, ctr: 1.3 },
    { pagina: "Tipos de bloque de hormigón", url: "/blog/tipos-de-bloque-de-hormigon-guia-completa/", impresiones: 124445, clics: 815, posicion: 7.4, ctr: 0.7 },
    { pagina: "Golpe de ariete tuberías", url: "/blog/por-que-hacen-ruido-las-tuberias-golpe-de-ariete/", impresiones: 110827, clics: 1162, posicion: 2.9, ctr: 1.0 },
    { pagina: "Mortero autonivelante", url: "/blog/como-elegir-mortero-autonivelante/", impresiones: 101905, clics: 811, posicion: 5.4, ctr: 0.8 },
    { pagina: "Cemento cola: cuál usar", url: "/blog/no-tienes-claro-que-cemento-cola-que-debes-usar-te-resolvemos-algunas-dudas-n740/", impresiones: 85789, clics: 654, posicion: 7.9, ctr: 0.8 },
    { pagina: "Potencia lumínica y downlights", url: "/blog/que-potencia-luminica-necesitas-en-funcion-de-los-m2-descubre-los-downlight-led-de-superficie-y-los-lumenes-necesarios-n480/", impresiones: 82520, clics: 813, posicion: 6.1, ctr: 1.0 },
  ],
};

// ─── Conexión con Google Search Console API ────────────────────────────────

async function fetchLiveGSCData() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const siteUrl = process.env.GSC_SITE_URL || "sc-domain:ferrolan.es";

  if (!email || !key) return null;

  const auth = new google.auth.JWT(email, null, key.replace(/\\n/g, "\n"), [
    "https://www.googleapis.com/auth/webmasters.readonly",
  ]);

  const searchconsole = google.searchconsole({ version: "v1", auth });

  // Periodo actual: últimos 28 días
  const hoy = new Date();
  const hace28 = new Date(hoy);
  hace28.setDate(hace28.getDate() - 31); // -31 para dar margen a GSC (3 días de delay)
  const hace56 = new Date(hoy);
  hace56.setDate(hace56.getDate() - 59);

  const endDate = new Date(hoy);
  endDate.setDate(endDate.getDate() - 3); // GSC tiene ~3 días de delay
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 27);

  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - 27);

  const fmt = (d) => d.toISOString().split("T")[0];

  // 1. Queries actuales (top 50 por impresiones)
  const [currentQueries, prevQueries, currentPages] = await Promise.all([
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ["query"],
        rowLimit: 100,
        dataState: "final",
      },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: fmt(prevStartDate),
        endDate: fmt(prevEndDate),
        dimensions: ["query"],
        rowLimit: 100,
        dataState: "final",
      },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ["page"],
        dimensionFilterGroups: [{
          filters: [{ dimension: "page", operator: "contains", expression: "/blog/" }],
        }],
        rowLimit: 30,
        dataState: "final",
      },
    }),
  ]);

  // Mapear datos anteriores para comparación
  const prevMap = {};
  (prevQueries.data.rows || []).forEach((r) => {
    prevMap[r.keys[0]] = { posicion: r.position, clics: r.clicks, impresiones: r.impressions, ctr: r.ctr };
  });

  // Procesar queries actuales
  const queries = (currentQueries.data.rows || [])
    .filter((r) => !r.keys[0].match(/ferrolan|ferolan|ferroland/i))
    .map((r) => {
      const q = r.keys[0];
      const prev = prevMap[q];
      return {
        query: q,
        impresiones: r.impressions,
        clics: r.clicks,
        posicion: Math.round(r.position * 10) / 10,
        ctr: Math.round(r.ctr * 1000) / 10,
        // Cambios vs periodo anterior
        cambio_posicion: prev ? Math.round((r.position - prev.posicion) * 10) / 10 : null,
        cambio_clics: prev ? r.clicks - prev.clics : null,
      };
    });

  // Identificar oportunidades (muchas impresiones, posición mejorable)
  const oportunidades = queries
    .filter((q) => q.impresiones > 500 && q.posicion > 4)
    .sort((a, b) => b.impresiones - a.impresiones)
    .slice(0, 10);

  // Identificar keywords perdiendo tracción (posición subió = empeoró)
  const perdiendo = queries
    .filter((q) => q.cambio_posicion !== null && q.cambio_posicion > 1 && q.impresiones > 200)
    .sort((a, b) => b.cambio_posicion - a.cambio_posicion)
    .slice(0, 8);

  // Quick wins (ya bien posicionados)
  const quickWins = queries
    .filter((q) => q.posicion < 3 && q.impresiones > 100)
    .sort((a, b) => b.impresiones - a.impresiones)
    .slice(0, 6);

  // Artículos del blog
  const articulos = (currentPages.data.rows || [])
    .map((r) => ({
      url: r.keys[0].replace("https://ferrolan.es", ""),
      pagina: r.keys[0].replace("https://ferrolan.es/blog/", "").replace(/\/$/, "").replace(/-/g, " ").slice(0, 50),
      impresiones: r.impressions,
      clics: r.clicks,
      posicion: Math.round(r.position * 10) / 10,
      ctr: Math.round(r.ctr * 1000) / 10,
    }))
    .sort((a, b) => b.impresiones - a.impresiones)
    .slice(0, 8);

  // Resumen
  const totalClics = queries.reduce((s, q) => s + q.clics, 0);
  const totalImpresiones = queries.reduce((s, q) => s + q.impresiones, 0);

  return {
    live: true,
    periodo: `${fmt(startDate)} — ${fmt(endDate)}`,
    resumen: {
      clics: totalClics,
      impresiones: totalImpresiones,
      ctr: totalImpresiones > 0 ? Math.round((totalClics / totalImpresiones) * 10000) / 100 : 0,
      posicion: Math.round((queries.reduce((s, q) => s + q.posicion, 0) / queries.length) * 10) / 10,
      periodo: `${fmt(startDate)} — ${fmt(endDate)}`,
    },
    oportunidades,
    quickWins,
    perdiendo,
    articulosActualizar: articulos,
  };
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Intentar datos en vivo
    const liveData = await fetchLiveGSCData();

    if (liveData) {
      return res.status(200).json(liveData);
    }

    // Fallback: datos estáticos
    return res.status(200).json({
      live: false,
      ...STATIC_DATA,
    });
  } catch (err) {
    console.error("GSC data error:", err);

    // Si falla la API de Google, devolver datos estáticos
    return res.status(200).json({
      live: false,
      error_detail: err.message,
      ...STATIC_DATA,
    });
  }
}
