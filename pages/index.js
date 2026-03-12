import { useState, useEffect } from "react";
import Head from "next/head";

const CATEGORIAS = [
  { group: "Inspiración e ideas", items: ["Baño", "Cocinas", "Cerámica y parquet", "Espacios exteriores"] },
  { group: "Aprende con nosotros", items: ["Consejos", "Guía paso a paso", "Soluciones constructivas"] },
  { group: "Noticias", items: ["Nuevos productos", "Sector", "Eventos"] },
];

const TONOS = [
  "Informativo / Educativo",
  "Inspiracional / Tendencias",
  "Técnico / Profesional",
  "Guía práctica paso a paso",
];

const EJEMPLOS = [
  { tema: "Tendencias en pavimentos exteriores para 2026", categoria: "Espacios exteriores", keywords: "pavimento exterior, antideslizante, porcelánico, terraza" },
  { tema: "Cómo elegir el mejor adhesivo para cerámica", categoria: "Consejos", keywords: "adhesivo cerámica, colas, colocación azulejos" },
  { tema: "Cocinas de diseño nórdico: materiales y acabados", categoria: "Cocinas", keywords: "cocina nórdica, madera, blanco, encimera" },
];

const C = {
  red: "#E31E24", redDark: "#B71C1C", redLight: "#FFEBEE",
  dark: "#2D2D2D", mid: "#555555", light: "#F5F5F5",
  border: "#E0E0E0", white: "#FFFFFF", muted: "#888888",
  green: "#16a34a", greenLight: "#DCFCE7",
  orange: "#EA580C", orangeLight: "#FFF7ED",
  blue: "#2563EB", blueLight: "#EFF6FF",
};

// ─── Markdown Renderer ──────────────────────────────────────────────────────

