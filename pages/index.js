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
  red: "#E31E24", redDark: "#B71C1C", redLight: "#FEF2F2",
  dark: "#1A1A1A", mid: "#4A4A4A", light: "#F8F8F8",
  border: "#E5E5E5", white: "#FFFFFF", muted: "#999999",
  green: "#059669", greenLight: "#ECFDF5", greenBorder: "#A7F3D0",
  orange: "#D97706", orangeLight: "#FFFBEB",
  blue: "#2563EB", blueLight: "#EFF6FF", blueBorder: "#BFDBFE",
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
        <ul key={`ul-${key++}`} style={{ margin: "0.8em 0 1.2em 1.6em", padding: 0 }}>
          {listItems.map((item, i) => (
            <li key={i} style={{ marginBottom: "0.5em", lineHeight: 1.75, color: C.mid, fontSize: "1.02rem" }}
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
      elements.push(<h1 key={i} style={{ fontSize: "1.7rem", fontWeight: 700, color: C.dark, fontFamily: "'Oswald', sans-serif", lineHeight: 1.2, margin: "0 0 1.2rem", borderLeft: `4px solid ${C.red}`, paddingLeft: "1rem" }}>{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      flushList();
      elements.push(<h2 key={i} style={{ fontSize: "1.2rem", fontWeight: 700, color: C.dark, fontFamily: "'Oswald', sans-serif", margin: "2em 0 0.7em", textTransform: "uppercase", letterSpacing: "0.04em" }}><span style={{ color: C.red, marginRight: "0.5rem" }}>▸</span>{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      flushList();
      elements.push(<h3 key={i} style={{ fontSize: "1rem", fontWeight: 700, color: C.mid, margin: "1.2em 0 0.4em", textTransform: "uppercase", letterSpacing: "0.05em" }}>{line.slice(4)}</h3>);
    } else if (line.startsWith("- ")) {
      listItems.push(parseInline(line.slice(2)));
    } else if (line === "---") {
      flushList();
      elements.push(<hr key={i} style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "2.2em 0" }} />);
    } else if (line.trim() === "") {
      flushList();
      elements.push(<div key={i} style={{ height: "0.5em" }} />);
    } else {
      flushList();
      elements.push(<p key={i} style={{ lineHeight: 1.8, color: C.mid, margin: "0 0 0.85em", fontSize: "1.02rem" }} dangerouslySetInnerHTML={{ __html: parseInline(line) }} />);
    }
  });
  flushList();
  return <div>{elements}</div>;
}

// ─── Image Panel ────────────────────────────────────────────────────────────

function ImagePanel({ imagenes, loadingImages, onGenerate, hasArticle }) {
  if (!hasArticle) return null;

  return (
    <div style={{ marginTop: "1.25rem", background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: "0.9rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", color: C.dark }}>Imágenes del artículo</span>
        {!loadingImages && imagenes.length === 0 && (
          <button onClick={onGenerate}
            style={{ background: C.red, color: C.white, border: "none", borderRadius: 8, padding: "0.5rem 1.2rem", fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}
            onMouseOver={e => e.currentTarget.style.background = C.redDark}
            onMouseOut={e => e.currentTarget.style.background = C.red}>
            Generar imágenes
          </button>
        )}
        {imagenes.length > 0 && (
          <button onClick={onGenerate}
            style={{ background: C.light, color: C.mid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0.5rem 1.2rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
            ↺ Regenerar
          </button>
        )}
      </div>

      <div style={{ padding: "1.5rem" }}>
        {loadingImages && (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <div style={{ width: 44, height: 44, border: `3px solid ${C.border}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1.2rem" }} />
            <div style={{ color: C.dark, fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: "0.95rem", marginBottom: "0.4rem" }}>Generando imágenes...</div>
            <div style={{ color: C.muted, fontSize: "0.9rem" }}>Claude diseña los prompts · Gemini Imagen 3 las renderiza</div>
          </div>
        )}

        {!loadingImages && imagenes.length === 0 && (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: C.muted, fontSize: "0.95rem" }}>
            Pulsa <strong style={{ color: C.red }}>Generar imágenes</strong> para crear las imágenes del artículo con IA
          </div>
        )}

        {imagenes.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {imagenes.map((img, i) => (
              <div key={i}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem", fontFamily: "'Oswald', sans-serif" }}>
                  {i === 0 ? "Imagen ambiente" : "Detalle de material"}
                </div>
                <img src={img.src} alt={img.descripcion}
                  style={{ width: "100%", borderRadius: 10, display: "block", border: `1px solid ${C.border}` }} />
                <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: "0.5rem", lineHeight: 1.5, fontStyle: "italic" }}>
                  {img.descripcion}
                </div>
                <a href={img.src} download={`ferrolan-imagen-${i + 1}.png`}
                  style={{ display: "inline-block", marginTop: "0.5rem", fontSize: "0.85rem", color: C.red, fontWeight: 600, textDecoration: "none" }}>
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
    padding: "0.5rem 0.75rem",
    borderRadius: 8,
    border: "none",
    background: activeGscTab === tab ? C.red : "transparent",
    color: activeGscTab === tab ? C.white : C.muted,
    fontSize: "0.8rem",
    cursor: "pointer",
    fontFamily: "'Oswald', sans-serif",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    whiteSpace: "nowrap",
    flex: 1,
    textAlign: "center",
    transition: "all 0.15s",
  });

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
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ width: 32, height: 32, background: C.light, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: "0.9rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em", color: C.dark }}>Panel GSC</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {gscData && (
            <span style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: 6, background: gscData.live ? C.greenLight : C.light, color: gscData.live ? C.green : C.muted, fontWeight: 700, letterSpacing: "0.03em" }}>
              {gscData.live ? "● LIVE" : "● ESTÁTICO"}
            </span>
          )}
          <button onClick={fetchGSC} disabled={gscLoading}
            style={{ width: 32, height: 32, background: C.light, color: C.muted, border: "none", borderRadius: 8, fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Actualizar datos">
            ↺
          </button>
        </div>
      </div>

      <div style={{ padding: "1.25rem 1.5rem", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
        {/* Loading */}
        {gscLoading && (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <div style={{ width: 32, height: 32, border: `2.5px solid ${C.border}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1rem" }} />
            <div style={{ fontSize: "0.9rem", color: C.muted }}>Cargando datos GSC...</div>
          </div>
        )}

        {/* Error */}
        {gscError && !gscLoading && (
          <div style={{ background: C.redLight, borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.9rem", color: C.redDark }}>
            ⚠ {gscError}
          </div>
        )}

        {/* Data */}
        {gscData && !gscLoading && (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "1rem" }}>
              {[
                ["Clics", formatNum(gscData.resumen.clics)],
                ["Impresiones", formatNum(gscData.resumen.impresiones)],
                ["CTR medio", gscData.resumen.ctr + "%"],
                ["Posición", gscData.resumen.posicion],
              ].map(([label, value], i) => (
                <div key={i} style={{ background: C.light, borderRadius: 10, padding: "0.85rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.35rem", fontWeight: 700, color: C.dark, fontFamily: "'Oswald', sans-serif" }}>{value}</div>
                  <div style={{ fontSize: "0.72rem", color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.1rem" }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: "0.75rem", color: C.muted, textAlign: "center", marginBottom: "1rem" }}>
              {gscData.resumen.periodo}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", background: C.light, borderRadius: 10, padding: "0.25rem" }}>
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
                <p style={{ fontSize: "0.85rem", color: C.muted, marginBottom: "0.75rem", lineHeight: 1.5 }}>
                  Alto volumen, posición mejorable. Clic para generar artículo.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {(gscData.oportunidades || []).map((item, i) => (
                    <button key={i} onClick={() => handleClick(item)}
                      style={{ display: "block", width: "100%", textAlign: "left", background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.85rem 1rem", cursor: "pointer", transition: "all 0.15s" }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.boxShadow = "0 2px 8px rgba(227,30,36,0.1)"; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: C.dark }}>{item.query}</span>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: posColor(item.posicion), background: `${posColor(item.posicion)}12`, padding: "0.15rem 0.5rem", borderRadius: 6 }}>
                          pos {item.posicion}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.85rem", fontSize: "0.8rem", color: C.muted }}>
                        <span>{formatNum(item.impresiones)} impr</span>
                        <span>{item.clics} clics</span>
                        <span>CTR {item.ctr}%</span>
                      </div>
                      {item.sugerencia && (
                        <div style={{ fontSize: "0.82rem", color: C.mid, marginTop: "0.35rem", fontStyle: "italic", lineHeight: 1.4 }}>
                          → {item.sugerencia}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Quick Wins */}
            {activeGscTab === "quickwins" && (
              <div>
                <p style={{ fontSize: "0.85rem", color: C.muted, marginBottom: "0.75rem", lineHeight: 1.5 }}>
                  Ya bien posicionados — mantener y reforzar.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {(gscData.quickWins || []).map((item, i) => (
                    <button key={i} onClick={() => handleClick({ ...item, sugerencia: item.nota })}
                      style={{ display: "block", width: "100%", textAlign: "left", background: C.greenLight, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "0.85rem 1rem", cursor: "pointer", transition: "all 0.15s" }}
                      onMouseOver={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(5,150,105,0.1)"}
                      onMouseOut={e => e.currentTarget.style.boxShadow = "none"}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: C.dark }}>{item.query}</span>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: C.green, background: "rgba(5,150,105,0.1)", padding: "0.15rem 0.5rem", borderRadius: 6 }}>
                          ✓ pos {item.posicion}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.85rem", fontSize: "0.8rem", color: C.muted }}>
                        <span>{formatNum(item.impresiones)} impr</span>
                        <span>CTR {item.ctr}%</span>
                      </div>
                      {item.nota && (
                        <div style={{ fontSize: "0.82rem", color: C.green, marginTop: "0.3rem", fontWeight: 600 }}>
                          ✦ {item.nota}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Nuevos Temas */}
            {activeGscTab === "nuevos" && (
              <div>
                <p style={{ fontSize: "0.85rem", color: C.muted, marginBottom: "0.75rem", lineHeight: 1.5 }}>
                  Keywords con demanda sin artículo dedicado. Clic para crear uno.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {(gscData.nuevosTemasGSC || []).map((item, i) => (
                    <button key={i} onClick={() => handleClick(item)}
                      style={{ display: "block", width: "100%", textAlign: "left", background: C.blueLight, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: "0.85rem 1rem", cursor: "pointer", transition: "all 0.15s" }}
                      onMouseOver={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(37,99,235,0.1)"}
                      onMouseOut={e => e.currentTarget.style.boxShadow = "none"}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: C.dark }}>{item.query}</span>
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: C.blue }}>{formatNum(item.impresiones)} impr</span>
                      </div>
                      {item.sugerencia && (
                        <div style={{ fontSize: "0.85rem", color: C.blue, fontWeight: 600, lineHeight: 1.4 }}>
                          → {item.sugerencia}
                        </div>
                      )}
                      <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: "0.2rem" }}>
                        Pos. actual: {item.posicion} · {item.categoria}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Artículos */}
            {activeGscTab === "articulos" && (
              <div>
                <p style={{ fontSize: "0.85rem", color: C.muted, marginBottom: "0.75rem", lineHeight: 1.5 }}>
                  Artículos del blog con más impresiones. Revisar periódicamente.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {(gscData.articulosActualizar || []).map((item, i) => (
                    <div key={i}
                      style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.85rem 1rem" }}>
                      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: C.dark, marginBottom: "0.3rem", lineHeight: 1.35 }}>
                        {item.pagina}
                      </div>
                      <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.8rem", color: C.muted, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600 }}>{formatNum(item.impresiones)} impr</span>
                        <span>{formatNum(item.clics)} clics</span>
                        <span style={{ color: posColor(item.posicion), fontWeight: 600 }}>pos {item.posicion}</span>
                        <span>CTR {item.ctr}%</span>
                      </div>
                      {item.url && (
                        <a href={`https://ferrolan.es${item.url}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: "0.8rem", color: C.red, textDecoration: "none", marginTop: "0.3rem", display: "inline-block", fontWeight: 600 }}>
                          Ver artículo →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            {!gscData.live && (
              <div style={{ marginTop: "1rem", padding: "0.65rem 0.85rem", background: C.orangeLight, borderRadius: 8, fontSize: "0.8rem", color: C.orange, lineHeight: 1.45 }}>
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

  const inputStyle = { width: "100%", border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.75rem 1rem", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: C.dark, background: C.white };
  const labelStyle = { fontSize: "0.8rem", fontWeight: 700, color: C.dark, display: "block", marginBottom: "0.45rem", textTransform: "uppercase", letterSpacing: "0.05em" };

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
        body { background: ${C.light}; font-family: 'Source Sans 3', 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
        input:focus, textarea:focus, select:focus { border-color: ${C.red} !important; box-shadow: 0 0 0 3px rgba(227,30,36,0.08); }
        button { transition: all 0.15s ease; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .articulo-panel { animation: fadeIn 0.35s ease; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #DDD; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #BBB; }
        @media (max-width: 1200px) {
          .main-grid { grid-template-columns: 1fr !important; }
          .form-sticky, .gsc-sticky { position: relative !important; top: 0 !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{ background: C.white, borderBottom: `3px solid ${C.red}`, padding: "0 2.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <img src="/logo-ferrolan.png" alt="Ferrolan" style={{ height: 38, objectFit: "contain" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
          <span style={{ fontSize: "0.82rem", color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Oswald', sans-serif" }}>Generador de Artículos · Herramienta interna</span>
        </div>
      </header>

      {/* Main 3-Column Grid */}
      <div className="main-grid" style={{ maxWidth: 1920, margin: "0 auto", padding: "1.5rem 2rem", display: "grid", gridTemplateColumns: "380px 1fr 420px", gap: "1.5rem", alignItems: "start" }}>

        {/* ─── LEFT: FORM ─── */}
        <div className="form-column form-sticky" style={{ position: "sticky", top: "1.5rem" }}>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ width: 32, height: 32, background: C.redLight, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: "0.9rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", color: C.dark }}>Configurar artículo</span>
            </div>

            <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Ejemplos rápidos */}
              <div>
                <div style={{ ...labelStyle, color: C.muted, marginBottom: "0.5rem" }}>Ejemplos rápidos</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {EJEMPLOS.map((ej, i) => (
                    <button key={i} onClick={() => { setTema(ej.tema); setCategoria(ej.categoria); setKeywords(ej.keywords); }}
                      style={{ display: "block", width: "100%", background: C.redLight, border: `1px solid #FECACA`, borderRadius: 8, padding: "0.55rem 0.85rem", textAlign: "left", cursor: "pointer", fontSize: "0.88rem", color: C.redDark, lineHeight: 1.4, fontFamily: "inherit", fontWeight: 500 }}
                      onMouseOver={e => { e.currentTarget.style.background = "#FECACA"; e.currentTarget.style.borderColor = C.red; }}
                      onMouseOut={e => { e.currentTarget.style.background = C.redLight; e.currentTarget.style.borderColor = "#FECACA"; }}>
                      {ej.tema}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}` }} />

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
                <label style={labelStyle}>Keywords SEO <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.78rem", color: C.muted }}>(opcional)</span></label>
                <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Ej: suelo porcelánico, exterior" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Tono</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {TONOS.map(t => (
                    <button key={t} onClick={() => setTono(t)}
                      style={{ padding: "0.4rem 0.75rem", borderRadius: 8, border: tono === t ? `2px solid ${C.red}` : `1px solid ${C.border}`, background: tono === t ? C.redLight : C.white, color: tono === t ? C.redDark : C.mid, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", fontWeight: tono === t ? 700 : 500 }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notas <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.78rem", color: C.muted }}>(opcional)</span></label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Productos, datos técnicos..." rows={2}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
              </div>

              {error && <div style={{ background: C.redLight, border: `1px solid #FECACA`, borderRadius: 8, padding: "0.65rem 1rem", color: C.redDark, fontSize: "0.9rem", fontWeight: 600 }}>⚠ {error}</div>}

              <button onClick={generarArticulo} disabled={loading}
                style={{ background: loading ? C.redDark : C.red, color: C.white, border: "none", borderRadius: 10, padding: "0.9rem", fontWeight: 700, fontSize: "0.95rem", cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.07em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                onMouseOver={e => !loading && (e.currentTarget.style.background = C.redDark)}
                onMouseOut={e => !loading && (e.currentTarget.style.background = C.red)}>
                {loading ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "spin 0.85s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Generando...</> : "Generar artículo"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: "0.75rem", background: C.white, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.red}`, borderRadius: "0 10px 10px 0", padding: "0.75rem 1.1rem" }}>
            <div style={{ fontSize: "0.78rem", color: C.dark, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Oswald', sans-serif", marginBottom: "0.25rem" }}>Cada artículo incluye</div>
            <div style={{ fontSize: "0.85rem", color: C.mid, lineHeight: 1.6 }}>
              Tono informativo · Estructura editorial · Links internos · Meta SEO · 2 imágenes IA
            </div>
          </div>
        </div>

        {/* ─── CENTER: RESULT ─── */}
        <div>
          {!articulo && !loading && (
            <div style={{ background: C.white, border: `2px dashed ${C.border}`, borderRadius: 12, padding: "6rem 2.5rem", textAlign: "center" }}>
              <div style={{ width: 60, height: 60, background: C.redLight, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
              <div style={{ color: C.dark, fontWeight: 700, fontSize: "1.1rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.5rem" }}>Genera tu artículo</div>
              <div style={{ color: C.muted, fontSize: "0.95rem", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>Rellena el formulario o selecciona una oportunidad del panel GSC para empezar</div>
            </div>
          )}

          {loading && (
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "6rem 2.5rem", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, border: `3px solid ${C.border}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1.5rem" }} />
              <div style={{ color: C.dark, fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "1.05rem", marginBottom: "0.5rem" }}>Generando artículo...</div>
              <div style={{ color: C.muted, fontSize: "0.95rem" }}>Claude está redactando en el estilo de Ferrolan</div>
            </div>
          )}

          {articulo && (
            <div className="articulo-panel">
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                {/* Toolbar */}
                <div style={{ padding: "0.75rem 1.5rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: "0.25rem", background: C.light, borderRadius: 8, padding: "0.2rem" }}>
                    {[["preview", "Vista previa"], ["markdown", "Markdown"]].map(([val, label]) => (
                      <button key={val} onClick={() => setActiveTab(val)}
                        style={{ padding: "0.4rem 1rem", borderRadius: 6, border: "none", background: activeTab === val ? C.white : "transparent", color: activeTab === val ? C.dark : C.muted, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", boxShadow: activeTab === val ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={copiarMarkdown}
                    style={{ background: copied ? C.green : C.light, color: copied ? C.white : C.mid, border: copied ? "none" : `1px solid ${C.border}`, borderRadius: 8, padding: "0.45rem 1rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                    {copied ? "✓ Copiado" : "⎘ Copiar"}
                  </button>
                </div>

                {/* Content */}
                <div style={{ padding: "2.5rem 3rem", maxHeight: "70vh", overflowY: "auto" }}>
                  {activeTab === "preview"
                    ? <MarkdownRenderer content={articulo} />
                    : <pre style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: "0.9rem", lineHeight: 1.75, color: C.mid, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{articulo}</pre>
                  }
                </div>

                {/* Bottom bar */}
                <div style={{ borderTop: `1px solid ${C.border}`, padding: "0.85rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", background: C.light }}>
                  <button onClick={generarArticulo}
                    style={{ background: C.white, color: C.mid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0.55rem 1.2rem", fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.mid; }}>
                    ↺ Regenerar
                  </button>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: "0.82rem", color: C.muted }}>Listo para publicar en WordPress</span>
                </div>
              </div>

              {imageError && (
                <div style={{ marginTop: "0.85rem", background: C.redLight, border: `1px solid #FECACA`, borderRadius: 10, padding: "0.65rem 1.1rem", color: C.redDark, fontSize: "0.9rem", fontWeight: 600 }}>
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
        <div className="gsc-sticky" style={{ position: "sticky", top: "1.5rem" }}>
          <GSCPanel onSelectTopic={handleSelectTopic} />
        </div>

      </div>
    </>
  );
}
