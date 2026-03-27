import { kv } from "@vercel/kv";
import { google } from "googleapis";

// ─── Patrones de contenido ────────────────────────────────────────────────────

// Palabras clave que indican contenido temporal/noticia
const PATRON_NOTICIA = /\bnuevos?\s+(producto|lanzamiento)\b|\blanzamiento\b|\bevento\b|\bpróximo\b|\bferia\b|\bjornada\b|\boferta\b|\bpromoción\b|\bdescuento\b|\bnovedad\b|\btemporada\b|\besta semana\b|\beste mes\b|\beste año\b/i;

// Patrones que indican contenido genuinamente evergreen
const PATRON_EVERGREEN = /cómo|guía|qué es|diferencia|tipos de|consejos|paso a paso|aprende|elegir|instalar|mantener|cuidar|limpiar|comparativa|cuánto cuesta|presupuesto|solución|errores|ventajas/i;

// ─── Fallback estático ────────────────────────────────────────────────────────
// Artículos top del blog real de Ferrolan — se usan cuando GSC no está configurado.
// Datos del análisis GSC de marzo 2026.

const STATIC_BLOG_PILARES = [
  { titulo: "Combinaciones de azulejos para baños", url: "/blog/las-mejores-combinaciones-de-azulejos-para-banos/", clics: 1640, impresiones: 128253, posicion: 8.9 },
  { titulo: "Tipos de bloque de hormigón: guía completa", url: "/blog/tipos-de-bloque-de-hormigon-guia-completa/", clics: 815, impresiones: 124445, posicion: 7.4 },
  { titulo: "Golpe de ariete: por qué hacen ruido las tuberías", url: "/blog/por-que-hacen-ruido-las-tuberias-golpe-de-ariete/", clics: 1162, impresiones: 110827, posicion: 2.9 },
  { titulo: "Cómo elegir mortero autonivelante", url: "/blog/como-elegir-mortero-autonivelante/", clics: 811, impresiones: 101905, posicion: 5.4 },
  { titulo: "Cemento cola: cuál usar", url: "/blog/no-tienes-claro-que-cemento-cola-que-debes-usar-te-resolvemos-algunas-dudas-n740/", clics: 654, impresiones: 85789, posicion: 7.9 },
  { titulo: "Potencia lumínica y downlights LED", url: "/blog/que-potencia-luminica-necesitas-en-funcion-de-los-m2-descubre-los-downlight-led-de-superficie-y-los-lumenes-necesarios-n480/", clics: 813, impresiones: 82520, posicion: 6.1 },
];

// ─── GSC: fetch de todas las páginas del blog ─────────────────────────────────

async function fetchGSCBlogPages() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const siteUrl = process.env.GSC_SITE_URL || "sc-domain:ferrolan.es";

  if (!email || !key) return null; // null → usar fallback estático

  try {
    const auth = new google.auth.JWT(email, null, key.replace(/\\n/g, "\n"), [
      "https://www.googleapis.com/auth/webmasters.readonly",
    ]);
    const searchconsole = google.searchconsole({ version: "v1", auth });

    // 16 meses hacia atrás (máximo datos históricos de GSC)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 3); // GSC tiene ~3 días de delay
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 16);
    const fmt = (d) => d.toISOString().split("T")[0];

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ["page"],
        dimensionFilterGroups: [{
          filters: [{ dimension: "page", operator: "contains", expression: "/blog/" }],
        }],
        rowLimit: 500, // Cubre los ~500 artículos del blog
        dataState: "final",
      },
    });

    return (response.data.rows || []).map((r) => ({
      url: r.keys[0].replace("https://ferrolan.es", ""),
      clics: r.clicks,
      impresiones: r.impressions,
      posicion: Math.round(r.position * 10) / 10,
    }));
  } catch (err) {
    console.error("GSC blog pages fetch error:", err);
    return null;
  }
}

// ─── Scoring y helpers ────────────────────────────────────────────────────────

// Score para artículos GSC basado en señales de tráfico real
function scoreGSCPilar(page) {
  // Clics: escala log 0-50 pts (100 clics → ~40pts, 1000+ → 50pts)
  const scoreClics = Math.min(50, Math.round(Math.log10(page.clics + 1) * 25));
  // Impresiones: escala log 0-30 pts
  const scoreImpresiones = Math.min(30, Math.round(Math.log10(page.impresiones + 1) * 10));
  // Posición: 20 pts para pos 1, 0 para pos 20+
  const scorePos = Math.max(0, Math.round(20 - page.posicion));
  return Math.min(100, scoreClics + scoreImpresiones + scorePos);
}

