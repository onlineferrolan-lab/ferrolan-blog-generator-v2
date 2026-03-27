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
      // ── Baño ──
      { topic: "Cómo elegir azulejos para el baño", key: "elegir-azulejos" },
      { topic: "Colores y estilos para baños pequeños", key: "banos-pequenos" },
      { topic: "Cómo impermeabilizar un baño", key: "impermeabilizar" },
      { topic: "Diferencias entre mampara y cortina de ducha", key: "mampara-cortina" },
      { topic: "Cómo elegir el plato de ducha", key: "plato-ducha" },
      { topic: "Guía de griferías para baño", key: "griferia-bano" },
      { topic: "Radiadores toallero: tipos y ventajas", key: "radiador-toallero" },
      { topic: "Sanitarios suspendidos vs apoyados", key: "sanitarios-suspendidos" },
      { topic: "Cómo limpiar azulejos y juntas", key: "limpiar-azulejos" },
      { topic: "Iluminación para baños: guía completa", key: "iluminacion-bano" },
      // ── Cocina ──
      { topic: "Cómo elegir la encimera de cocina", key: "encimera-cocina" },
      { topic: "Tipos de fregadero: guía de compra", key: "tipos-fregadero" },
      { topic: "Azulejos para salpicadero de cocina", key: "salpicadero-cocina" },
      { topic: "Suelos para cocina: qué material elegir", key: "suelo-cocina" },
      { topic: "Cocinas abiertas: ventajas e inconvenientes", key: "cocinas-abiertas" },
      { topic: "Cómo limpiar la encimera según el material", key: "limpiar-encimera" },
      // ── Cerámica y porcelánico ──
      { topic: "Diferencias entre cerámica y porcelánico", key: "ceramica-porcelanico" },
      { topic: "Cómo instalar azulejos paso a paso", key: "instalar-azulejos" },
      { topic: "Qué es el gres porcelánico", key: "gres-porcelanico" },
      { topic: "Cómo elegir el formato de azulejo", key: "formato-azulejo" },
      { topic: "Tipos de acabado cerámico: mate, brillo, satinado", key: "acabado-ceramico" },
      { topic: "Rectificado en cerámica: qué es y para qué sirve", key: "rectificado-ceramica" },
      { topic: "Errores comunes al colocar azulejos", key: "errores-colocar-azulejos" },
      // ── Parquet y suelos de madera ──
      { topic: "Tipos de parquet: macizo, laminado, vinílico", key: "tipos-parquet" },
      { topic: "Cómo mantener el parquet en buen estado", key: "mantener-parquet" },
      { topic: "Parquet flotante vs pegado: diferencias", key: "parquet-flotante" },
      { topic: "Cómo limpiar el suelo de parquet", key: "limpiar-parquet" },
      // ── Espacios exteriores ──
      { topic: "Pavimentos antideslizantes para terraza", key: "antideslizante-terraza" },
      { topic: "Cómo elegir el pavimento exterior", key: "pavimento-exterior" },
      { topic: "Suelos para jardín: opciones y materiales", key: "suelo-jardin" },
      { topic: "Cómo limpiar pavimentos exteriores", key: "limpiar-pavimento-exterior" },
      // ── Materiales de construcción ──
      { topic: "Tipos de mortero y cómo usarlos", key: "tipos-mortero" },
      { topic: "Diferencias entre cemento cola: cuál elegir", key: "cemento-cola" },
      { topic: "Cómo preparar la pared antes de alicatar", key: "preparar-pared-alicatar" },
      { topic: "Impermeabilizante para terrazas: guía", key: "impermeabilizante-terraza" },
      { topic: "Cómo hacer una regata en la pared", key: "regata-pared" },
      // ── Presupuestos y planificación ──
      { topic: "Cuánto cuesta reformar un baño completo", key: "coste-reformar-bano" },
      { topic: "Cuánto cuesta reformar una cocina", key: "coste-reformar-cocina" },
      { topic: "Presupuesto para alicatar una habitación", key: "presupuesto-alicatar" },
      { topic: "Errores que encarecen la reforma", key: "errores-reforma" },
    ];

    // Cruzar topics con URLs del blog real para identificar gaps reales.
    // Consideramos cubierto si la key principal (con guiones) está en alguna URL del blog.
    // Esto evita falsos positivos por coincidencias de palabras sueltas.
    const blogUrlsText = blogPages.map((p) => (p.url || "").toLowerCase()).join(" ");
    const gaps = EVERGREEN_TOPICS.filter(({ topic, key }) => {
      const keyWords = key.split("-").filter(w => w.length > 3);
      const cubiertoEnKV = kvArticulos.some((a) =>
        keyWords.every(w => (a.titulo || "").toLowerCase().includes(w))
      );
      const cubiertoEnBlog = keyWords.length >= 2
        ? keyWords.filter(w => blogUrlsText.includes(w)).length >= Math.ceil(keyWords.length * 0.6)
        : blogUrlsText.includes(keyWords[0] || key);
      return !cubiertoEnKV && !cubiertoEnBlog;
    }).map(({ topic }) => topic).slice(0, 8);

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
