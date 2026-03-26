import { kv } from "@vercel/kv";

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
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // 2. Determinar qué es evergreen
    // Heurística: artículos que tratan temas sin fecha (no noticias/eventos)
    // Si hay pocos artículos (<10), incluimos todos los no-noticia para que el panel sea útil
    const umbralDias = articulos.length < 10 ? 0 : 7; // Sin mínimo si hay pocos artículos
    const umbralFecha = new Date();
    umbralFecha.setDate(umbralFecha.getDate() - umbralDias);

    const evergreen = articulos.filter((a) => {
      const fecha = new Date(a.fecha);
      const suficienteAntiguo = umbralFecha >= fecha;
      // No incluir si parece una noticia (palabras clave de temporalidad)
      const esNoticia = /nuevo[s]?\s+(producto|lanzamiento)|event|lanzamiento|próximo|feria|jornada/i.test(a.titulo || "");
      return suficienteAntiguo && !esNoticia;
    });

    // 3. Identificar "pilares" = artículos evergreen más antiguos (más tiempo para acumular tráfico)
    // Los mostramos como top 8 más antiguos (o menos si hay pocos)
    const pilares = evergreen.slice(0, Math.min(8, evergreen.length));

    // 4. Extraer categorías/temas cubiertos para identificar gaps
    const topicsCovered = [...new Set(articulos.map((a) => a.categoria || "").filter(Boolean))];

    // 5. Definir temas evergreen que típicamente funcionan bien en blogs de materiales
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

    // 6. Sugerir gaps: temas que son buenos para blog pero no tenemos (aproximado por keywords/título)
    const gaps = EVERGREEN_TOPICS.filter((topic) => {
      const covered = articulos.some(
        (a) =>
          a.titulo?.toLowerCase().includes(topic.toLowerCase()) ||
          a.categoria?.toLowerCase().includes(topic.toLowerCase())
      );
      return !covered;
    }).slice(0, 4); // Top 4 sugerencias

    // 7. Para cada pilar, intentar encontrar datos de impacto (simulado, sin acceso a GSC real aquí)
    const pilaresConMetricas = pilares.map((p, idx) => ({
      ...p,
      // Simular scores basado en antigüedad y posición
      impactoEstimado: Math.max(50, 100 - idx * 8), // Mayor antigüedad = mayor estimación
      edad: Math.floor((new Date() - new Date(p.fecha)) / (1000 * 60 * 60 * 24)), // días
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