// Convierte un slug de URL en un título legible
function slugToTitulo(url) {
  const slug = url.split("/blog/")[1]?.replace(/\//g, "") || url;
  // Limpiar sufijos de tipo -nNNN (IDs heredados de Prestashop)
  const clean = slug.replace(/-n\d+$/, "").replace(/-/g, " ");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ── 1. Artículos del generador (KV) ──────────────────────────────────────
    const ids = await kv.lrange("articles:index", 0, -1);
    const kvArticulos = ids?.length
      ? (await Promise.all(ids.map((id) => kv.get(id))))
          .filter(Boolean)
          .map((r) => (typeof r === "string" ? JSON.parse(r) : r))
      : [];

    // Candidatos KV: título con patrón evergreen, sin filtro de edad
    const kvPilares = kvArticulos
      .filter((a) => !PATRON_NOTICIA.test(a.titulo || "") && PATRON_EVERGREEN.test(a.titulo || ""))
      .map((a) => {
        const diasAntiguo = Math.floor((new Date() - new Date(a.fecha)) / (1000 * 60 * 60 * 24));
        return {
          ...a,
          fuente: "kv",
          impactoEstimado: Math.min(40, Math.floor(diasAntiguo / 3)) + 30, // antigüedad + patrón
          edad: diasAntiguo,
        };
      });

    // ── 2. Artículos reales del blog (GSC) ────────────────────────────────────
    const gscPages = await fetchGSCBlogPages();
    const blogPages = gscPages || STATIC_BLOG_PILARES;

    const gscPilares = blogPages
      .filter((p) => !PATRON_NOTICIA.test(slugToTitulo(p.url)))
      .filter((p) => p.impresiones > 100) // solo artículos con tráfico mínimo verificable
      .map((p) => ({
        id: p.url,
        titulo: p.titulo || slugToTitulo(p.url),
        slug: p.url.split("/blog/")[1]?.replace(/\//g, "") || "",
        url: p.url,
        clics: p.clics,
        impresiones: p.impresiones,
        posicion: p.posicion,
        fuente: "gsc",
        fuente_live: !!gscPages,
        impactoEstimado: scoreGSCPilar(p),
        edad: null,
        fecha: null,
        categoria: null,
      }));

    // ── 3. Combinar y deduplicar ──────────────────────────────────────────────
    // Los artículos de KV tienen prioridad: si un artículo generado coincide en
    // slug con uno de GSC, prevalece el de KV (datos más completos).
    const kvSlugSet = new Set(kvPilares.map((a) => a.slug).filter(Boolean));
    const gscSinDuplicados = gscPilares.filter((p) => !kvSlugSet.has(p.slug));

    const todos = [...gscSinDuplicados, ...kvPilares]
      .sort((a, b) => b.impactoEstimado - a.impactoEstimado)
      .slice(0, 10);

    // ── 4. Gaps temáticos ─────────────────────────────────────────────────────
    const topicsCovered = [...new Set(kvArticulos.map((a) => a.categoria || "").filter(Boolean))];

    const EVERGREEN_TOPICS = [
      "Cómo elegir azulejos",
      "Guía de instalación de cerámica",
      "Mantenimiento de parquet",
      "Diferencias entre materiales",
      "Colores y estilos para baños",
      "Tendencias en cocinas",
      "Presupuesto para reformas",
      "Pasos para instalar suelo",
      "Cuidado y limpieza de baldosas",
      "Impermeabilización en baños",
      "Suelos para espacios exteriores",
      "Diseño de pisos pequeños",
      "Materiales eco-friendly",
      "Reparación de grietas",
    ];

    // Cruzar topics con URLs del blog real para identificar gaps reales
    const blogUrlsText = blogPages.map((p) => (p.url || "").toLowerCase()).join(" ");
    const gaps = EVERGREEN_TOPICS.filter((topic) => {
      const words = topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const cubierto =
        kvArticulos.some((a) => a.titulo?.toLowerCase().includes(topic.toLowerCase())) ||
        words.some((w) => blogUrlsText.includes(w));
      return !cubierto;
    }).slice(0, 4);

    return res.status(200).json({
      pilares: todos,
      gaps,
      topicsCovered,
      totalArticulos: kvArticulos.length,
      totalEvergreen: todos.length,
      gscLive: !!gscPages,
    });
  } catch (err) {
    console.error("Evergreen analysis error:", err);
    return res.status(500).json({ error: "Error analizando pilares evergreen" });
  }
}
