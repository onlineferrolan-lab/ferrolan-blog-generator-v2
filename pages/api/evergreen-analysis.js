import { kv } from "@vercel/kv";

// Palabras clave que indican contenido temporal/noticia
// Nota: se usa \b para evitar falsos positivos (ej. "evento" sí, "eventualmente" no)
// Se excluyen años sueltos (\d{4}) porque muchos artículos evergreen los mencionan
const PATRON_NOTICIA = /\bnuevos?\s+(producto|lanzamiento)\b|\blanzamiento\b|\bevento\b|\bpróximo\b|\bferia\b|\bjornada\b|\boferta\b|\bpromoción\b|\bdescuento\b|\bnovedad\b|\btemporada\b|\besta semana\b|\beste mes\b|\beste año\b/i;

// Patrones que indican contenido genuinamente evergreen
const PATRON_EVERGREEN = /cómo|guía|qué es|diferencia|tipos de|consejos|paso a paso|aprende|elegir|instalar|mantener|cuidar|limpiar|comparativa|cuánto cuesta|presupuesto|solución|errores|ventajas/i;

// Mínimo de días para que un artículo pueda considerarse pilar evergreen
// 90 días = 3 meses, tiempo suficiente para que el contenido madure y demuestre que no es temporal
const DIAS_MINIMO_PILAR = 90;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Obtener todos los artículos guardados
    const ids = await kv.lrange("articles:index", 0, -1);
    if (!ids || ids.length === 0) {
      return res.status(200).json({ pilares: [], gaps: [], topicsCovered: [] });
    }

    const records = await Promise.all(ids.map((id) => kv.get(id)));
    const articulos = records
      .filter(Boolean)
      .map((r) => (typeof r === "string" ? JSON.parse(r) : r))
      .filter((a) => a.wpStatus !== "draft");

    // 2. Criterios para considerar un artículo como candidato evergreen
    // Requisitos:
    //   a) Antigüedad mínima de 90 días: el contenido evergreen necesita tiempo para
    //      demostrar que no es temporal y para acumular autoridad en buscadores
    //   b) El título no debe contener patrones de noticia/temporalidad
    //   c) Idealmente el título sugiere contenido informativo/educativo (guías, consejos, etc.)
    const umbralFecha = new Date();
    umbralFecha.setDate(umbralFecha.getDate() - DIAS_MINIMO_PILAR);

    const evergreen = articulos.filter((a) => {
      const fecha = new Date(a.fecha);
      const esLoSuficientementeAntiguo = fecha <= umbralFecha;
      const esNoticia = PATRON_NOTICIA.test(a.titulo || "");
      return esLoSuficientementeAntiguo && !esNoticia;
    });

    // 3. Ordenar por antigüedad DESC (más antiguo primero): los artículos más antiguos
    // tienen más tiempo para haber acumulado enlaces, autoridad y tráfico orgánico
    const evergreenOrdenado = evergreen.sort(
      (a, b) => new Date(a.fecha) - new Date(b.fecha)
    );

    // 4. Calcular score de calidad evergreen para cada artículo
    // Un score más alto indica mayor probabilidad de ser un buen pilar
    const evergreenConScore = evergreenOrdenado.map((a) => {
      const diasAntiguo = Math.floor(
        (new Date() - new Date(a.fecha)) / (1000 * 60 * 60 * 24)
      );
      // Bonus por tener patrones de contenido evergreen en el título
      const tienePatronEvergreen = PATRON_EVERGREEN.test(a.titulo || "");
      // Score: base por antigüedad (máx 70 puntos) + bonus por patrón (30 puntos)
      const scoreAntiguedad = Math.min(70, Math.floor(diasAntiguo / 3)); // 1 punto cada 3 días, máx 70
      const scorePatron = tienePatronEvergreen ? 30 : 0;
      return {
        ...a,
        _scoreEvergreen: scoreAntiguedad + scorePatron,
        edad: diasAntiguo,
      };
    });

    // 5. Top 8 pilares por score (combina antigüedad + calidad del título)
    const pilares = evergreenConScore
      .sort((a, b) => b._scoreEvergreen - a._scoreEvergreen)
      .slice(0, 8);

    // 6. Extraer categorías/temas cubiertos para identificar gaps
    const topicsCovered = [...new Set(articulos.map((a) => a.categoria || "").filter(Boolean))];

    // 7. Definir temas evergreen que típicamente funcionan bien en blogs de materiales
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

    // 8. Sugerir gaps: temas que son buenos para blog pero no tenemos
    const gaps = EVERGREEN_TOPICS.filter((topic) => {
      const covered = articulos.some(
        (a) =>
          a.titulo?.toLowerCase().includes(topic.toLowerCase()) ||
          a.categoria?.toLowerCase().includes(topic.toLowerCase())
      );
      return !covered;
    }).slice(0, 4);

    // 9. Calcular impactoEstimado para la visualización (0-100)
    const pilaresConMetricas = pilares.map((p) => ({
      ...p,
      impactoEstimado: Math.min(100, p._scoreEvergreen),
    }));

    return res.status(200).json({
      pilares: pilaresConMetricas,
      gaps,
      topicsCovered,
      totalArticulos: articulos.length,
      totalEvergreen: evergreen.length,
    });
  } catch (err) {
    console.error("Evergreen analysis error:", err);
    return res.status(500).json({ error: "Error analizando pilares evergreen" });
  }
}