function MarkdownRenderer({ content }) {
  const parseInline = (text) =>
    text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
        `<a href="https://ferrolan.es$2" style="color:${C.red};text-decoration:underline;font-weight:600" target="_blank">$1</a>`
      );

  const lines = content.split("\n");
  const elements = [];
  let listItems = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key++}`} style={{ margin: "0.8em 0 1.2em 1.4em", padding: 0 }}>
          {listItems.map((item, i) => (
            <li key={i} style={{ marginBottom: "0.45em", lineHeight: 1.7, color: C.mid }}
              dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    if (line.startsWith("# ")) {
      flushList();
      elements.push(<h1 key={i} style={{ fontSize: "1.55rem", fontWeight: 700, color: C.dark, fontFamily: "'Oswald', sans-serif", lineHeight: 1.2, margin: "0 0 1rem", borderLeft: `4px solid ${C.red}`, paddingLeft: "0.85rem" }}>{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      flushList();
      elements.push(<h2 key={i} style={{ fontSize: "1.1rem", fontWeight: 700, color: C.dark, fontFamily: "'Oswald', sans-serif", margin: "1.8em 0 0.6em", textTransform: "uppercase", letterSpacing: "0.04em" }}><span style={{ color: C.red, marginRight: "0.4rem" }}>▸</span>{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      flushList();
      elements.push(<h3 key={i} style={{ fontSize: "0.88rem", fontWeight: 700, color: C.mid, margin: "1.1em 0 0.35em", textTransform: "uppercase", letterSpacing: "0.06em" }}>{line.slice(4)}</h3>);
    } else if (line.startsWith("- ")) {
      listItems.push(parseInline(line.slice(2)));
    } else if (line === "---") {
      flushList();
      elements.push(<hr key={i} style={{ border: "none", borderTop: `2px dashed ${C.border}`, margin: "2em 0" }} />);
    } else if (line.trim() === "") {
      flushList();
      elements.push(<div key={i} style={{ height: "0.4em" }} />);
    } else {
      flushList();
      elements.push(<p key={i} style={{ lineHeight: 1.78, color: C.mid, margin: "0 0 0.75em", fontSize: "0.94rem" }} dangerouslySetInnerHTML={{ __html: parseInline(line) }} />);
    }
  });
  flushList();
  return <div>{elements}</div>;
}

// ─── Image Panel ────────────────────────────────────────────────────────────

function ImagePanel({ imagenes, loadingImages, onGenerate, hasArticle }) {
  if (!hasArticle) return null;

  return (
    <div style={{ marginTop: "1rem", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
      <div style={{ background: C.dark, padding: "0.65rem 1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span style={{ color: C.white, fontWeight: 700, fontSize: "0.82rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.07em" }}>Imágenes del artículo</span>
        </div>
        {!loadingImages && imagenes.length === 0 && (
          <button onClick={onGenerate}
            style={{ background: C.red, color: C.white, border: "none", borderRadius: 5, padding: "0.35rem 0.9rem", fontSize: "0.75rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}
            onMouseOver={e => e.currentTarget.style.background = C.redDark}
            onMouseOut={e => e.currentTarget.style.background = C.red}>
            Generar imágenes
          </button>
        )}
        {imagenes.length > 0 && (
          <button onClick={onGenerate}
            style={{ background: "#444", color: C.white, border: "none", borderRadius: 5, padding: "0.35rem 0.9rem", fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
            ↺ Regenerar
          </button>
        )}
      </div>

      <div style={{ padding: "1.25rem" }}>
        {loadingImages && (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <div style={{ width: 40, height: 40, border: `3px solid ${C.redLight}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1rem" }} />
            <div style={{ color: C.dark, fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: "0.85rem", marginBottom: "0.3rem" }}>Generando imágenes...</div>
            <div style={{ color: C.muted, fontSize: "0.8rem" }}>Claude diseña los prompts · Gemini Imagen 3 las renderiza</div>
          </div>
        )}

        {!loadingImages && imagenes.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: C.muted, fontSize: "0.85rem" }}>
            Pulsa <strong style={{ color: C.red }}>Generar imágenes</strong> para crear las imágenes del artículo con IA
          </div>
        )}

        {imagenes.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {imagenes.map((img, i) => (
              <div key={i}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem", fontFamily: "'Oswald', sans-serif" }}>
                  {i === 0 ? "Imagen ambiente" : "Detalle de material"}
                </div>
                <img src={img.src} alt={img.descripcion}
                  style={{ width: "100%", borderRadius: 6, display: "block", border: `1px solid ${C.border}` }} />
                <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: "0.4rem", lineHeight: 1.4, fontStyle: "italic" }}>
                  {img.descripcion}
                </div>
                <a href={img.src} download={`ferrolan-imagen-${i + 1}.png`}
                  style={{ display: "inline-block", marginTop: "0.5rem", fontSize: "0.73rem", color: C.red, fontWeight: 600, textDecoration: "none" }}>
                  ↓ Descargar
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── GSC Dashboard Panel ────────────────────────────────────────────────────

function GSCPanel({ onSelectTopic }) {
  const [gscData, setGscData] = useState(null);
  const [gscLoading, setGscLoading] = useState(true);
  const [gscError, setGscError] = useState("");
  const [activeGscTab, setActiveGscTab] = useState("oportunidades");

  const fetchGSC = async () => {
    setGscLoading(true);
    setGscError("");
    try {
      const res = await fetch("/api/gsc-data");
      const data = await res.json();
      setGscData(data);
    } catch {
      setGscError("Error cargando datos GSC");
    }
    setGscLoading(false);
  };

  useEffect(() => { fetchGSC(); }, []);

  const tabStyle = (tab) => ({
    padding: "0.3rem 0.5rem",
    borderRadius: 4,
    border: "none",
    background: activeGscTab === tab ? C.red : "transparent",
    color: activeGscTab === tab ? C.white : "#AAA",
    fontSize: "0.63rem",
    cursor: "pointer",
    fontFamily: "'Oswald', sans-serif",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    whiteSpace: "nowrap",
    flex: 1,
    textAlign: "center",
  });

  const statCard = (label, value) => (
    <div style={{ background: C.light, borderRadius: 6, padding: "0.5rem 0.55rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.05rem", fontWeight: 700, color: C.dark, fontFamily: "'Oswald', sans-serif" }}>{value}</div>
      <div style={{ fontSize: "0.58rem", color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );

  const posColor = (pos) => pos <= 3 ? C.green : pos <= 7 ? C.orange : C.red;

  const formatNum = (n) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  const handleClick = (item) => {
    onSelectTopic({
      tema: item.sugerencia || item.query,
      categoria: item.categoria || "",
      keywords: item.query,
    });
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
      {/* Header */}
      <div style={{ background: C.dark, padding: "0.6rem 0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          <span style={{ color: C.white, fontWeight: 700, fontSize: "0.75rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Panel GSC</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {gscData && (
            <span style={{ fontSize: "0.56rem", padding: "0.12rem 0.4rem", borderRadius: 3, background: gscData.live ? "rgba(22,163,74,0.2)" : "rgba(255,255,255,0.12)", color: gscData.live ? "#4ADE80" : "#999", fontWeight: 600 }}>
              {gscData.live ? "● LIVE" : "● ESTÁTICO"}
            </span>
          )}
          <button onClick={fetchGSC} disabled={gscLoading}
            style={{ background: "rgba(255,255,255,0.1)", color: "#CCC", border: "none", borderRadius: 4, padding: "0.15rem 0.4rem", fontSize: "0.68rem", cursor: "pointer" }}
            title="Actualizar datos">
            ↺
          </button>
        </div>
      </div>

      <div style={{ padding: "0.75rem", maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}>
        {/* Loading */}
        {gscLoading && (
          <div style={{ textAlign: "center", padding: "2rem 0.5rem" }}>
            <div style={{ width: 26, height: 26, border: `2px solid ${C.redLight}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.65rem" }} />
            <div style={{ fontSize: "0.72rem", color: C.muted }}>Cargando datos GSC...</div>
          </div>
        )}

        {/* Error */}
        {gscError && !gscLoading && (
          <div style={{ background: C.redLight, borderRadius: 5, padding: "0.5rem", fontSize: "0.72rem", color: C.redDark }}>
            ⚠ {gscError}
          </div>
        )}

        {/* Data */}
        {gscData && !gscLoading && (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem", marginBottom: "0.6rem" }}>
              {statCard("Clics", formatNum(gscData.resumen.clics))}
              {statCard("Impresiones", formatNum(gscData.resumen.impresiones))}
              {statCard("CTR", gscData.resumen.ctr + "%")}
              {statCard("Pos. media", gscData.resumen.posicion)}
            </div>

            <div style={{ fontSize: "0.57rem", color: C.muted, textAlign: "center", marginBottom: "0.65rem" }}>
              {gscData.resumen.periodo}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.15rem", marginBottom: "0.55rem", background: C.dark, borderRadius: 5, padding: "0.18rem" }}>
              {[
                ["oportunidades", "Oportunidades"],
                ["quickwins", "Quick Wins"],
                ["nuevos", "Nuevos"],
                ["articulos", "Artículos"],
              ].map(([key, label]) => (
                <button key={key} onClick={() => setActiveGscTab(key)} style={tabStyle(key)}>
                  {label}
                </button>
              ))}
            </div>

            {/* Tab: Oportunidades */}
            {activeGscTab === "oportunidades" && (
              <div>
                <div style={{ fontSize: "0.62rem", color: C.muted, marginBottom: "0.4rem", lineHeight: 1.35 }}>
                  Alto volumen, posición mejorable. Clic para generar artículo.
                </div>
                {(gscData.oportunidades || []).map((item, i) => (
                  <button key={i} onClick={() => handleClick(item)}
                    style={{ display: "block", width: "100%", textAlign: "left", background: i % 2 === 0 ? C.white : C.light, border: `1px solid ${C.border}`, borderRadius: 5, padding: "0.45rem 0.55rem", marginBottom: "0.25rem", cursor: "pointer", transition: "all 0.12s" }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.background = C.redLight; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = i % 2 === 0 ? C.white : C.light; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.15rem" }}>
                      <span style={{ fontSize: "0.74rem", fontWeight: 700, color: C.dark }}>{item.query}</span>
                      <span style={{ fontSize: "0.6rem", fontWeight: 700, color: posColor(item.posicion), background: `${posColor(item.posicion)}15`, padding: "0.08rem 0.3rem", borderRadius: 3 }}>
                        pos {item.posicion}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.6rem", color: C.muted }}>
                      <span>{formatNum(item.impresiones)} impr</span>
                      <span>{item.clics} clics</span>
                      <span>CTR {item.ctr}%</span>
                    </div>
                    {item.sugerencia && (
                      <div style={{ fontSize: "0.6rem", color: C.mid, marginTop: "0.2rem", fontStyle: "italic", lineHeight: 1.25 }}>
                        → {item.sugerencia}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Tab: Quick Wins */}
            {activeGscTab === "quickwins" && (
              <div>
                <div style={{ fontSize: "0.62rem", color: C.muted, marginBottom: "0.4rem", lineHeight: 1.35 }}>
                  Ya bien posicionados — mantener y reforzar.
                </div>
                {(gscData.quickWins || []).map((item, i) => (
                  <button key={i} onClick={() => handleClick({ ...item, sugerencia: item.nota })}
                    style={{ display: "block", width: "100%", textAlign: "left", background: C.greenLight, border: `1px solid #BBF7D0`, borderRadius: 5, padding: "0.45rem 0.55rem", marginBottom: "0.25rem", cursor: "pointer", transition: "all 0.12s" }}
                    onMouseOver={e => e.currentTarget.style.borderColor = C.green}
                    onMouseOut={e => e.currentTarget.style.borderColor = "#BBF7D0"}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.15rem" }}>
                      <span style={{ fontSize: "0.74rem", fontWeight: 700, color: C.dark }}>{item.query}</span>
                      <span style={{ fontSize: "0.6rem", fontWeight: 700, color: C.green, background: C.greenLight, padding: "0.08rem 0.3rem", borderRadius: 3 }}>
                        ✓ pos {item.posicion}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.6rem", color: C.muted }}>
                      <span>{formatNum(item.impresiones)} impr</span>
                      <span>CTR {item.ctr}%</span>
                    </div>
                    {item.nota && (
                      <div style={{ fontSize: "0.6rem", color: C.green, marginTop: "0.15rem", fontWeight: 600 }}>
                        ✦ {item.nota}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Tab: Nuevos Temas */}
            {activeGscTab === "nuevos" && (
              <div>
                <div style={{ fontSize: "0.62rem", color: C.muted, marginBottom: "0.4rem", lineHeight: 1.35 }}>
                  Keywords con demanda sin artículo dedicado. Clic para crear uno.
                </div>
                {(gscData.nuevosTemasGSC || []).map((item, i) => (
                  <button key={i} onClick={() => handleClick(item)}
                    style={{ display: "block", width: "100%", textAlign: "left", background: C.blueLight, border: `1px solid #BFDBFE`, borderRadius: 5, padding: "0.45rem 0.55rem", marginBottom: "0.25rem", cursor: "pointer", transition: "all 0.12s" }}
                    onMouseOver={e => e.currentTarget.style.borderColor = C.blue}
                    onMouseOut={e => e.currentTarget.style.borderColor = "#BFDBFE"}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.15rem" }}>
                      <span style={{ fontSize: "0.74rem", fontWeight: 700, color: C.dark }}>{item.query}</span>
                      <span style={{ fontSize: "0.6rem", fontWeight: 600, color: C.blue }}>{formatNum(item.impresiones)} impr</span>
                    </div>
                    {item.sugerencia && (
                      <div style={{ fontSize: "0.63rem", color: C.blue, fontWeight: 600, lineHeight: 1.25 }}>
                        → {item.sugerencia}
                      </div>
                    )}
                    <div style={{ fontSize: "0.57rem", color: C.muted, marginTop: "0.12rem" }}>
                      Pos. actual: {item.posicion} · {item.categoria}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Tab: Artículos a actualizar */}
            {activeGscTab === "articulos" && (
              <div>
                <div style={{ fontSize: "0.62rem", color: C.muted, marginBottom: "0.4rem", lineHeight: 1.35 }}>
                  Artículos del blog con más impresiones. Revisar periódicamente.
                </div>
                {(gscData.articulosActualizar || []).map((item, i) => (
                  <div key={i}
                    style={{ background: i % 2 === 0 ? C.white : C.light, border: `1px solid ${C.border}`, borderRadius: 5, padding: "0.45rem 0.55rem", marginBottom: "0.25rem" }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.dark, marginBottom: "0.15rem", lineHeight: 1.25 }}>
                      {item.pagina}
                    </div>
                    <div style={{ display: "flex", gap: "0.45rem", fontSize: "0.6rem", color: C.muted, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600 }}>{formatNum(item.impresiones)} impr</span>
                      <span>{formatNum(item.clics)} clics</span>
                      <span style={{ color: posColor(item.posicion) }}>pos {item.posicion}</span>
                      <span>CTR {item.ctr}%</span>
                    </div>
                    {item.url && (
                      <a href={`https://ferrolan.es${item.url}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: "0.57rem", color: C.red, textDecoration: "none", marginTop: "0.15rem", display: "inline-block" }}>
                        Ver artículo →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Footer indicator */}
            {!gscData.live && (
              <div style={{ marginTop: "0.55rem", padding: "0.4rem 0.5rem", background: C.orangeLight, borderRadius: 5, fontSize: "0.58rem", color: C.orange, lineHeight: 1.35 }}>
                ⓘ Datos del último análisis manual. Configura credenciales de Google para datos en vivo.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function Home() {
  const [tema, setTema] = useState("");
  const [categoria, setCategoria] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tono, setTono] = useState(TONOS[0]);
  const [notas, setNotas] = useState("");
  const [articulo, setArticulo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [imagenes, setImagenes] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageError, setImageError] = useState("");

  const handleSelectTopic = ({ tema: t, categoria: c, keywords: k }) => {
    setTema(t);
    if (c) setCategoria(c);
    if (k) setKeywords(k);
    document.querySelector(".form-column")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const generarArticulo = async () => {
    if (!tema || !categoria) { setError("Por favor, rellena el tema y la categoría."); return; }
    setError(""); setLoading(true); setArticulo(""); setImagenes([]); setImageError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema, categoria, keywords, tono, notas }),
      });
      const data = await res.json();
      if (data.articulo) { setArticulo(data.articulo); setActiveTab("preview"); }
      else setError(data.error || "Error al generar el artículo.");
    } catch { setError("Error de conexión. Inténtalo de nuevo."); }
    setLoading(false);
  };

  const generarImagenes = async () => {
    if (!articulo) return;
    setLoadingImages(true); setImagenes([]); setImageError("");
    try {
      const res = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema, categoria, articleText: articulo }),
      });
      const data = await res.json();
      if (data.imagenes) setImagenes(data.imagenes);
      else setImageError(data.error || "Error generando imágenes.");
    } catch { setImageError("Error de conexión al generar imágenes."); }
    setLoadingImages(false);
  };

  const copiarMarkdown = () => {
    navigator.clipboard.writeText(articulo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const inputStyle = { width: "100%", border: `1px solid ${C.border}`, borderRadius: 6, padding: "0.55rem 0.75rem", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: C.dark, background: C.white };
  const labelStyle = { fontSize: "0.68rem", fontWeight: 700, color: C.dark, display: "block", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.05em" };

  return (
    <>
      <Head>
        <title>Ferrolan · Generador de Blog + GSC</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F2F2F2; font-family: 'Source Sans 3', 'Segoe UI', sans-serif; }
        input:focus, textarea:focus, select:focus { border-color: ${C.red} !important; box-shadow: 0 0 0 3px rgba(227,30,36,0.1); }
        button { transition: all 0.12s ease; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .articulo-panel { animation: fadeIn 0.3s ease; }
        @media (max-width: 1100px) {
          .main-grid { grid-template-columns: 1fr !important; }
          .form-sticky, .gsc-sticky { position: relative !important; top: 0 !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{ background: C.white, borderBottom: `3px solid ${C.red}`, padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
        <img src="/logo-ferrolan.png" alt="Ferrolan" style={{ height: 36, objectFit: "contain" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
          <span style={{ fontSize: "0.7rem", color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Oswald', sans-serif" }}>Generador de Artículos · Herramienta interna</span>
        </div>
      </header>

      <div style={{ background: C.red, padding: "0.4rem 1.5rem" }}>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.7rem", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>Blog · Claude AI + Gemini Imagen 3 · Panel Google Search Console</p>
      </div>

      {/* Main 3-Column Grid */}
      <div className="main-grid" style={{ maxWidth: 1520, margin: "0 auto", padding: "1.25rem 1rem", display: "grid", gridTemplateColumns: "320px 1fr 365px", gap: "1.1rem", alignItems: "start" }}>

        {/* ─── LEFT: FORM ─── */}
        <div className="form-column form-sticky" style={{ position: "sticky", top: "1rem" }}>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ background: C.dark, padding: "0.65rem 0.9rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <span style={{ color: C.white, fontWeight: 700, fontSize: "0.75rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Configurar artículo</span>
            </div>

            <div style={{ padding: "0.9rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* Ejemplos rápidos */}
              <div>
                <div style={{ ...labelStyle, color: C.muted, marginBottom: "0.35rem", fontSize: "0.63rem" }}>Ejemplos rápidos</div>
                {EJEMPLOS.map((ej, i) => (
                  <button key={i} onClick={() => { setTema(ej.tema); setCategoria(ej.categoria); setKeywords(ej.keywords); }}
                    style={{ display: "block", width: "100%", marginBottom: "0.2rem", background: C.redLight, border: `1px solid #FFCDD2`, borderRadius: 4, padding: "0.3rem 0.55rem", textAlign: "left", cursor: "pointer", fontSize: "0.7rem", color: C.redDark, lineHeight: 1.35, fontFamily: "inherit" }}
                    onMouseOver={e => e.currentTarget.style.background = "#FFCDD2"}
                    onMouseOut={e => e.currentTarget.style.background = C.redLight}>
                    {ej.tema}
                  </button>
                ))}
              </div>

              <div style={{ borderTop: `1px solid ${C.light}` }} />

              <div>
                <label style={labelStyle}>Tema del artículo *</label>
                <input value={tema} onChange={e => setTema(e.target.value)} placeholder="Ej: Tendencias en pavimentos 2026..." style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Categoría *</label>
                <select value={categoria} onChange={e => setCategoria(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Selecciona categoría...</option>
                  {CATEGORIAS.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map(item => <option key={item} value={item}>{item}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Keywords SEO <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.65rem", color: C.muted }}>(opcional)</span></label>
                <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Ej: suelo porcelánico, exterior" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Tono</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
                  {TONOS.map(t => (
                    <button key={t} onClick={() => setTono(t)}
                      style={{ padding: "0.22rem 0.45rem", borderRadius: 4, border: tono === t ? `1.5px solid ${C.red}` : `1px solid ${C.border}`, background: tono === t ? C.redLight : C.white, color: tono === t ? C.redDark : C.mid, fontSize: "0.63rem", cursor: "pointer", fontFamily: "inherit", fontWeight: tono === t ? 700 : 400 }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notas <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.65rem", color: C.muted }}>(opcional)</span></label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Productos, datos técnicos..." rows={2}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.45 }} />
              </div>

              {error && <div style={{ background: C.redLight, border: `1px solid #FFCDD2`, borderRadius: 5, padding: "0.4rem 0.6rem", color: C.redDark, fontSize: "0.73rem", fontWeight: 600 }}>⚠ {error}</div>}

              <button onClick={generarArticulo} disabled={loading}
                style={{ background: loading ? C.redDark : C.red, color: C.white, border: "none", borderRadius: 6, padding: "0.75rem", fontWeight: 700, fontSize: "0.84rem", cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.07em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem" }}
                onMouseOver={e => !loading && (e.currentTarget.style.background = C.redDark)}
                onMouseOut={e => !loading && (e.currentTarget.style.background = C.red)}>
                {loading ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "spin 0.85s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Generando...</> : "Generar artículo"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: "0.55rem", background: C.white, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.red}`, borderRadius: "0 5px 5px 0", padding: "0.5rem 0.75rem" }}>
            <div style={{ fontSize: "0.6rem", color: C.dark, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Oswald', sans-serif", marginBottom: "0.15rem" }}>Cada artículo incluye</div>
            <div style={{ fontSize: "0.65rem", color: C.mid, lineHeight: 1.55 }}>
              Tono informativo · Editorial · Links internos · Meta SEO · 2 imágenes IA
            </div>
          </div>
        </div>

        {/* ─── CENTER: RESULT ─── */}
        <div>
          {!articulo && !loading && (
            <div style={{ background: C.white, border: `2px dashed ${C.border}`, borderRadius: 8, padding: "5rem 2rem", textAlign: "center" }}>
              <div style={{ width: 52, height: 52, background: C.redLight, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
              <div style={{ color: C.dark, fontWeight: 700, fontSize: "0.9rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem" }}>Genera tu artículo</div>
              <div style={{ color: C.muted, fontSize: "0.82rem", maxWidth: 380, margin: "0 auto", lineHeight: 1.5 }}>Usa el formulario o selecciona una oportunidad del panel GSC</div>
            </div>
          )}

          {loading && (
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5rem 2rem", textAlign: "center" }}>
              <div style={{ width: 42, height: 42, border: `3px solid ${C.redLight}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1.1rem" }} />
              <div style={{ color: C.dark, fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem" }}>Generando artículo...</div>
              <div style={{ color: C.muted, fontSize: "0.82rem" }}>Claude está redactando en el estilo de Ferrolan</div>
            </div>
          )}

          {articulo && (
            <div className="articulo-panel">
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                <div style={{ background: C.dark, padding: "0.6rem 1.1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: "0.2rem" }}>
                    {[["preview", "Vista previa"], ["markdown", "Markdown"]].map(([val, label]) => (
                      <button key={val} onClick={() => setActiveTab(val)}
                        style={{ padding: "0.28rem 0.75rem", borderRadius: 4, border: "none", background: activeTab === val ? C.red : "transparent", color: activeTab === val ? C.white : "#AAAAAA", fontSize: "0.72rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={copiarMarkdown}
                    style={{ background: copied ? "#16a34a" : "#444", color: C.white, border: "none", borderRadius: 5, padding: "0.32rem 0.8rem", fontSize: "0.72rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                    {copied ? "✓ Copiado!" : "⎘ Copiar Markdown"}
                  </button>
                </div>

                <div style={{ padding: "1.8rem 2.2rem", maxHeight: "65vh", overflowY: "auto" }}>
                  {activeTab === "preview"
                    ? <MarkdownRenderer content={articulo} />
                    : <pre style={{ fontFamily: "monospace", fontSize: "0.8rem", lineHeight: 1.7, color: C.mid, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{articulo}</pre>
                  }
                </div>

                <div style={{ borderTop: `1px solid ${C.light}`, padding: "0.75rem 1.3rem", display: "flex", alignItems: "center", gap: "0.65rem", background: C.light }}>
                  <button onClick={generarArticulo}
                    style={{ background: C.dark, color: C.white, border: "none", borderRadius: 5, padding: "0.45rem 1rem", fontSize: "0.74rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}
                    onMouseOver={e => e.currentTarget.style.background = C.red}
                    onMouseOut={e => e.currentTarget.style.background = C.dark}>
                    ↺ Regenerar
                  </button>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: "0.68rem", color: C.muted }}>Listo para publicar en WordPress</span>
                </div>
              </div>

              {imageError && (
                <div style={{ marginTop: "0.65rem", background: C.redLight, border: `1px solid #FFCDD2`, borderRadius: 6, padding: "0.5rem 0.9rem", color: C.redDark, fontSize: "0.78rem", fontWeight: 600 }}>
                  ⚠ {imageError}
                </div>
              )}
              <ImagePanel
                imagenes={imagenes}
                loadingImages={loadingImages}
                onGenerate={generarImagenes}
                hasArticle={!!articulo}
              />
            </div>
          )}
        </div>

        {/* ─── RIGHT: GSC PANEL ─── */}
        <div className="gsc-sticky" style={{ position: "sticky", top: "1rem" }}>
          <GSCPanel onSelectTopic={handleSelectTopic} />
        </div>

      </div>
    </>
  );
}
