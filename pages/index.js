import { useState, useEffect, useCallback, useMemo } from "react";
import Head from "next/head";

// ─── Markdown to HTML converter ─────────────────────────────────────────────

function markdownToHtml(md) {
  let html = md
    // Headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italics
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links — prepend ferrolan.es to relative URLs
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      const fullUrl = url.startsWith("/") ? `https://ferrolan.es${url}` : url;
      return `<a href="${fullUrl}">${text}</a>`;
    })
    // Horizontal rules
    .replace(/^---$/gm, "<hr>")
    // Line breaks between blocks
    .replace(/\n\n/g, "\n</p>\n<p>\n")
    // List items
    .replace(/^- (.+)$/gm, "<li>$1</li>");

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>\n$1</ul>\n");

  // Wrap remaining loose text in <p>
  const lines = html.split("\n");
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^<(h[1-6]|ul|li|hr|p|\/p|\/ul)/.test(trimmed)) {
      result.push(trimmed);
    } else {
      result.push(`<p>${trimmed}</p>`);
    }
  }

  // Clean up double <p> wrapping
  return result.join("\n")
    .replace(/<p><p>/g, "<p>")
    .replace(/<\/p><\/p>/g, "</p>")
    .replace(/<p><h/g, "<h")
    .replace(/<\/h([1-6])><\/p>/g, "</h$1>")
    .replace(/<p><ul>/g, "<ul>")
    .replace(/<\/ul><\/p>/g, "</ul>")
    .replace(/<p><hr><\/p>/g, "<hr>")
    .replace(/<p><hr>/g, "<hr>")
    .replace(/<p>\s*<\/p>/g, "");
}

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

const EJEMPLOS_FALLBACK = [
  { tema: "Tendencias en pavimentos exteriores para 2026", categoria: "Espacios exteriores", keywords: "pavimento exterior, antideslizante, porcelánico, terraza" },
  { tema: "Cómo elegir el mejor adhesivo para cerámica", categoria: "Consejos", keywords: "adhesivo cerámica, colas, colocación azulejos" },
  { tema: "Cocinas de diseño nórdico: materiales y acabados", categoria: "Cocinas", keywords: "cocina nórdica, madera, blanco, encimera" },
];

// ─── Themes ─────────────────────────────────────────────────────────────────

const LIGHT = {
  red: "#E31E24", redDark: "#B71C1C", redLight: "#FEF2F2", redBorder: "#FECACA",
  dark: "#1A1A1A", mid: "#4A4A4A", light: "#F8F8F8",
  border: "#E5E5E5", white: "#FFFFFF", muted: "#999999",
  green: "#059669", greenLight: "#ECFDF5", greenBorder: "#A7F3D0",
  orange: "#D97706", orangeLight: "#FFFBEB",
  blue: "#2563EB", blueLight: "#EFF6FF", blueBorder: "#BFDBFE",
  panelHeader: "#2D2D2D", panelHeaderText: "#FFFFFF",
  bg: "#F3F3F3", cardBg: "#FFFFFF", inputBg: "#FFFFFF", inputBorder: "#E5E5E5",
};

const DARK_THEME = {
  red: "#EF4444", redDark: "#DC2626", redLight: "#1C1517", redBorder: "#7F1D1D",
  dark: "#F1F1F1", mid: "#CCCCCC", light: "#1E1E1E",
  border: "#333333", white: "#171717", muted: "#777777",
  green: "#34D399", greenLight: "#0D1F17", greenBorder: "#065F46",
  orange: "#FBBF24", orangeLight: "#1C1A0E",
  blue: "#60A5FA", blueLight: "#0F172A", blueBorder: "#1E3A5F",
  panelHeader: "#111111", panelHeaderText: "#F1F1F1",
  bg: "#0F0F0F", cardBg: "#171717", inputBg: "#1E1E1E", inputBorder: "#333333",
};

// ─── Title generator ────────────────────────────────────────────────────────

const TITLE_PATTERNS = {
  guia: ["Guía completa de {kw}: tipos, usos y cómo elegir", "{Kw}: guía definitiva para acertar en tu proyecto", "Todo lo que necesitas saber sobre {kw}", "{Kw}: la guía que todo profesional debería leer"],
  comparativa: ["{Kw}: ventajas, inconvenientes y alternativas", "{Kw} vs las alternativas más populares del mercado", "Comparativa de {kw}: ¿cuál es la mejor opción?", "{Kw}: diferencias clave que debes conocer antes de decidir"],
  tips: ["Los 7 errores más comunes al elegir {kw}", "Cómo elegir {kw} sin equivocarte: consejos de experto", "5 claves para acertar con {kw} en tu reforma", "{Kw}: lo que nadie te cuenta antes de comprar"],
  tendencias: ["Tendencias en {kw} para 2026: lo que viene este año", "{Kw}: las novedades que están marcando tendencia", "Así se usa {kw} en los proyectos más actuales", "{Kw} en 2026: ideas que inspiran"],
  tutorial: ["Cómo instalar {kw} paso a paso", "{Kw}: instalación, mantenimiento y consejos prácticos", "Cómo trabajar con {kw}: guía práctica", "{Kw}: todo sobre su colocación y cuidado"],
  inspiracion: ["10 ideas con {kw} que transformarán tu espacio", "{Kw}: inspiración para tu próximo proyecto", "Proyectos reales con {kw} que querrás copiar", "Cómo usar {kw} para renovar cualquier estancia"],
};

function generateArticleTitle(keyword, source) {
  const kw = keyword.toLowerCase();
  const Kw = kw.charAt(0).toUpperCase() + kw.slice(1);
  const groups = source === "nuevo" ? ["guia", "tutorial", "tips"] : source === "quickwin" ? ["tendencias", "inspiracion", "comparativa"] : ["guia", "comparativa", "tips", "tendencias", "tutorial", "inspiracion"];
  const group = groups[Math.floor(Math.random() * groups.length)];
  const patterns = TITLE_PATTERNS[group];
  return patterns[Math.floor(Math.random() * patterns.length)].replace(/\{kw\}/g, kw).replace(/\{Kw\}/g, Kw);
}

function generateExamplesFromGSC(gscData) {
  if (!gscData) return EJEMPLOS_FALLBACK;
  const pool = [];
  (gscData.oportunidades || []).forEach((item) => pool.push({ keywords: item.query, categoria: item.categoria || "", source: "oportunidad", impresiones: item.impresiones }));
  (gscData.nuevosTemasGSC || []).forEach((item) => pool.push({ keywords: item.query, categoria: item.categoria || "", source: "nuevo", impresiones: item.impresiones }));
  (gscData.quickWins || []).forEach((item) => pool.push({ keywords: item.query, categoria: item.categoria || "", source: "quickwin", impresiones: item.impresiones }));
  if (pool.length < 3) return EJEMPLOS_FALLBACK;
  const pick = (arr, count) => {
    const result = [], remaining = [...arr];
    for (let i = 0; i < count && remaining.length > 0; i++) {
      const tw = remaining.reduce((s, x) => s + (x.impresiones || 100), 0);
      let r = Math.random() * tw, idx = 0;
      for (let j = 0; j < remaining.length; j++) { r -= remaining[j].impresiones || 100; if (r <= 0) { idx = j; break; } }
      result.push(remaining.splice(idx, 1)[0]);
    }
    return result;
  };
  return pick(pool, 3).map((item) => ({ tema: generateArticleTitle(item.keywords, item.source), categoria: item.categoria, keywords: item.keywords, source: item.source, impresiones: item.impresiones }));
}

// ─── Small components ───────────────────────────────────────────────────────

function ThemeToggle({ isDark, onToggle }) {
  return (
    <button onClick={onToggle} title={isDark ? "Modo claro" : "Modo oscuro"} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: isDark ? "#374151" : "#E5E7EB", position: "relative", transition: "background 0.25s ease", flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", position: "absolute", top: 3, left: isDark ? 23 : 3, transition: "left 0.25s ease", background: isDark ? "#F59E0B" : "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem" }}>{isDark ? "☀" : "🌙"}</div>
    </button>
  );
}

function MarkdownRenderer({ content, C }) {
  const parseInline = (text) => text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="https://ferrolan.es$2" style="color:${C.red};text-decoration:underline;font-weight:600" target="_blank">$1</a>`);
  const lines = content.split("\n"); const elements = []; let listItems = []; let key = 0;
  const flushList = () => { if (listItems.length > 0) { elements.push(<ul key={`ul-${key++}`} style={{ margin: "0.8em 0 1.2em 1.6em", padding: 0 }}>{listItems.map((item, i) => (<li key={i} style={{ marginBottom: "0.5em", lineHeight: 1.75, color: C.mid, fontSize: "1.02rem" }} dangerouslySetInnerHTML={{ __html: item }} />))}</ul>); listItems = []; } };
  lines.forEach((line, i) => {
    if (line.startsWith("# ")) { flushList(); elements.push(<h1 key={i} style={{ fontSize: "1.7rem", fontWeight: 700, color: C.dark, fontFamily: "'Oswald', sans-serif", lineHeight: 1.2, margin: "0 0 1.2rem", borderLeft: `4px solid ${C.red}`, paddingLeft: "1rem" }}>{line.slice(2)}</h1>); }
    else if (line.startsWith("## ")) { flushList(); elements.push(<h2 key={i} style={{ fontSize: "1.2rem", fontWeight: 700, color: C.dark, fontFamily: "'Oswald', sans-serif", margin: "2em 0 0.7em", textTransform: "uppercase", letterSpacing: "0.04em" }}><span style={{ color: C.red, marginRight: "0.5rem" }}>▸</span>{line.slice(3)}</h2>); }
    else if (line.startsWith("### ")) { flushList(); elements.push(<h3 key={i} style={{ fontSize: "1rem", fontWeight: 700, color: C.mid, margin: "1.2em 0 0.4em", textTransform: "uppercase", letterSpacing: "0.05em" }}>{line.slice(4)}</h3>); }
    else if (line.startsWith("- ")) { listItems.push(parseInline(line.slice(2))); }
    else if (line === "---") { flushList(); elements.push(<hr key={i} style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "2.2em 0" }} />); }
    else if (line.trim() === "") { flushList(); elements.push(<div key={i} style={{ height: "0.5em" }} />); }
    else { flushList(); elements.push(<p key={i} style={{ lineHeight: 1.8, color: C.mid, margin: "0 0 0.85em", fontSize: "1.02rem" }} dangerouslySetInnerHTML={{ __html: parseInline(line) }} />); }
  });
  flushList(); return <div>{elements}</div>;
}

// ─── Image Palette (draggable thumbnails) ───────────────────────────────────
function ImagePalette({ imagenes, loadingImages, onGenerate, hasArticle, onDragStart, C }) {
  if (!hasArticle) return null;

  const TIPO_LABELS = { ambiente: "Ambiente", detalle: "Detalle", uso: "Uso real", inspiracion: "Inspiración", adicional: "Extra" };

  return (
    <div style={{ marginTop: "1.25rem", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ background: C.panelHeader, padding: "0.65rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.panelHeaderText} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.82rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Imágenes · arrastra al artículo</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {!loadingImages && imagenes.length === 0 && (
            <button onClick={onGenerate} style={{ background: C.red, color: "#FFF", border: "none", borderRadius: 6, padding: "0.35rem 0.9rem", fontSize: "0.78rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase" }}
              onMouseOver={e => e.currentTarget.style.background = C.redDark}
              onMouseOut={e => e.currentTarget.style.background = C.red}>Generar</button>
          )}
          {imagenes.length > 0 && (
            <button onClick={onGenerate} style={{ background: "rgba(255,255,255,0.08)", color: "#CCC", border: "none", borderRadius: 6, padding: "0.35rem 0.75rem", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}>↺ Regen.</button>
          )}
        </div>
      </div>

      <div style={{ padding: "1rem 1.25rem", maxHeight: "300px", overflowY: "auto" }}>
        {loadingImages && (
          <div style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.75rem" }} />
            <div style={{ color: C.dark, fontWeight: 700, fontFamily: "'Oswald', sans-serif", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Generando 4 imágenes...</div>
            <div style={{ color: C.muted, fontSize: "0.8rem" }}>Claude diseña los prompts · OpenAI las renderiza</div>
          </div>
        )}

        {!loadingImages && imagenes.length === 0 && (
          <div style={{ textAlign: "center", padding: "1.25rem 1rem", color: C.muted, fontSize: "0.88rem", lineHeight: 1.5 }}>
            Genera las imágenes y después <strong style={{ color: C.mid }}>arrástralas</strong> a la posición que quieras dentro del artículo
          </div>
        )}

        {imagenes.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
            {imagenes.map((img, i) => (
              <div key={i}
                draggable
                onDragStart={() => onDragStart(i)}
                style={{ cursor: "grab", userSelect: "none" }}>
                <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `2px solid ${C.border}`, transition: "border-color 0.15s" }}
                  onMouseOver={e => e.currentTarget.style.borderColor = C.red}
                  onMouseOut={e => e.currentTarget.style.borderColor = C.border}>
                  <img src={img.src} alt={img.descripcion} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.65))", padding: "0.4rem 0.35rem 0.3rem", fontSize: "0.6rem", color: "#FFF", fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {TIPO_LABELS[img.tipo] || `Img ${i + 1}`}
                  </div>
                  <div style={{ position: "absolute", top: "0.3rem", right: "0.3rem", background: "rgba(0,0,0,0.5)", color: "#FFF", borderRadius: 4, padding: "0.1rem 0.3rem", fontSize: "0.6rem", fontWeight: 700 }}>
                    ⠿
                  </div>
                </div>
                <a href={img.src} download={`ferrolan-img-${i + 1}.png`}
                  style={{ display: "block", textAlign: "center", marginTop: "0.3rem", fontSize: "0.65rem", color: C.muted, textDecoration: "none", fontWeight: 600 }}
                  onClick={e => e.stopPropagation()}>↓ DL</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Droppable Article (render markdown blocks with drop zones between them) ─
function DroppableArticle({ articulo, imagenes, onInsertImage, C }) {
  const [dropHighlight, setDropHighlight] = useState(null);

  // Split markdown into sections on ## headings
  function splitBlocks(text) {
    const lines = text.split("\n");
    const blocks = [];
    let current = [];
    for (const line of lines) {
      if (line.startsWith("## ") && current.length > 0) {
        blocks.push(current.join("\n"));
        current = [line];
      } else {
        current.push(line);
      }
    }
    if (current.length > 0) blocks.push(current.join("\n"));
    return blocks.filter(b => b.trim());
  }

  const blocks = splitBlocks(articulo);

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    setDropHighlight(idx);
  };
  const handleDragLeave = () => setDropHighlight(null);
  const handleDrop = (e, afterBlockIdx) => {
    e.preventDefault();
    setDropHighlight(null);
    onInsertImage(afterBlockIdx);
  };

  return (
    <div>
      {blocks.map((block, i) => (
        <div key={i}>
          <BlockRenderer block={block} C={C} />
          {/* Drop zone after each block */}
          <div
            onDragOver={e => handleDragOver(e, i)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, i)}
            style={{
              height: dropHighlight === i ? "56px" : "12px",
              margin: "0 0 0",
              borderRadius: 8,
              border: dropHighlight === i ? `2px dashed ${C.blue}` : "2px dashed transparent",
              background: dropHighlight === i ? C.blueLight : "transparent",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}>
            {dropHighlight === i && (
              <span style={{ fontSize: "0.8rem", color: C.blue, fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", pointerEvents: "none" }}>
                ⊕ Insertar imagen aquí
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Block renderer (renders a single markdown block including inline images) ─
function BlockRenderer({ block, C }) {
  const parseInline = (text) =>
    text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="https://ferrolan.es$2" style="color:${C.red};text-decoration:underline;font-weight:600" target="_blank">$1</a>`);

  const lines = block.split("\n");
  const elements = [];
  let listItems = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={`ul-${key++}`} style={{ margin: "0.8em 0 1.2em 1.6em", padding: 0 }}>{listItems.map((item, i) => (<li key={i} style={{ marginBottom: "0.5em", lineHeight: 1.75, color: C.mid, fontSize: "1.02rem" }} dangerouslySetInnerHTML={{ __html: item }} />))}</ul>);
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    // Inline image from drag & drop: ![desc](src)
    const imgMatch = line.match(/^!\[([^\]]*)\]\((.+)\)$/);
    if (imgMatch) {
      flushList();
      elements.push(
        <div key={`img-${i}`} style={{ margin: "1.5rem 0", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
          <img src={imgMatch[2]} alt={imgMatch[1]} style={{ width: "100%", display: "block", maxHeight: "420px", objectFit: "cover" }} />
          {imgMatch[1] && <div style={{ padding: "0.5rem 0.85rem", fontSize: "0.82rem", color: C.muted, fontStyle: "italic", background: C.light }}>{imgMatch[1]}</div>}
        </div>
      );
    } else if (line.startsWith("# ")) { flushList(); elements.push(<h1 key={i} style={{ fontSize: "1.7rem", fontWeight: 700, color: C.dark, fontFamily: "'Oswald', sans-serif", lineHeight: 1.2, margin: "0 0 1.2rem", borderLeft: `4px solid ${C.red}`, paddingLeft: "1rem" }}>{line.slice(2)}</h1>); }
    else if (line.startsWith("## ")) { flushList(); elements.push(<h2 key={i} style={{ fontSize: "1.2rem", fontWeight: 700, color: C.dark, fontFamily: "'Oswald', sans-serif", margin: "2em 0 0.7em", textTransform: "uppercase", letterSpacing: "0.04em" }}><span style={{ color: C.red, marginRight: "0.5rem" }}>▸</span>{line.slice(3)}</h2>); }
    else if (line.startsWith("### ")) { flushList(); elements.push(<h3 key={i} style={{ fontSize: "1rem", fontWeight: 700, color: C.mid, margin: "1.2em 0 0.4em", textTransform: "uppercase", letterSpacing: "0.05em" }}>{line.slice(4)}</h3>); }
    else if (line.startsWith("- ")) { listItems.push(parseInline(line.slice(2))); }
    else if (line === "---") { flushList(); elements.push(<hr key={i} style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "2.2em 0" }} />); }
    else if (line.trim() === "") { flushList(); elements.push(<div key={i} style={{ height: "0.5em" }} />); }
    else { flushList(); elements.push(<p key={i} style={{ lineHeight: 1.8, color: C.mid, margin: "0 0 0.85em", fontSize: "1.02rem" }} dangerouslySetInnerHTML={{ __html: parseInline(line) }} />); }
  });

  flushList();
  return <div>{elements}</div>;
}

// ─── Opportunities Panel (GSC + Prestashop unified) ─────────────────────────

function OpportunitiesPanel({ gscData, gscLoading, gscError, onRefreshGSC, kwData, kwLoading, onRefreshKW, onSelectTopic, C }) {
  const [tab, setTab] = useState("oportunidades");

  const formatNum = (n) => n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n);
  const posColor = (pos) => pos <= 3 ? C.green : pos <= 7 ? C.orange : C.red;
  const prioColor = (p) => p === "alta" ? C.red : p === "media" ? C.orange : C.muted;
  const prioLabel = (p) => p === "alta" ? "▲ Alta" : p === "media" ? "● Media" : "○ Baja";

  const handleClickGSC = (item) => onSelectTopic({ tema: item.sugerencia || item.query, categoria: item.categoria || "", keywords: item.query });
  const handleClickPS = (item) => onSelectTopic({ tema: item.titulo_sugerido || `Guía completa de ${item.keyword}`, categoria: "", keywords: item.keyword });

  const TABS = [
    { key: "oportunidades", label: "Oportunidades GSC", desc: "Alto volumen, posición mejorable. Clic para generar artículo." },
    { key: "quickwins",     label: "Quick Wins GSC",    desc: "Ya bien posicionados — mantener y reforzar." },
    { key: "sinCubrir",     label: "Sin cubrir (PS)",   desc: "Productos del catálogo sin artículo en el blog. Clic para generar." },
    { key: "sugeridas",     label: "Sugeridas (PS)",    desc: "Keywords long-tail generadas por IA cruzando catálogo y tendencias." },
    { key: "articulos",     label: "Artículos a revisar", desc: "Artículos con más impresiones. Revisar periódicamente." },
  ];

  const currentTab = TABS.find(t => t.key === tab);

  const KWCardGSC = ({ item, bg, borderColor, hoverShadow, badge, badgeColor, badgeBg, extra }) => (
    <button onClick={() => handleClickGSC(item)} style={{ display: "block", width: "100%", textAlign: "left", background: bg, border: `1px solid ${borderColor}`, borderRadius: 10, padding: "0.85rem 1rem", cursor: "pointer", transition: "all 0.15s" }}
      onMouseOver={e => e.currentTarget.style.boxShadow = hoverShadow} onMouseOut={e => e.currentTarget.style.boxShadow = "none"}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: C.dark }}>{item.query}</span>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: badgeColor, background: badgeBg, padding: "0.15rem 0.5rem", borderRadius: 6, whiteSpace: "nowrap" }}>{badge}</span>
      </div>
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", background: "rgba(148,163,184,0.12)", padding: "0.18rem 0.55rem", borderRadius: 20, border: "1px solid rgba(148,163,184,0.2)", letterSpacing: "0.02em" }}>{formatNum(item.impresiones)} impr</span>
        {item.clics !== undefined && <span style={{ fontSize: "0.75rem", fontWeight: 700, color: C.green, background: `${C.green}18`, padding: "0.18rem 0.55rem", borderRadius: 20, border: `1px solid ${C.green}30` }}>{item.clics} clics</span>}
        {item.ctr !== undefined && <span style={{ fontSize: "0.75rem", fontWeight: 700, color: C.orange, background: `${C.orange}18`, padding: "0.18rem 0.55rem", borderRadius: 20, border: `1px solid ${C.orange}30` }}>CTR {item.ctr}%</span>}
      </div>
      {extra && <div style={{ fontSize: "0.84rem", marginTop: "0.3rem", lineHeight: 1.4, ...extra.style }}>{extra.text}</div>}
    </button>
  );

  const KWCardPS = ({ item, bg, borderColor, hoverColor }) => (
    <button onClick={() => handleClickPS(item)}
      style={{ display: "block", width: "100%", textAlign: "left", background: bg, border: `1px solid ${borderColor}`, borderRadius: 10, padding: "0.85rem 1rem", cursor: "pointer", transition: "all 0.15s" }}
      onMouseOver={e => e.currentTarget.style.boxShadow = `0 2px 12px ${hoverColor}20`}
      onMouseOut={e => e.currentTarget.style.boxShadow = "none"}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: C.dark }}>{item.keyword}</span>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: prioColor(item.prioridad), background: `${prioColor(item.prioridad)}15`, padding: "0.12rem 0.45rem", borderRadius: 6 }}>{prioLabel(item.prioridad)}</span>
      </div>
      <div style={{ fontSize: "0.8rem", color: C.mid, marginBottom: "0.2rem", lineHeight: 1.35 }}>{item.titulo_sugerido}</div>
      <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: C.muted, alignItems: "center" }}>
        {item.categoria_ps && <span style={{ color: "#7C3AED", fontWeight: 600 }}>{item.categoria_ps}</span>}
        {item.razon && <span>· {item.razon}</span>}
      </div>
    </button>
  );

  return (
    <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* ── Header ── */}
      <div style={{ background: C.panelHeader, padding: "0.75rem 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.panelHeaderText} strokeWidth="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Oportunidades</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {gscData && <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem", borderRadius: 4, background: gscData.live ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.08)", color: gscData.live ? "#34D399" : "#888", fontWeight: 700 }}>{gscData.live ? "● LIVE" : "● GSC"}</span>}
            {kwData?.configured && <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem", borderRadius: 4, background: "rgba(124,58,237,0.2)", color: "#C4B5FD", fontWeight: 700 }}>● PS{kwData.cached ? " cache" : ""}</span>}

          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {gscData?.resumen && [
            ["Clics", formatNum(gscData.resumen.clics)],
            ["Impr.", formatNum(gscData.resumen.impresiones)],
            ["CTR", gscData.resumen.ctr + "%"],
            ["Pos.", gscData.resumen.posicion],
          ].map(([label, value]) => (
            <div key={label} style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "0.5rem 0.3rem", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: C.panelHeaderText, fontFamily: "'Oswald', sans-serif", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: "0.65rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.2rem", fontWeight: 600 }}>{label}</div>
            </div>
          ))}
          {kwData?.resumen && [
            ["Sin cubrir", kwData.resumen.sinCubrir],
            ["Sugeridas", kwData.resumen.sugeridas],
          ].map(([label, value]) => (
            <div key={label} style={{ flex: 1, background: "rgba(124,58,237,0.18)", borderRadius: 8, padding: "0.5rem 0.3rem", textAlign: "center", border: "1px solid rgba(124,58,237,0.25)" }}>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#C4B5FD", fontFamily: "'Oswald', sans-serif", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: "0.65rem", color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.2rem", fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "0.85rem 1rem" }}>

        {/* ── Dropdown selector ── */}
        <div style={{ position: "relative", marginBottom: "0.85rem" }}>
          <select value={tab} onChange={e => setTab(e.target.value)}
            style={{ width: "100%", appearance: "none", background: C.light, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0.55rem 2.2rem 0.55rem 0.85rem", fontSize: "0.85rem", color: C.dark, fontFamily: "'Oswald', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", outline: "none" }}>
            {TABS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted, fontSize: "0.75rem" }}>▾</span>
        </div>

        {currentTab && (
          <p style={{ fontSize: "0.82rem", color: C.muted, marginBottom: "0.75rem", lineHeight: 1.4 }}>{currentTab.desc}</p>
        )}

        {/* ── Loading / error states ── */}
        {(tab === "oportunidades" || tab === "quickwins" || tab === "articulos") && gscLoading && (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <div style={{ width: 30, height: 30, border: `2.5px solid ${C.border}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.75rem" }} />
            <div style={{ fontSize: "0.85rem", color: C.muted }}>Cargando datos GSC...</div>
          </div>
        )}
        {(tab === "oportunidades" || tab === "quickwins" || tab === "articulos") && gscError && !gscLoading && (
          <div style={{ background: C.redLight, borderRadius: 8, padding: "0.75rem", fontSize: "0.85rem", color: C.red }}>⚠ {gscError}</div>
        )}
        {(tab === "sinCubrir" || tab === "sugeridas") && kwLoading && (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <div style={{ width: 30, height: 30, border: `2.5px solid ${C.border}`, borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.75rem" }} />
            <div style={{ fontSize: "0.85rem", color: C.muted }}>Analizando catálogo Prestashop...</div>
          </div>
        )}
        {(tab === "sinCubrir" || tab === "sugeridas") && !kwData && !kwLoading && (
          <div style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
            <div style={{ fontSize: "0.85rem", color: C.muted, lineHeight: 1.6, marginBottom: "1rem" }}>Cruza el catálogo de Prestashop con GSC para detectar oportunidades no cubiertas.</div>
            <button onClick={onRefreshKW}
              style={{ background: "#7C3AED", color: "#FFF", border: "none", borderRadius: 8, padding: "0.6rem 1.4rem", fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}
              onMouseOver={e => e.currentTarget.style.background = "#5B21B6"}
              onMouseOut={e => e.currentTarget.style.background = "#7C3AED"}>
              ⚡ Analizar keywords
            </button>
            <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: "0.6rem" }}>Consume tokens · Resultado cacheado 6h</div>
          </div>
        )}

        {/* ── Tab: Oportunidades GSC ── */}
        {tab === "oportunidades" && gscData && !gscLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {(gscData.oportunidades || []).map((item, i) => (
              <KWCardGSC key={i} item={item} bg={C.cardBg} borderColor={C.border} hoverShadow={`0 2px 12px ${C.red}20`} badge={`pos ${item.posicion}`} badgeColor={posColor(item.posicion)} badgeBg={`${posColor(item.posicion)}18`} extra={item.sugerencia ? { text: `→ ${item.sugerencia}`, style: { color: C.mid, fontStyle: "italic" } } : null} />
            ))}
          </div>
        )}

        {/* ── Tab: Quick Wins GSC ── */}
        {tab === "quickwins" && gscData && !gscLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {(gscData.quickWins || []).map((item, i) => (
              <KWCardGSC key={i} item={{ ...item, sugerencia: item.nota }} bg={C.greenLight} borderColor={C.greenBorder} hoverShadow={`0 2px 12px ${C.green}20`} badge={`✓ pos ${item.posicion}`} badgeColor={C.green} badgeBg={`${C.green}18`} extra={item.nota ? { text: `✦ ${item.nota}`, style: { color: C.green, fontWeight: 600 } } : null} />
            ))}
          </div>
        )}

        {/* ── Tab: Sin cubrir (Prestashop) ── */}
        {tab === "sinCubrir" && kwData?.resumen && !kwLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {(kwData.sinCubrir || []).map((item, i) => <KWCardPS key={i} item={item} bg={C.redLight} borderColor={C.redBorder} hoverColor={C.red} />)}
            {(kwData.sinCubrir || []).length === 0 && <div style={{ fontSize: "0.85rem", color: C.muted, textAlign: "center", padding: "1rem" }}>Todas las categorías del catálogo tienen contenido</div>}
          </div>
        )}

        {/* ── Tab: Sugeridas (Prestashop) ── */}
        {tab === "sugeridas" && kwData?.resumen && !kwLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {(kwData.sugeridas || []).map((item, i) => <KWCardPS key={i} item={item} bg={C.blueLight} borderColor={C.blueBorder} hoverColor={C.blue} />)}
            {(kwData.sugeridas || []).length === 0 && <div style={{ fontSize: "0.85rem", color: C.muted, textAlign: "center", padding: "1rem" }}>No hay sugerencias adicionales</div>}
          </div>
        )}

        {/* ── Tab: Artículos a revisar (GSC) ── */}
        {tab === "articulos" && gscData && !gscLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {(gscData.articulosActualizar || []).map((item, i) => (
              <div key={i} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.85rem 1rem" }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.dark, marginBottom: "0.3rem", lineHeight: 1.35 }}>{item.pagina}</div>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94A3B8", background: "rgba(148,163,184,0.12)", padding: "0.18rem 0.55rem", borderRadius: 20, border: "1px solid rgba(148,163,184,0.2)" }}>{formatNum(item.impresiones)} impr</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: C.green, background: `${C.green}18`, padding: "0.18rem 0.55rem", borderRadius: 20, border: `1px solid ${C.green}30` }}>{formatNum(item.clics)} clics</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: posColor(item.posicion), background: `${posColor(item.posicion)}18`, padding: "0.18rem 0.55rem", borderRadius: 20, border: `1px solid ${posColor(item.posicion)}30` }}>pos {item.posicion}</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: C.orange, background: `${C.orange}18`, padding: "0.18rem 0.55rem", borderRadius: 20, border: `1px solid ${C.orange}30` }}>CTR {item.ctr}%</span>
                </div>
                {item.url && <a href={`https://ferrolan.es${item.url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.82rem", color: C.red, textDecoration: "none", marginTop: "0.3rem", display: "inline-block", fontWeight: 600 }}>Ver artículo →</a>}
              </div>
            ))}
          </div>
        )}

        {/* ── GSC static notice ── */}
        {gscData && !gscData.live && (tab === "oportunidades" || tab === "quickwins" || tab === "articulos") && (
          <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.75rem", background: C.orangeLight, border: `1px solid ${C.orange}30`, borderRadius: 8, fontSize: "0.78rem", color: C.orange, lineHeight: 1.4 }}>
            ⓘ Datos del último análisis manual. Configura credenciales de Google para datos en vivo.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Evergreen Pilars Panel ──────────────────────────────────────────────────

function EvergreenPanel({ data, loading, onRefresh, onSelectTopic, C }) {
  const [expanded, setExpanded] = useState(true);
  const [showGaps, setShowGaps] = useState(false);

  if (loading) {
    return (
      <div style={{ marginTop: "1rem", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ background: C.panelHeader, padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1rem" }}>🌿</span>
          <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pilares Evergreen</span>
        </div>
        <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <div style={{ width: 30, height: 30, border: `2.5px solid ${C.border}`, borderTopColor: "#34D399", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.75rem" }} />
          <div style={{ fontSize: "0.85rem", color: C.muted }}>Analizando pilares...</div>
        </div>
      </div>
    );
  }

  if (!data || (data.pilares?.length === 0 && data.gaps?.length === 0)) {
    return (
      <div style={{ marginTop: "1rem", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ background: C.panelHeader, padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1rem" }}>🌿</span>
          <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pilares Evergreen</span>
        </div>
        <div style={{ padding: "1.5rem 1.25rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.88rem", color: C.muted, lineHeight: 1.6, marginBottom: "0.75rem" }}>
            Publica artículos para que aparezcan tus pilares evergreen aquí.
          </div>
          {data?.gaps?.length === 0 && (
            <div style={{ fontSize: "0.78rem", color: C.green, fontWeight: 600 }}>✓ Todos los temas clave están cubiertos</div>
          )}
        </div>
      </div>
    );
  }

  const edadLabel = (dias) => {
    if (dias < 30) return `${dias}d`;
    if (dias < 365) return `${Math.floor(dias / 30)}m`;
    return `${(dias / 365).toFixed(1)}a`;
  };

  const impactBar = (score) => (
    <div style={{ width: 48, height: 5, background: `${C.border}`, borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
      <div style={{ height: "100%", width: `${score}%`, background: score >= 80 ? C.green : score >= 60 ? C.orange : C.muted, borderRadius: 3, transition: "width 0.3s" }} />
    </div>
  );

  return (
    <div style={{ marginTop: "1rem", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: C.panelHeader, padding: "0.75rem 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1rem" }}>🌿</span>
            <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pilares Evergreen</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <button onClick={onRefresh} title="Actualizar análisis"
              style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 5, width: 26, height: 26, fontSize: "0.75rem", cursor: "pointer", color: "#aaa", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseOver={e => e.currentTarget.style.color = "#34D399"}
              onMouseOut={e => e.currentTarget.style.color = "#aaa"}>↺</button>
            <button onClick={() => setExpanded(!expanded)}
              style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: "0.85rem", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {[
            ["Artículos", data.totalArticulos || 0],
            ["Evergreen", data.totalEvergreen || 0],
            ["Gaps", data.gaps?.length || 0],
          ].map(([label, value]) => (
            <div key={label} style={{ flex: 1, background: "rgba(52,211,153,0.12)", borderRadius: 8, padding: "0.45rem 0.3rem", textAlign: "center", border: "1px solid rgba(52,211,153,0.2)" }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#34D399", fontFamily: "'Oswald', sans-serif", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: "0.6rem", color: "#6EE7B7", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.15rem", fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: "0.85rem 1rem" }}>

          {/* Tab toggle: Pilares / Gaps */}
          <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.75rem" }}>
            {[
              ["pilares", `Pilares (${data.pilares?.length || 0})`],
              ["gaps", `Gaps (${data.gaps?.length || 0})`],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setShowGaps(key === "gaps")}
                style={{
                  flex: 1, padding: "0.4rem 0.5rem", borderRadius: 7, border: "none",
                  background: (key === "gaps" ? showGaps : !showGaps) ? "rgba(52,211,153,0.15)" : C.light,
                  color: (key === "gaps" ? showGaps : !showGaps) ? "#34D399" : C.muted,
                  fontSize: "0.78rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Pilares list ── */}
          {!showGaps && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {(data.pilares || []).map((pilar, i) => (
                <div key={pilar.id || i}
                  style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.75rem 0.9rem", transition: "border-color 0.15s" }}
                  onMouseOver={e => e.currentTarget.style.borderColor = "#34D399"}
                  onMouseOut={e => e.currentTarget.style.borderColor = C.border}>
                  {/* Title row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: C.dark, lineHeight: 1.35, flex: 1 }}>{pilar.titulo || pilar.tema}</div>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#34D399", background: "rgba(52,211,153,0.12)", padding: "0.12rem 0.45rem", borderRadius: 6, whiteSpace: "nowrap", border: "1px solid rgba(52,211,153,0.25)" }}>
                      {edadLabel(pilar.edad)}
                    </span>
                  </div>
                  {/* Metrics row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    {pilar.categoria && (
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: C.red, background: `${C.red}12`, padding: "0.1rem 0.4rem", borderRadius: 4 }}>{pilar.categoria}</span>
                    )}
                    <span style={{ fontSize: "0.7rem", color: C.muted }}>{pilar.fecha}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: "0.65rem", color: C.muted, fontWeight: 600, marginRight: "0.25rem" }}>Impacto</span>
                    {impactBar(pilar.impactoEstimado)}
                  </div>
                  {/* Action: Refresh this article */}
                  <button
                    onClick={() => onSelectTopic({
                      tema: `Actualizar y mejorar: ${pilar.titulo || pilar.tema}`,
                      categoria: pilar.categoria || "",
                      keywords: pilar.slug ? pilar.slug.replace(/-/g, ", ") : "",
                    })}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "0.3rem 0.65rem", fontSize: "0.72rem", cursor: "pointer", color: C.muted, fontWeight: 600, fontFamily: "inherit", marginTop: "0.15rem" }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = "#34D399"; e.currentTarget.style.color = "#34D399"; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
                    ↺ Refrescar contenido
                  </button>
                </div>
              ))}
              {(data.pilares || []).length === 0 && (
                <div style={{ textAlign: "center", padding: "1rem", fontSize: "0.85rem", color: C.muted }}>
                  Aún no hay artículos con suficiente antigüedad para ser pilares.
                </div>
              )}
            </div>
          )}

          {/* ── Gaps list ── */}
          {showGaps && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <p style={{ fontSize: "0.8rem", color: C.muted, marginBottom: "0.3rem", lineHeight: 1.4 }}>
                Temas evergreen que tu blog aún no cubre. Clic para generar artículo.
              </p>
              {(data.gaps || []).map((gap, i) => (
                <button key={i}
                  onClick={() => onSelectTopic({ tema: gap, categoria: "", keywords: gap.toLowerCase() })}
                  style={{ display: "block", width: "100%", textAlign: "left", background: C.greenLight, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "0.7rem 0.9rem", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseOver={e => e.currentTarget.style.boxShadow = `0 2px 12px rgba(52,211,153,0.2)`}
                  onMouseOut={e => e.currentTarget.style.boxShadow = "none"}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: C.dark, lineHeight: 1.35 }}>{gap}</div>
                      <div style={{ fontSize: "0.72rem", color: C.green, fontWeight: 600, marginTop: "0.2rem" }}>
                        Tema evergreen sin cubrir · Clic para crear
                      </div>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: C.green, fontWeight: 800, flexShrink: 0, marginLeft: "0.5rem" }}>+</span>
                  </div>
                </button>
              ))}
              {(data.gaps || []).length === 0 && (
                <div style={{ textAlign: "center", padding: "1rem" }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🎉</div>
                  <div style={{ fontSize: "0.88rem", color: C.green, fontWeight: 700 }}>¡Todos los temas clave están cubiertos!</div>
                  <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: "0.25rem" }}>Tu blog tiene buena cobertura evergreen</div>
                </div>
              )}
            </div>
          )}

          {/* Topics covered summary */}
          {data.topicsCovered?.length > 0 && (
            <div style={{ marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.3rem" }}>Categorías cubiertas</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
                {data.topicsCovered.map((topic, i) => (
                  <span key={i} style={{ fontSize: "0.7rem", background: C.light, border: `1px solid ${C.border}`, borderRadius: 5, padding: "0.12rem 0.45rem", color: C.mid, fontWeight: 500 }}>{topic}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Saved Articles Panel ───────────────────────────────────────────────────

function SavedArticlesPanel({ articles, onRefresh, C }) {
  const [expanded, setExpanded] = useState(false);

  if (articles.length === 0) return null;

  return (
    <div style={{ marginTop: "1rem", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <button onClick={() => setExpanded(!expanded)}
        style={{ width: "100%", background: C.panelHeader, padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", border: "none", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.panelHeaderText} strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Artículos publicados</span>
          <span style={{ background: C.red, color: "#FFF", fontSize: "0.7rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 10, marginLeft: "0.25rem" }}>{articles.length}</span>
        </div>
        <span style={{ color: "#AAA", fontSize: "0.85rem", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>
      {expanded && (
        <div style={{ padding: "1rem 1.25rem", maxHeight: "300px", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {articles.map((a, i) => (
              <div key={a.id || i} style={{ background: C.light, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0.7rem 0.85rem" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: C.dark, lineHeight: 1.35, marginBottom: "0.2rem" }}>{a.titulo || a.tema}</div>
                <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: C.muted, flexWrap: "wrap", alignItems: "center" }}>
                  <span>{a.fecha}</span>
                  {a.categoria && <span style={{ background: `${C.red}12`, color: C.red, padding: "0.05rem 0.35rem", borderRadius: 4, fontWeight: 600 }}>{a.categoria}</span>}
                  {a.slug && <span style={{ color: C.blue, fontWeight: 500 }}>/{a.slug}</span>}
                </div>
                {a.tags && a.tags.length > 0 && (
                  <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
                    {a.tags.map((tag, j) => <span key={j} style={{ fontSize: "0.65rem", background: C.light, border: `1px solid ${C.border}`, padding: "0.05rem 0.3rem", borderRadius: 4, color: C.muted }}>{tag}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: "0.65rem", fontSize: "0.78rem", color: C.muted, textAlign: "center", lineHeight: 1.4 }}>
            Claude consulta este historial antes de generar nuevos artículos para no repetir temas
          </div>
        </div>
      )}
    </div>
  );
}


// ─── SEO Analysis Panel ──────────────────────────────────────────────────────

function SEOPanel({ articulo, tema, keywords, C }) {
  const [seoData, setSeoData] = useState(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoError, setSeoError] = useState("");
  const [metaData, setMetaData] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState("");
  const [copiedMeta, setCopiedMeta] = useState(null);
  const [tab, setTab] = useState("seo");

  const analizarSEO = async () => {
    setSeoLoading(true);
    setSeoError("");
    try {
      const res = await fetch("/api/seo-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articulo, tema, keywords }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en el análisis SEO");
      setSeoData(data);
    } catch (e) {
      setSeoError(e.message);
    } finally {
      setSeoLoading(false);
    }
  };

  const generarMetas = async () => {
    setMetaLoading(true);
    setMetaError("");
    try {
      const res = await fetch("/api/meta-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articulo, tema, keywords }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error generando metas");
      setMetaData(data);
    } catch (e) {
      setMetaError(e.message);
    } finally {
      setMetaLoading(false);
    }
  };

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedMeta(id);
    setTimeout(() => setCopiedMeta(null), 1800);
  };

  const scoreColor = (score) => score >= 80 ? C.green : score >= 60 ? C.orange : C.red;
  const issueColor = (type) => type === "error" ? C.red : type === "warning" ? C.orange : C.blue;
  const issueBg = (type) => type === "error" ? C.redLight : type === "warning" ? C.orangeLight : C.blueLight;
  const enfoqueBadge = { curiosidad: C.blue, beneficio: C.green, problema: C.orange, autoridad: C.red };

  const tabStyle = (t) => ({
    padding: "0.4rem 0.9rem", borderRadius: 6, border: "none",
    background: tab === t ? C.red : "transparent",
    color: tab === t ? "#FFF" : "#AAA",
    fontSize: "0.78rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif",
    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", flex: 1,
  });

  return (
    <div style={{ marginTop: "0.75rem", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", transition: "background 0.3s" }}>
      <div style={{ background: C.panelHeader, padding: "0.65rem 1.1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          ✦ Análisis SEO
        </span>
        <div style={{ display: "flex", gap: "0.2rem" }}>
          {[["seo", "SEO"], ["meta", "Metas"]].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)} style={tabStyle(val)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0.85rem 1rem" }}>
        {/* ── SEO TAB ── */}
        {tab === "seo" && (
          <>
            {!seoData && !seoLoading && (
              <button onClick={analizarSEO}
                style={{ width: "100%", background: C.redLight, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: "0.7rem", fontSize: "0.88rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                onMouseOver={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = "#FFF"; }}
                onMouseOut={e => { e.currentTarget.style.background = C.redLight; e.currentTarget.style.color = C.red; }}>
                🔎 Analizar SEO
              </button>
            )}

            {seoLoading && (
              <div style={{ textAlign: "center", padding: "1rem" }}>
                <div style={{ width: 28, height: 28, border: `3px solid ${C.border}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.5rem" }} />
                <div style={{ fontSize: "0.82rem", color: C.muted }}>Analizando artículo...</div>
              </div>
            )}

            {seoError && (
              <div style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: "0.5rem 0.75rem", color: C.red, fontSize: "0.82rem", fontWeight: 600 }}>⚠ {seoError}</div>
            )}

            {seoData && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {/* Score */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: C.light, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.75rem 1rem" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${scoreColor(seoData.score)}20`, border: `3px solid ${scoreColor(seoData.score)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: "1.1rem", fontWeight: 800, color: scoreColor(seoData.score), fontFamily: "'Oswald', sans-serif" }}>{seoData.score}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: scoreColor(seoData.score), fontFamily: "'Oswald', sans-serif" }}>{seoData.scoreLabel}</div>
                    <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.1rem" }}>
                      {seoData.wordCount} palabras · Densidad KW: {seoData.keywordDensity}
                    </div>
                  </div>
                </div>

                {/* Heading structure */}
                {seoData.headingStructure && (
                  <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.3rem" }}>Estructura</div>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {[["H1", seoData.headingStructure.h1Count], ["H2", seoData.headingStructure.h2Count], ["H3", seoData.headingStructure.h3Count]].map(([tag, count]) => (
                        <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "0.15rem 0.5rem", fontSize: "0.78rem", color: C.mid, fontWeight: 600 }}>
                          <span style={{ color: count === 1 && tag === "H1" ? C.green : count === 0 && tag === "H1" ? C.red : C.mid }}>{tag}</span>
                          <span>{count}</span>
                        </span>
                      ))}
                      {seoData.suggestedSlug && (
                        <span style={{ display: "inline-block", background: C.blueLight, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: "0.15rem 0.5rem", fontSize: "0.72rem", color: C.blue, fontFamily: "monospace" }}>
                          /{seoData.suggestedSlug}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Strengths */}
                {seoData.strengths?.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.3rem" }}>Puntos fuertes</div>
                    <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                      {seoData.strengths.map((s, i) => <li key={i} style={{ fontSize: "0.82rem", color: C.green, lineHeight: 1.4 }}>{s}</li>)}
                    </ul>
                  </div>
                )}

                {/* Issues */}
                {seoData.issues?.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.3rem" }}>Problemas detectados</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      {seoData.issues.map((issue, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", background: issueBg(issue.type), border: `1px solid ${issueColor(issue.type)}30`, borderRadius: 7, padding: "0.4rem 0.6rem" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: issueColor(issue.type), flexShrink: 0, marginTop: "0.05rem" }}>
                            {issue.type === "error" ? "✖" : issue.type === "warning" ? "⚠" : "ℹ"}
                          </span>
                          <span style={{ fontSize: "0.8rem", color: C.dark, lineHeight: 1.4 }}>{issue.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick fixes */}
                {seoData.quickFixes?.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.3rem" }}>Fixes rápidos</div>
                    <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                      {seoData.quickFixes.map((f, i) => <li key={i} style={{ fontSize: "0.82rem", color: C.mid, lineHeight: 1.4 }}>{f}</li>)}
                    </ul>
                  </div>
                )}

                <button onClick={analizarSEO} style={{ alignSelf: "flex-end", background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, fontFamily: "inherit" }}>↺ Re-analizar</button>
              </div>
            )}
          </>
        )}

        {/* ── META TAB ── */}
        {tab === "meta" && (
          <>
            {!metaData && !metaLoading && (
              <button onClick={generarMetas}
                style={{ width: "100%", background: C.blueLight, color: C.blue, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: "0.7rem", fontSize: "0.88rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                onMouseOver={e => { e.currentTarget.style.background = C.blue; e.currentTarget.style.color = "#FFF"; }}
                onMouseOut={e => { e.currentTarget.style.background = C.blueLight; e.currentTarget.style.color = C.blue; }}>
                ✎ Generar meta títulos
              </button>
            )}

            {metaLoading && (
              <div style={{ textAlign: "center", padding: "1rem" }}>
                <div style={{ width: 28, height: 28, border: `3px solid ${C.border}`, borderTopColor: C.blue, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.5rem" }} />
                <div style={{ fontSize: "0.82rem", color: C.muted }}>Generando opciones de meta...</div>
              </div>
            )}

            {metaError && (
              <div style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: "0.5rem 0.75rem", color: C.red, fontSize: "0.82rem", fontWeight: 600 }}>⚠ {metaError}</div>
            )}

            {metaData?.options && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {metaData.options.map((opt, i) => (
                  <div key={i} style={{ background: C.light, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.75rem 0.9rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: enfoqueBadge[opt.enfoque] || C.muted, background: `${enfoqueBadge[opt.enfoque] || C.muted}15`, padding: "0.1rem 0.4rem", borderRadius: 4 }}>
                        {opt.enfoque}
                      </span>
                      {opt.nota && <span style={{ fontSize: "0.7rem", color: C.muted, fontStyle: "italic", maxWidth: "60%", textAlign: "right", lineHeight: 1.3 }}>{opt.nota}</span>}
                    </div>

                    {/* Meta título */}
                    <div style={{ marginBottom: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>Meta título</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span style={{ fontSize: "0.68rem", color: opt.tituloChars > 60 ? C.red : opt.tituloChars >= 50 ? C.green : C.orange, fontWeight: 700 }}>
                            {opt.tituloChars || opt.titulo?.length} car
                          </span>
                          <button onClick={() => copyText(opt.titulo, `t${i}`)} style={{ background: "none", border: "none", cursor: "pointer", color: copiedMeta === `t${i}` ? C.green : C.muted, fontSize: "0.75rem", padding: 0 }}>
                            {copiedMeta === `t${i}` ? "✓" : "⎘"}
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: C.dark, lineHeight: 1.4, wordBreak: "break-word" }}>{opt.titulo}</div>
                    </div>

                    {/* Meta descripción */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>Meta descripción</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span style={{ fontSize: "0.68rem", color: opt.descripcionChars > 160 ? C.red : opt.descripcionChars >= 140 ? C.green : C.orange, fontWeight: 700 }}>
                            {opt.descripcionChars || opt.descripcion?.length} car
                          </span>
                          <button onClick={() => copyText(opt.descripcion, `d${i}`)} style={{ background: "none", border: "none", cursor: "pointer", color: copiedMeta === `d${i}` ? C.green : C.muted, fontSize: "0.75rem", padding: 0 }}>
                            {copiedMeta === `d${i}` ? "✓" : "⎘"}
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: C.mid, lineHeight: 1.5, wordBreak: "break-word" }}>{opt.descripcion}</div>
                    </div>
                  </div>
                ))}
                <button onClick={generarMetas} style={{ alignSelf: "flex-end", background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, fontFamily: "inherit" }}>↺ Regenerar opciones</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Markdown Editor (split pane: textarea + live preview) ──────────────────

function MarkdownEditor({ value, onChange, C }) {
  const textareaRef = { current: null };

  // Insert text at cursor position in textarea
  const insertAtCursor = (before, after = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const replacement = before + (selected || "texto") + after;
    const newValue = value.slice(0, start) + replacement + value.slice(end);
    onChange(newValue);
    // Restore cursor after React re-render
    setTimeout(() => {
      ta.focus();
      const cursorPos = start + before.length + (selected || "texto").length + after.length;
      ta.setSelectionRange(start + before.length, start + before.length + (selected || "texto").length);
    }, 0);
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;
  // Count sections (## headings)
  const sectionCount = (value.match(/^## /gm) || []).length;
  // Count internal links
  const linkCount = (value.match(/\[([^\]]+)\]\(\/[^)]+\)/g) || []).length;
  // Word count status
  const wordStatus = wordCount < 700 ? "short" : wordCount > 1100 ? "long" : "ok";
  const wordStatusColor = wordStatus === "ok" ? C.green : wordStatus === "short" ? C.orange : C.orange;
  const wordStatusLabel = wordStatus === "ok" ? "✓ En rango" : wordStatus === "short" ? "Corto" : "Largo";

  const toolbarBtn = (label, title, action) => (
    <button
      key={label}
      onClick={action}
      title={title}
      style={{
        background: "transparent",
        border: `1px solid ${C.border}`,
        borderRadius: 5,
        padding: "0.3rem 0.55rem",
        fontSize: "0.8rem",
        cursor: "pointer",
        color: C.mid,
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        fontWeight: 600,
        lineHeight: 1,
        transition: "all 0.12s",
      }}
      onMouseOver={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; e.currentTarget.style.background = C.redLight; }}
      onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.mid; e.currentTarget.style.background = "transparent"; }}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.6rem 0.85rem",
        background: C.light, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap",
      }}>
        {toolbarBtn("B", "Negrita (**texto**)", () => insertAtCursor("**", "**"))}
        {toolbarBtn("H2", "Encabezado H2", () => insertAtCursor("\n## ", "\n"))}
        {toolbarBtn("H3", "Encabezado H3", () => insertAtCursor("\n### ", "\n"))}
        {toolbarBtn("—", "Lista", () => insertAtCursor("\n- ", "\n"))}
        {toolbarBtn("🔗", "Enlace interno", () => insertAtCursor("[", "](/ruta)"))}
        {toolbarBtn("---", "Separador", () => insertAtCursor("\n\n---\n\n", ""))}

        <div style={{ flex: 1 }} />

        {/* Stats */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", fontSize: "0.72rem", color: C.muted, fontWeight: 600 }}>
          <span style={{ color: wordStatusColor, background: `${wordStatusColor}15`, padding: "0.15rem 0.45rem", borderRadius: 5 }}>
            {wordCount} pal · {wordStatusLabel}
          </span>
          <span>{sectionCount} H2</span>
          <span>{linkCount} link{linkCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Split pane */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "55vh", maxHeight: "65vh" }}>
        {/* Left: textarea */}
        <div style={{ borderRight: `1px solid ${C.border}`, position: "relative" }}>
          <textarea
            ref={el => textareaRef.current = el}
            value={value}
            onChange={e => onChange(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              outline: "none",
              resize: "none",
              padding: "1.25rem 1.5rem",
              fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
              fontSize: "0.88rem",
              lineHeight: 1.75,
              color: C.dark,
              background: C.cardBg,
              boxSizing: "border-box",
              overflowY: "auto",
            }}
          />
          <div style={{
            position: "absolute", bottom: "0.5rem", left: "0.85rem",
            fontSize: "0.65rem", color: C.muted, fontWeight: 600, opacity: 0.5,
            pointerEvents: "none", fontFamily: "'Oswald', sans-serif",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            Markdown
          </div>
        </div>

        {/* Right: live preview */}
        <div style={{
          padding: "1.25rem 1.5rem",
          overflowY: "auto",
          background: C.light,
          maxHeight: "65vh",
        }}>
          <BlockRenderer block={value} C={C} />
        </div>
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
  const [publico, setPublico] = useState("General");
  const [longitud, setLongitud] = useState("Estándar");
  const [intencion, setIntencion] = useState("Informativa");
  const [urlProducto, setUrlProducto] = useState("");
  const [contexto, setContexto] = useState("");
  const [articulo, setArticulo] = useState("");

  // Research state
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [includeResearch, setIncludeResearch] = useState(true);
  const [researchExpanded, setResearchExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [view, setView] = useState("panels"); // "panels" | "article"
  const [imagenes, setImagenes] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [draggedImg, setDraggedImg] = useState(null);
  const [imageError, setImageError] = useState("");
  const [isDark, setIsDark] = useState(true);
  const [gscData, setGscData] = useState(null);
  const [gscLoading, setGscLoading] = useState(true);
  const [gscError, setGscError] = useState("");
  const [ejemplos, setEjemplos] = useState(EJEMPLOS_FALLBACK);

  // Saved articles
  const [savedArticles, setSavedArticles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Scheduling — Google Sheets
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [scheduleResult, setScheduleResult] = useState(null);
  const [nextSlot, setNextSlot] = useState(null);
  const [scheduledArticles, setScheduledArticles] = useState([]);

  // Publish to WordPress
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  // Agent pipeline (enhance-article)
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceResult, setEnhanceResult] = useState(null);
  const [enhanceTab, setEnhanceTab] = useState("links"); // "links" | "headlines" | "keywords" | "cro" | "landing"
  const [croSelected, setCroSelected] = useState(new Set());
  const [landingSelected, setLandingSelected] = useState(new Set());

  // Keywords data (Prestashop)
  const [kwData, setKwData] = useState(null);
  const [kwLoading, setKwLoading] = useState(false);

  // Evergreen analysis
  const [evergreenData, setEvergreenData] = useState(null);
  const [evergreenLoading, setEvergreenLoading] = useState(true);
  const [refreshingPilar, setRefreshingPilar] = useState(null);
  const [pilarToRefresh, setPilarToRefresh] = useState(null);

  const C = isDark ? DARK_THEME : LIGHT;

  // Fetch GSC data
  const fetchGSC = useCallback(async () => {
    setGscLoading(true); setGscError("");
    try { const res = await fetch("/api/gsc-data"); const data = await res.json(); setGscData(data); setEjemplos(generateExamplesFromGSC(data)); } catch { setGscError("Error cargando datos GSC"); }
    setGscLoading(false);
  }, []);

  // Fetch saved articles
  const fetchArticles = useCallback(async () => {
    try { const res = await fetch("/api/articles"); const data = await res.json(); setSavedArticles(data.articles || []); } catch { /* silent */ }
  }, []);

  // Fetch scheduled articles
  const fetchScheduled = useCallback(async () => {
    try { const res = await fetch("/api/scheduled"); const data = await res.json(); setScheduledArticles(data.scheduled || []); } catch { /* silent */ }
  }, []);

  // Fetch next available slot from Google Sheets
  const fetchNextSlot = useCallback(async () => {
    try { const res = await fetch("/api/schedule-article"); const data = await res.json(); if (data.nextDate) setNextSlot(data); } catch { /* silent */ }
  }, []);

  // Fetch keywords data (Prestashop × KV × GSC)
  const fetchKeywords = useCallback(async (forceRefresh = false) => {
    setKwLoading(true);
    try {
      const url = forceRefresh ? "/api/keywords-data?refresh=true" : "/api/keywords-data";
      const res = await fetch(url);
      const data = await res.json();
      setKwData(data);
    } catch { /* silent */ }
    setKwLoading(false);
  }, []);

  const fetchEvergreen = useCallback(async () => {
    setEvergreenLoading(true);
    try {
      const res = await fetch("/api/evergreen-analysis");
      const data = await res.json();
      setEvergreenData(data);
    } catch { /* silent */ }
    setEvergreenLoading(false);
  }, []);

  useEffect(() => { fetchGSC(); fetchArticles(); fetchScheduled(); fetchNextSlot(); fetchEvergreen(); }, [fetchGSC, fetchArticles, fetchScheduled, fetchNextSlot, fetchEvergreen]);

  const refreshExamples = () => setEjemplos(generateExamplesFromGSC(gscData));

  const handleSelectTopic = ({ tema: t, categoria: c, keywords: k }) => {
    setTema(t); if (c) setCategoria(c); if (k) setKeywords(k);
    setResearchData(null); setResearchError(""); setContexto("");
    document.querySelector(".form-column")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const investigarTema = async () => {
    if (!tema) { setResearchError("Introduce un tema antes de investigar."); return; }
    setResearchLoading(true); setResearchError(""); setResearchData(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema, categoria, keywords, contexto }),
      });
      const data = await res.json();
      if (data.error) setResearchError(data.error);
      else { setResearchData(data); setResearchExpanded(true); }
    } catch { setResearchError("Error de conexión al investigar."); }
    setResearchLoading(false);
  };

  const generarArticulo = async () => {
    if (!tema || !categoria) { setError("Por favor, rellena el tema y la categoría."); return; }
    setError(""); setLoading(true); setArticulo(""); setImagenes([]); setImageError(""); setSaveSuccess(false); setPublishResult(null); setScheduleSuccess(false); setScheduleResult(null);
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        tema, categoria, keywords, tono, contexto, publico, longitud, intencion, urlProducto,
        ...(includeResearch && researchData ? { researchData } : {}),
      }) });
      const data = await res.json();
      if (data.articulo) { setArticulo(data.articulo); setActiveTab("preview"); setView("article"); }
      else setError(data.error || "Error al generar el artículo.");
    } catch { setError("Error de conexión. Inténtalo de nuevo."); }
    setLoading(false);
  };

  const publicarArticulo = async () => {
    if (!articulo) return;
    setSaving(true); setSaveSuccess(false);
    try {
      const res = await fetch("/api/save-article", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema, categoria, keywords, tono, articulo }),
      });
      const data = await res.json();
      if (data.saved) {
        setSaveSuccess(true);
        fetchArticles(); // Refresh the list
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch { setError("Error al guardar el artículo."); }
    setSaving(false);
  };

  const generarImagenes = async () => {
    if (!articulo) return;
    setLoadingImages(true); setImagenes([]); setImageError("");
    try {
      const res = await fetch("/api/generate-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tema, categoria, articleText: articulo }) });
      const data = await res.json();
      if (data.imagenes) setImagenes(data.imagenes);
      else setImageError(data.error || "Error generando imágenes.");
    } catch { setImageError("Error de conexión al generar imágenes."); }
    setLoadingImages(false);
  };

  const potenciarConAgentes = async () => {
    if (!articulo) return;
    setEnhancing(true); setEnhanceResult(null);
    try {
      const res = await fetch("/api/enhance-article", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articulo, tema, keywords, categoria }),
      });
      const data = await res.json();
      setEnhanceResult(data);
      setEnhanceTab("links");
    } catch { /* silent */ }
    setEnhancing(false);
  };

  // Inserta un elemento CRO/Landing en la sección correcta del artículo
  const aplicarElementoEnArticulo = (element) => {
    if (!element?.text) return;
    const { text, placement, position } = element;

    // Extraer nombre de sección de "H2: Nombre" o usar marcadores especiales
    const h2Match = placement?.match(/H2:\s*(.+)/i);
    const isIntro  = /^INTRO$/i.test(placement);
    const isCierre = /^CIERRE$/i.test(placement);

    const lines = articulo.split("\n");

    if (isIntro) {
      // Insertar tras el H1
      const h1Idx = lines.findIndex(l => l.match(/^# /));
      const insertAt = h1Idx >= 0 ? h1Idx + 1 : 0;
      lines.splice(insertAt, 0, "", text, "");
      setArticulo(lines.join("\n"));
      return;
    }

    if (isCierre || !h2Match) {
      // Appender al final
      setArticulo(articulo + "\n\n" + text);
      return;
    }

    const targetSection = h2Match[1].trim().toLowerCase();
    let sectionIdx = -1;
    let nextH2Idx  = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^## /)) {
        const h2text = lines[i].replace(/^## /, "").toLowerCase();
        if (h2text.includes(targetSection) || targetSection.includes(h2text)) {
          sectionIdx = i;
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].match(/^## /)) { nextH2Idx = j; break; }
          }
          break;
        }
      }
    }

    if (sectionIdx === -1) {
      // Sección no encontrada → append al final
      setArticulo(articulo + "\n\n" + text);
      return;
    }

    if (position === "inicio") {
      lines.splice(sectionIdx + 1, 0, "", text, "");
    } else if (nextH2Idx !== -1) {
      lines.splice(nextH2Idx, 0, text, "");
    } else {
      lines.push("", text);
    }
    setArticulo(lines.join("\n"));
  };

  const aplicarSeleccionados = (elements, selectedSet) => {
    // Aplicar todos los elementos seleccionados en orden
    const toApply = (elements || []).filter(el => selectedSet.has(el.id));
    if (!toApply.length) return;
    // Construimos un nuevo artículo aplicando todos en cadena
    let current = articulo;
    toApply.forEach(el => {
      const prev = articulo;
      aplicarElementoEnArticulo(el);
      // aplicarElementoEnArticulo usa setArticulo — necesitamos otra estrategia para encadenar
    });
    // Estrategia: aplicar uno a uno resetting selected después
    aplicarElementoEnArticulo(toApply[0]);
    if (toApply.length > 1) {
      // Los demás se aplican en cascada con un pequeño timeout para que React re-renderice
      toApply.slice(1).forEach((el, i) => {
        setTimeout(() => aplicarElementoEnArticulo(el), (i + 1) * 50);
      });
    }
  };

  const aplicarEnlace = (sentence) => {
    // Reemplaza la primera ocurrencia de la frase original en el artículo
    // buscando el texto del anchor para localizar dónde insertarlo
    if (!sentence) return;
    // La sentence ya tiene el markdown del enlace integrado
    // Extraemos el anchor text del markdown [anchor](/url) para buscar en el artículo
    const anchorMatch = sentence.match(/\[([^\]]+)\]\([^)]+\)/);
    if (!anchorMatch) return;
    const anchorText = anchorMatch[1];
    // Buscamos si el anchor ya existe sin enlace en el artículo
    if (articulo.includes(anchorText) && !articulo.includes(`[${anchorText}](`)) {
      setArticulo(articulo.replace(anchorText, `[${anchorText}]${sentence.match(/\]\(([^)]+)\)/)?.[0] || ""}`));
    }
  };

  const aplicarTitulo = (newTitle) => {
    // Reemplaza el H1 del artículo con el nuevo título
    setArticulo(articulo.replace(/^# .+$/m, `# ${newTitle}`));
  };

  const copiarContenido = () => {
    const content = activeTab === "html" ? articuloHtml : articulo;
    navigator.clipboard.writeText(content);
    setCopied(true); setTimeout(() => setCopied(false), 2200);
  };

  const programarArticulo = async () => {
    if (!articulo) return;
    setScheduling(true); setScheduleSuccess(false); setScheduleResult(null);
    try {
      const res = await fetch("/api/schedule-article", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema, categoria, keywords, tono, articulo }),
      });
      const data = await res.json();
      if (data.scheduled) {
        setScheduleSuccess(true);
        setScheduleResult(data);
        setShowScheduler(false);
        fetchArticles();
        fetchScheduled();
        fetchNextSlot();
        setTimeout(() => setScheduleSuccess(false), 6000);
      } else {
        setError(data.error || "Error al programar.");
      }
    } catch { setError("Error de conexión al programar."); }
    setScheduling(false);
  };

  const publicarEnWP = async () => {
    if (!articulo) return;
    setPublishing(true); setPublishResult(null);
    try {
      const res = await fetch("/api/publish-now", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema, categoria, keywords, tono, articulo }),
      });
      const data = await res.json();
      if (data.published) {
        setPublishResult(data);
        fetchArticles();
        setTimeout(() => setPublishResult(null), 10000);
      } else {
        setError(data.error || "Error al subir borrador a WordPress.");
      }
    } catch { setError("Error de conexión al publicar."); }
    setPublishing(false);
  };

  // Memoize HTML conversion so it only recalculates when articulo changes
  // Insert dragged image into article markdown after a given block index
  const insertImageAtBlock = (afterBlockIdx) => {
    if (draggedImg === null || !imagenes[draggedImg]) return;
    const img = imagenes[draggedImg];
    const lines = articulo.split("\n");
    const blocks = [];
    let current = [];
    for (const line of lines) {
      if (line.startsWith("## ") && current.length > 0) {
        blocks.push(current.join("\n"));
        current = [line];
      } else {
        current.push(line);
      }
    }
    if (current.length > 0) blocks.push(current.join("\n"));
    const filtered = blocks.filter(b => b.trim());
    filtered.splice(afterBlockIdx + 1, 0, `![${img.descripcion}](${img.src})`);
    setArticulo(filtered.join("\n\n"));
    setDraggedImg(null);
  };

  const articuloHtml = useMemo(() => articulo ? markdownToHtml(articulo) : "", [articulo]);

  const inputStyle = { width: "100%", border: `1px solid ${C.inputBorder}`, borderRadius: 10, padding: "0.75rem 1rem", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: C.dark, background: C.inputBg };
  const labelStyle = { fontSize: "0.82rem", fontWeight: 700, color: C.dark, display: "block", marginBottom: "0.45rem", textTransform: "uppercase", letterSpacing: "0.05em" };
  const sourceStyle = (source) => {
    if (source === "oportunidad") return { bg: `${C.red}15`, color: C.red, label: "Oportunidad" };
    if (source === "nuevo") return { bg: `${C.blue}15`, color: C.blue, label: "Nuevo tema" };
    if (source === "quickwin") return { bg: `${C.green}15`, color: C.green, label: "Quick Win" };
    return { bg: C.light, color: C.muted, label: "Sugerencia" };
  };

  return (
    <>
      <Head>
        <title>Ferrolan · Generador de Blog + GSC + Keywords</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; font-family: 'Source Sans 3', 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; transition: background 0.3s ease; }
        input:focus, textarea:focus, select:focus { border-color: ${C.red} !important; box-shadow: 0 0 0 3px ${C.red}15; }
        select option { background: ${C.inputBg}; color: ${C.dark}; }
        button { transition: all 0.15s ease; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes checkPop { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
        .articulo-panel { animation: fadeIn 0.35s ease; }
        .save-check { animation: checkPop 0.4s ease; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${isDark ? "#333" : "#DDD"}; border-radius: 3px; }
        @media (max-width: 1200px) {
          .main-grid { grid-template-columns: 1fr !important; }
          .form-sticky, .gsc-sticky { position: relative !important; top: 0 !important; }
        }
        @keyframes slideIn { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }
        .article-view { animation: slideIn 0.3s ease; }
      `}</style>

      <header style={{ background: C.cardBg, borderBottom: `3px solid ${C.red}`, padding: "0 2.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, transition: "background 0.3s" }}>
        <img src="/logo-ferrolan.png" alt="Ferrolan" style={{ height: 38, objectFit: "contain", filter: isDark ? "brightness(1.2)" : "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {savedArticles.length > 0 && (() => {
            const publicados = savedArticles.filter(a => a.wpStatus !== "draft").length;
            const borradores = savedArticles.length - publicados;
            return (
              <span style={{ fontSize: "0.78rem", color: C.muted, fontWeight: 600, fontFamily: "'Oswald', sans-serif" }}>
                {publicados} publicado{publicados !== 1 ? "s" : ""}{borradores > 0 ? ` · ${borradores} borrador${borradores !== 1 ? "es" : ""}` : ""}
              </span>
            );
          })()}
          <span style={{ fontSize: "0.82rem", color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Oswald', sans-serif" }}>Generador · Herramienta interna</span>
          <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
        </div>
      </header>

      <div style={{ background: C.red, padding: "0.45rem 2.5rem" }}>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.78rem", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>Blog · Claude AI + OpenAI Images · GSC + Keywords Prestashop</p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ═══  VIEW: PANELS (main dashboard)  ═══════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {view === "panels" && (
      <div className="main-grid" style={{ maxWidth: 1920, margin: "0 auto", padding: "1.5rem 2rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>

        {/* ─── LEFT: FORM ─── */}
        <div className="form-column form-sticky" style={{ position: "sticky", top: "1.5rem", alignSelf: "start", maxHeight: "calc(100vh - 3rem)", overflowY: "auto" }}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", transition: "background 0.3s" }}>
            <div style={{ background: C.panelHeader, padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.panelHeaderText} strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Configurar artículo</span>
            </div>
            <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <div style={{ ...labelStyle, color: C.muted, marginBottom: 0 }}>Ideas desde GSC</div>
                  <button onClick={refreshExamples} title="Nuevas ideas" style={{ background: C.light, border: `1px solid ${C.border}`, borderRadius: 6, width: 28, height: 28, fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, flexShrink: 0 }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>↺</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {ejemplos.map((ej, i) => { const s = sourceStyle(ej.source); return (
                    <button key={`${ej.tema}-${i}`} onClick={() => { setTema(ej.tema); if (ej.categoria) setCategoria(ej.categoria); setKeywords(ej.keywords || ""); }}
                      style={{ display: "block", width: "100%", background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: "0.6rem 0.85rem", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
                      onMouseOver={e => e.currentTarget.style.borderColor = C.red} onMouseOut={e => e.currentTarget.style.borderColor = C.redBorder}>
                      <div style={{ fontSize: "0.88rem", color: C.red, lineHeight: 1.4, fontWeight: 500, marginBottom: "0.3rem" }}>{ej.tema}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {ej.source && <span style={{ fontSize: "0.62rem", fontWeight: 700, color: s.color, background: s.bg, padding: "0.1rem 0.4rem", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</span>}
                        {ej.keywords && <span style={{ fontSize: "0.7rem", color: C.muted, fontStyle: "italic" }}>KW: {ej.keywords}</span>}
                      </div>
                    </button>); })}
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${C.border}` }} />
              <div><label style={labelStyle}>Tema del artículo *</label><input value={tema} onChange={e => setTema(e.target.value)} placeholder="Ej: Tendencias en pavimentos 2026..." style={inputStyle} /></div>
              <div><label style={labelStyle}>Categoría *</label><select value={categoria} onChange={e => setCategoria(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}><option value="">Selecciona categoría...</option>{CATEGORIAS.map(g => <optgroup key={g.group} label={g.group}>{g.items.map(item => <option key={item} value={item}>{item}</option>)}</optgroup>)}</select></div>
              <div><label style={labelStyle}>Keywords SEO <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.78rem", color: C.muted }}>(opcional)</span></label><input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Ej: suelo porcelánico, exterior" style={inputStyle} /></div>
              <div><label style={labelStyle}>Tono</label><div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>{TONOS.map(t => <button key={t} onClick={() => setTono(t)} style={{ padding: "0.4rem 0.75rem", borderRadius: 8, border: tono === t ? `2px solid ${C.red}` : `1px solid ${C.border}`, background: tono === t ? C.redLight : C.cardBg, color: tono === t ? C.red : C.mid, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", fontWeight: tono === t ? 700 : 500 }}>{t}</button>)}</div></div>
              <div><label style={labelStyle}>Público objetivo</label><div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>{[["General", ""], ["Particulares / DIY", ""], ["Profesionales", ""], ["Arquitectos", ""]].map(([p]) => (<button key={p} onClick={() => setPublico(p)} style={{ padding: "0.4rem 0.75rem", borderRadius: 8, border: publico === p ? `2px solid ${C.red}` : `1px solid ${C.border}`, background: publico === p ? C.redLight : C.cardBg, color: publico === p ? C.red : C.mid, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", fontWeight: publico === p ? 700 : 500 }}>{p}</button>))}</div></div>
              <div><label style={labelStyle}>Longitud objetivo</label><div style={{ display: "flex", gap: "0.35rem" }}>{[["Corto", "~600 pal"], ["Estándar", "~900 pal"], ["Largo", "~1200 pal"]].map(([l, hint]) => (<button key={l} onClick={() => setLongitud(l)} style={{ flex: 1, padding: "0.4rem 0.5rem", borderRadius: 8, border: longitud === l ? `2px solid ${C.red}` : `1px solid ${C.border}`, background: longitud === l ? C.redLight : C.cardBg, color: longitud === l ? C.red : C.mid, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", fontWeight: longitud === l ? 700 : 500, textAlign: "center", lineHeight: 1.25 }}><div style={{ fontWeight: 700 }}>{l}</div><div style={{ fontSize: "0.62rem", opacity: 0.65 }}>{hint}</div></button>))}</div></div>
              <div><label style={labelStyle}>Intención de búsqueda</label><div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>{["Informativa", "Comparativa", "Transaccional", "Guía técnica"].map(it => (<button key={it} onClick={() => setIntencion(it)} style={{ padding: "0.4rem 0.75rem", borderRadius: 8, border: intencion === it ? `2px solid ${C.red}` : `1px solid ${C.border}`, background: intencion === it ? C.redLight : C.cardBg, color: intencion === it ? C.red : C.mid, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", fontWeight: intencion === it ? 700 : 500 }}>{it}</button>))}</div></div>
              <div><label style={labelStyle}>URL de producto <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.78rem", color: C.muted }}>(opcional)</span></label><input value={urlProducto} onChange={e => setUrlProducto(e.target.value)} placeholder="https://ferrolan.es/producto/..." style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>Contexto / Idea concreta <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.78rem", color: C.muted }}>(recomendado)</span></label>
                <textarea value={contexto} onChange={e => setContexto(e.target.value)} placeholder="Describe qué quieres que cubra el artículo: enfoque, puntos clave, productos relevantes, público objetivo, datos específicos..." rows={4} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
              </div>

              {/* ─── Research section ─── */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Investigación previa</label>
                  {researchData && (
                    <button onClick={() => setResearchExpanded(!researchExpanded)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "0.8rem", fontFamily: "inherit" }}>
                      {researchExpanded ? "▾ Ocultar" : "▸ Mostrar"}
                    </button>
                  )}
                </div>

                {!researchData && !researchLoading && (
                  <button onClick={investigarTema}
                    style={{ width: "100%", background: C.blueLight, color: C.blue, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: "0.7rem", fontSize: "0.88rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.background = C.blue; e.currentTarget.style.color = "#FFF"; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = C.blueBorder; e.currentTarget.style.background = C.blueLight; e.currentTarget.style.color = C.blue; }}>
                    🔍 Investigar tema
                  </button>
                )}

                {researchLoading && (
                  <div style={{ textAlign: "center", padding: "1rem" }}>
                    <div style={{ width: 28, height: 28, border: `3px solid ${C.border}`, borderTopColor: C.blue, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.5rem" }} />
                    <div style={{ fontSize: "0.85rem", color: C.muted }}>Analizando competencia y oportunidades...</div>
                  </div>
                )}

                {researchError && (
                  <div style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: "0.5rem 0.75rem", color: C.red, fontSize: "0.85rem", fontWeight: 600 }}>
                    ⚠ {researchError}
                  </div>
                )}

                {researchData && researchExpanded && (
                  <div style={{ background: C.light, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.85rem", fontSize: "0.85rem" }}>
                    {/* Brief summary */}
                    {researchData.briefSummary && (
                      <div style={{ marginBottom: "0.7rem", padding: "0.5rem 0.7rem", background: C.blueLight, border: `1px solid ${C.blueBorder}`, borderRadius: 8, color: C.blue, fontSize: "0.82rem", lineHeight: 1.5, fontWeight: 500 }}>
                        {researchData.briefSummary}
                      </div>
                    )}
                    {/* Competitor sections */}
                    {researchData.competitorInsights?.commonSections?.length > 0 && (
                      <div style={{ marginBottom: "0.6rem" }}>
                        <div style={{ fontWeight: 700, color: C.dark, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.3rem" }}>Secciones comunes en SERP</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
                          {researchData.competitorInsights.commonSections.map((s, i) => (
                            <span key={i} style={{ display: "inline-block", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "0.15rem 0.5rem", fontSize: "0.78rem", color: C.mid }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Gaps */}
                    {researchData.gaps?.length > 0 && (
                      <div style={{ marginBottom: "0.6rem" }}>
                        <div style={{ fontWeight: 700, color: C.dark, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.3rem" }}>Gaps de contenido</div>
                        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: C.mid, fontSize: "0.82rem", lineHeight: 1.6 }}>
                          {researchData.gaps.map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                      </div>
                    )}
                    {/* PAA */}
                    {researchData.peopleAlsoAsk?.length > 0 && (
                      <div style={{ marginBottom: "0.6rem" }}>
                        <div style={{ fontWeight: 700, color: C.dark, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.3rem" }}>Preguntas frecuentes</div>
                        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: C.blue, fontSize: "0.82rem", lineHeight: 1.6 }}>
                          {researchData.peopleAlsoAsk.map((q, i) => <li key={i}>{q}</li>)}
                        </ul>
                      </div>
                    )}
                    {/* Suggested angle */}
                    {researchData.suggestedAngle && (
                      <div style={{ marginBottom: "0.6rem" }}>
                        <div style={{ fontWeight: 700, color: C.dark, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.3rem" }}>Ángulo recomendado</div>
                        <div style={{ color: C.green, fontWeight: 600, fontSize: "0.82rem", lineHeight: 1.5 }}>{researchData.suggestedAngle}</div>
                      </div>
                    )}
                    {/* Additional keywords — clickable */}
                    {researchData.additionalKeywords?.length > 0 && (
                      <div style={{ marginBottom: "0.5rem" }}>
                        <div style={{ fontWeight: 700, color: C.dark, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.3rem" }}>Keywords adicionales <span style={{ fontWeight: 400, textTransform: "none", color: C.muted }}>(clic para añadir)</span></div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                          {researchData.additionalKeywords.map((k, i) => (
                            <span key={i} onClick={() => setKeywords(prev => prev ? (prev.includes(k) ? prev : `${prev}, ${k}`) : k)}
                              style={{ display: "inline-block", background: C.blueLight, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: "0.15rem 0.5rem", fontSize: "0.76rem", color: C.blue, cursor: "pointer", fontWeight: 600 }}
                              title="Clic para añadir a keywords">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Controls: include toggle + re-research */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.6rem", paddingTop: "0.5rem", borderTop: `1px solid ${C.border}` }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: C.mid, cursor: "pointer" }}>
                        <input type="checkbox" checked={includeResearch} onChange={e => setIncludeResearch(e.target.checked)} /> Incluir en generación
                      </label>
                      <button onClick={investigarTema} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, fontFamily: "inherit" }}>↺ Reinvestigar</button>
                    </div>
                  </div>
                )}
              </div>

              {error && <div style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: "0.65rem 1rem", color: C.red, fontSize: "0.9rem", fontWeight: 600 }}>⚠ {error}</div>}
              <button onClick={generarArticulo} disabled={loading}
                style={{ background: loading ? C.redDark : C.red, color: "#FFF", border: "none", borderRadius: 10, padding: "0.9rem", fontWeight: 700, fontSize: "0.95rem", cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.07em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                onMouseOver={e => !loading && (e.currentTarget.style.background = C.redDark)} onMouseOut={e => !loading && (e.currentTarget.style.background = C.red)}>
                {loading ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "spin 0.85s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Generando...</> : "Generar artículo"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: "0.75rem", background: C.cardBg, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.red}`, borderRadius: "0 10px 10px 0", padding: "0.75rem 1.1rem", transition: "background 0.3s" }}>
            <div style={{ fontSize: "0.78rem", color: C.dark, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Oswald', sans-serif", marginBottom: "0.25rem" }}>Cada artículo incluye</div>
            <div style={{ fontSize: "0.88rem", color: C.mid, lineHeight: 1.6 }}>Investigación previa · Tono informativo · Estructura editorial · Links internos · Meta SEO · 2 imágenes IA</div>
          </div>

          {/* Saved articles history */}
          <SavedArticlesPanel articles={savedArticles} onRefresh={fetchArticles} C={C} />

          {/* Scheduled articles */}
          {scheduledArticles.length > 0 && (
            <div style={{ marginTop: "0.75rem", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: C.panelHeader, padding: "0.65rem 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.82rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>📅 Programados</span>
                <span style={{ background: C.blue, color: "#FFF", fontSize: "0.65rem", fontWeight: 700, padding: "0.08rem 0.4rem", borderRadius: 10 }}>
                  {scheduledArticles.filter(a => a.status === "scheduled").length}
                </span>
              </div>
              <div style={{ padding: "0.85rem 1.1rem", maxHeight: "250px", overflowY: "auto" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {scheduledArticles.map((a, i) => {
                    const isPast = new Date(a.publishDate) < new Date();
                    const statusColors = {
                      scheduled: { bg: C.blueLight, border: C.blueBorder, color: C.blue, icon: "📅", label: isPast ? "Pendiente publicar" : new Date(a.publishDate).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) },
                      published: { bg: C.greenLight, border: C.greenBorder, color: C.green, icon: "✅", label: "Publicado" },
                      failed: { bg: C.redLight, border: C.redBorder, color: C.red, icon: "❌", label: "Error" },
                    };
                    const st = statusColors[a.status] || statusColors.scheduled;
                    return (
                      <div key={a.id || i} style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 8, padding: "0.6rem 0.8rem" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: C.dark, lineHeight: 1.3, marginBottom: "0.2rem" }}>{a.titulo}</div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.72rem" }}>
                          <span style={{ color: st.color, fontWeight: 700 }}>{st.icon} {st.label}</span>
                          {a.publishDateFormatted && <span style={{ color: C.muted }}>📋 {a.publishDateFormatted}</span>}
                          {a.sheetRow && <span style={{ color: C.muted }}>Fila {a.sheetRow}</span>}
                          {a.wpLink && <a href={a.wpLink} target="_blank" rel="noopener noreferrer" style={{ color: C.red, fontWeight: 600, textDecoration: "none" }}>Ver →</a>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── CENTER: OPPORTUNITIES ─── */}
        <div className="gsc-sticky" style={{ position: "sticky", top: "1.5rem", alignSelf: "start", maxHeight: "calc(100vh - 3rem)", overflowY: "auto" }}>
          <OpportunitiesPanel
            gscData={gscData} gscLoading={gscLoading} gscError={gscError} onRefreshGSC={fetchGSC}
            kwData={kwData} kwLoading={kwLoading} onRefreshKW={() => fetchKeywords(true)}
            onSelectTopic={handleSelectTopic} C={C}
          />
        </div>

        {/* ─── RIGHT: EVERGREEN ─── */}
        <div className="evergreen-sticky" style={{ position: "sticky", top: "1.5rem", alignSelf: "start", maxHeight: "calc(100vh - 3rem)", overflowY: "auto" }}>
          <EvergreenPanel
            data={evergreenData} loading={evergreenLoading} onRefresh={fetchEvergreen}
            onSelectTopic={handleSelectTopic} C={C}
          />
        </div>

        {/* Loading overlay inside panels view */}
        {loading && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, padding: "3rem 4rem", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, border: `3px solid ${C.border}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1.5rem" }} />
              <div style={{ color: C.dark, fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: "1.05rem", marginBottom: "0.5rem" }}>Generando artículo...</div>
              <div style={{ color: C.muted, fontSize: "0.95rem" }}>Claude está redactando en el estilo de Ferrolan</div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ═══  VIEW: ARTICLE (full-screen editor)  ═════════════════════════════ */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {view === "article" && articulo && (
      <div className="article-view" style={{ maxWidth: 1920, margin: "0 auto", padding: "1.5rem 2rem" }}>

        {/* ── Back bar + article summary ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <button onClick={() => setView("panels")}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0.5rem 1rem", fontSize: "0.85rem", cursor: "pointer", color: C.mid, fontFamily: "'Oswald', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}
            onMouseOver={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.mid; }}>
            ← Volver a paneles
          </button>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: C.dark, fontFamily: "'Oswald', sans-serif" }}>{tema}</span>
            {categoria && <span style={{ fontSize: "0.72rem", fontWeight: 700, color: C.red, background: `${C.red}12`, padding: "0.15rem 0.5rem", borderRadius: 5 }}>{categoria}</span>}
            {tono && <span style={{ fontSize: "0.72rem", fontWeight: 600, color: C.muted, background: C.light, padding: "0.15rem 0.5rem", borderRadius: 5, border: `1px solid ${C.border}` }}>{tono}</span>}
          </div>
        </div>

        {/* ── Main article grid: Article + Sidebar ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.5rem" }}>

          {/* ── Article panel ── */}
          <div>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", transition: "background 0.3s" }}>
              <div style={{ background: C.panelHeader, padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: "0.2rem" }}>
                  {[["preview", "Vista previa"], ["editor", "✎ Editar"], ["html", "HTML"]].map(([val, label]) => (
                    <button key={val} onClick={() => setActiveTab(val)} style={{ padding: "0.4rem 1rem", borderRadius: 6, border: "none", background: activeTab === val ? (val === "editor" ? "#7C3AED" : C.red) : "transparent", color: activeTab === val ? "#FFF" : "#AAA", fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</button>
                  ))}
                </div>
                <button onClick={copiarContenido} style={{ background: copied ? "#059669" : "rgba(255,255,255,0.1)", color: "#FFF", border: "none", borderRadius: 6, padding: "0.45rem 1rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>{copied ? "✓ Copiado" : activeTab === "html" ? "⎘ Copiar HTML" : "⎘ Copiar MD"}</button>
              </div>
              {activeTab === "editor" ? (
                <MarkdownEditor value={articulo} onChange={setArticulo} C={C} />
              ) : (
              <div style={{ padding: "2.5rem 3rem", maxHeight: "70vh", overflowY: "auto" }}>
                {activeTab === "preview"
                  ? <DroppableArticle articulo={articulo} imagenes={imagenes} onInsertImage={insertImageAtBlock} C={C} />
                  : <pre style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: "0.88rem", lineHeight: 1.75, color: C.mid, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{articuloHtml}</pre>}
              </div>
              )}

              {/* Bottom bar with Regenerar + Guardar + Programar + Borrador WP */}
              <div style={{ borderTop: `1px solid ${C.border}`, padding: "0.85rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", background: C.light }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                  <button onClick={generarArticulo}
                    style={{ background: C.cardBg, color: C.mid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0.55rem 1.2rem", fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.mid; }}>↺ Regenerar</button>

                  <button onClick={publicarArticulo} disabled={saving || saveSuccess}
                    style={{ background: saveSuccess ? "#059669" : "#059669", color: "#FFF", border: "none", borderRadius: 8, padding: "0.55rem 1.2rem", fontSize: "0.85rem", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "0.4rem" }}
                    onMouseOver={e => !saving && !saveSuccess && (e.currentTarget.style.background = "#047857")}
                    onMouseOut={e => !saving && !saveSuccess && (e.currentTarget.style.background = "#059669")}>
                    {saveSuccess ? <span className="save-check">✓ Guardado</span> : saving ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "spin 0.85s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Guardando...</> : <>✦ Guardar</>}
                  </button>

                  <button onClick={() => setShowScheduler(!showScheduler)}
                    disabled={scheduleSuccess}
                    style={{ background: scheduleSuccess ? "#2563EB" : showScheduler ? C.blue : C.cardBg, color: scheduleSuccess ? "#FFF" : showScheduler ? "#FFF" : C.blue, border: `1px solid ${scheduleSuccess || showScheduler ? "transparent" : C.blue}`, borderRadius: 8, padding: "0.55rem 1.2rem", fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {scheduleSuccess ? <span className="save-check">✓ Programado</span> : <>📅 Programar</>}
                  </button>

                  <button onClick={publicarEnWP} disabled={publishing || !!publishResult}
                    style={{ background: publishResult ? "#DC2626" : publishing ? "#991B1B" : C.red, color: "#FFF", border: "none", borderRadius: 8, padding: "0.55rem 1.2rem", fontSize: "0.85rem", cursor: publishing ? "not-allowed" : "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "0.4rem" }}
                    onMouseOver={e => !publishing && !publishResult && (e.currentTarget.style.background = C.redDark)}
                    onMouseOut={e => !publishing && !publishResult && (e.currentTarget.style.background = C.red)}>
                    {publishResult ? <span className="save-check">✓ Borrador en WP</span> : publishing ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "spin 0.85s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Subiendo...</> : <>📝 Borrador WP</>}
                  </button>

                  <button onClick={potenciarConAgentes} disabled={enhancing}
                    style={{ background: enhanceResult ? "linear-gradient(135deg,#7C3AED,#4F46E5)" : enhancing ? "#5B21B6" : "linear-gradient(135deg,#7C3AED,#4F46E5)", color: "#FFF", border: "none", borderRadius: 8, padding: "0.55rem 1.2rem", fontSize: "0.85rem", cursor: enhancing ? "not-allowed" : "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "0.4rem", opacity: enhancing ? 0.75 : 1 }}>
                    {enhancing
                      ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "spin 0.85s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Agentes...</>
                      : enhanceResult ? <>✦ Re-potenciar</> : <>✦ Potenciar</>}
                  </button>

                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: "0.82rem", color: C.muted }}>
                    {publishResult ? <a href={publishResult.wpEditLink || publishResult.wpLink} target="_blank" rel="noopener noreferrer" style={{ color: C.red, fontWeight: 600, textDecoration: "none" }}>Editar borrador en WP →</a> : scheduleSuccess && scheduleResult ? `${scheduleResult.dayName} ${scheduleResult.publishDate} · Fila ${scheduleResult.sheetRow} ✓` : saveSuccess ? "Guardado en la base de datos ✓" : "Revisa antes de publicar"}
                  </span>
                </div>

                {/* Scheduler panel — Google Sheets */}
                {showScheduler && (
                  <div style={{ background: C.cardBg, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: "1rem 1.25rem", animation: "fadeIn 0.2s ease" }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Oswald', sans-serif", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      📅 Programar publicación
                    </div>

                    {nextSlot ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                        <div style={{ background: C.blueLight, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: "0.85rem 1.25rem", flex: 1 }}>
                          <div style={{ fontSize: "0.72rem", color: C.muted, fontWeight: 600, textTransform: "uppercase", marginBottom: "0.25rem" }}>Próximo slot disponible</div>
                          <div style={{ fontSize: "1.15rem", fontWeight: 700, color: C.blue, fontFamily: "'Oswald', sans-serif" }}>
                            {nextSlot.dayName} {nextSlot.nextDate}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.15rem" }}>
                            Fila {nextSlot.nextRow} del Google Sheet
                          </div>
                        </div>

                        <button onClick={programarArticulo} disabled={scheduling}
                          style={{ background: scheduling ? "#1D4ED8" : C.blue, color: "#FFF", border: "none", borderRadius: 10, padding: "0.85rem 1.8rem", fontSize: "0.9rem", cursor: scheduling ? "not-allowed" : "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}>
                          {scheduling ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "spin 0.85s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Programando...</> : "Confirmar"}
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.88rem", color: C.muted }}>Cargando próximo slot disponible...</div>
                    )}

                    <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: "0.65rem", lineHeight: 1.4 }}>
                      Se publicará cada martes y jueves. Se añadirá automáticamente al Google Sheet del departamento.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Agent Enhancement Panel ── */}
            {enhanceResult && (
              <div style={{ marginTop: "1rem", background: C.cardBg, border: `1px solid #7C3AED40`, borderRadius: 12, overflow: "hidden", animation: "fadeIn 0.3s ease" }}>
                {/* Header */}
                <div style={{ background: "linear-gradient(135deg,#3B1F6B,#1E1B4B)", padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1rem" }}>✦</span>
                    <span style={{ color: "#E9D5FF", fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Resultados de los agentes</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                    {[["links","🔗 Links"], ["headlines","📝 Títulos"], ["keywords","📊 Keywords"], ["cro","💰 CRO"], ["landing","🚀 Landing"]].map(([key, label]) => (
                      <button key={key} onClick={() => setEnhanceTab(key)}
                        style={{ padding: "0.3rem 0.7rem", borderRadius: 6, border: "none", background: enhanceTab === key ? "#7C3AED" : "rgba(255,255,255,0.08)", color: enhanceTab === key ? "#FFF" : "#A78BFA", fontSize: "0.75rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 600, textTransform: "uppercase" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ padding: "1rem 1.25rem" }}>

                  {/* ── LINKS TAB ── */}
                  {enhanceTab === "links" && enhanceResult.linker && !enhanceResult.linker.error && (
                    <div>
                      {enhanceResult.linker.summary && (
                        <p style={{ fontSize: "0.82rem", color: C.muted, marginBottom: "0.75rem", lineHeight: 1.4, fontStyle: "italic" }}>{enhanceResult.linker.summary}</p>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {(enhanceResult.linker.links || []).map((link, i) => (
                          <div key={i} style={{ background: C.light, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.75rem 0.9rem" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#A78BFA", background: "rgba(124,58,237,0.12)", padding: "0.1rem 0.45rem", borderRadius: 5, fontFamily: "monospace" }}>{link.url}</span>
                                {link.placement && <span style={{ fontSize: "0.7rem", color: C.muted }}>→ {link.placement}</span>}
                              </div>
                              <button onClick={() => aplicarEnlace(link.sentence)}
                                style={{ background: "#7C3AED", color: "#FFF", border: "none", borderRadius: 6, padding: "0.25rem 0.65rem", fontSize: "0.72rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700 }}
                                onMouseOver={e => e.currentTarget.style.background = "#5B21B6"}
                                onMouseOut={e => e.currentTarget.style.background = "#7C3AED"}>
                                Aplicar
                              </button>
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "#7C3AED", fontWeight: 600, marginBottom: "0.25rem" }}>Anchor: "{link.anchor}"</div>
                            {link.sentence && <div style={{ fontSize: "0.78rem", color: C.mid, lineHeight: 1.5, background: C.cardBg, borderRadius: 6, padding: "0.4rem 0.6rem", borderLeft: "3px solid #7C3AED40" }}>{link.sentence}</div>}
                          </div>
                        ))}
                      </div>
                      {enhanceResult.linker.error && <div style={{ color: C.red, fontSize: "0.82rem" }}>⚠ {enhanceResult.linker.error}</div>}
                    </div>
                  )}

                  {/* ── HEADLINES TAB ── */}
                  {enhanceTab === "headlines" && enhanceResult.headlines && !enhanceResult.headlines.error && (
                    <div>
                      {enhanceResult.headlines.current_title && (
                        <div style={{ marginBottom: "0.75rem", padding: "0.5rem 0.75rem", background: C.light, borderRadius: 8, border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.2rem" }}>Título actual</div>
                          <div style={{ fontSize: "0.9rem", fontWeight: 600, color: C.dark }}>{enhanceResult.headlines.current_title}</div>
                        </div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {(enhanceResult.headlines.headlines || []).map((h, i) => (
                          <div key={i} style={{ background: C.light, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.7rem 0.9rem" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: C.dark, lineHeight: 1.35, marginBottom: "0.25rem" }}>{h.title}</div>
                                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                                  {h.formula && <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#A78BFA", background: "rgba(124,58,237,0.1)", padding: "0.1rem 0.4rem", borderRadius: 4 }}>{h.formula}</span>}
                                  {h.chars && <span style={{ fontSize: "0.65rem", color: h.chars > 70 ? C.red : C.green, fontWeight: 700 }}>{h.chars} car</span>}
                                  {h.seoScore && <span style={{ fontSize: "0.65rem", color: h.seoScore >= 80 ? C.green : C.orange, fontWeight: 700 }}>SEO {h.seoScore}</span>}
                                  {h.ctrScore && <span style={{ fontSize: "0.65rem", color: h.ctrScore >= 80 ? C.green : C.orange, fontWeight: 700 }}>CTR {h.ctrScore}</span>}
                                </div>
                                {h.reasoning && <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.2rem", fontStyle: "italic" }}>{h.reasoning}</div>}
                              </div>
                              <button onClick={() => aplicarTitulo(h.title)}
                                style={{ background: "none", border: `1px solid #7C3AED`, borderRadius: 6, padding: "0.3rem 0.65rem", fontSize: "0.72rem", cursor: "pointer", color: "#7C3AED", fontFamily: "'Oswald', sans-serif", fontWeight: 700, flexShrink: 0 }}
                                onMouseOver={e => { e.currentTarget.style.background = "#7C3AED"; e.currentTarget.style.color = "#FFF"; }}
                                onMouseOut={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#7C3AED"; }}>
                                Usar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── KEYWORDS TAB ── */}
                  {enhanceTab === "keywords" && enhanceResult.keywords && !enhanceResult.keywords.error && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                      {/* Score + primary */}
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <div style={{ width: 54, height: 54, borderRadius: "50%", border: `3px solid ${enhanceResult.keywords.score >= 80 ? C.green : enhanceResult.keywords.score >= 60 ? C.orange : C.red}`, background: `${enhanceResult.keywords.score >= 80 ? C.green : enhanceResult.keywords.score >= 60 ? C.orange : C.red}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: "1.1rem", fontWeight: 800, color: enhanceResult.keywords.score >= 80 ? C.green : enhanceResult.keywords.score >= 60 ? C.orange : C.red, fontFamily: "'Oswald', sans-serif" }}>{enhanceResult.keywords.score}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: C.dark }}>Keyword: <span style={{ color: "#7C3AED" }}>{enhanceResult.keywords.primary_keyword}</span></div>
                          <div style={{ fontSize: "0.75rem", color: C.muted }}>{enhanceResult.keywords.word_count} palabras · Densidad: {enhanceResult.keywords.density?.primary?.percent}%
                            {" "}<span style={{ color: enhanceResult.keywords.density?.primary?.status === "ok" ? C.green : C.orange, fontWeight: 700 }}>({enhanceResult.keywords.density?.primary?.status})</span>
                          </div>
                        </div>
                      </div>

                      {/* Location checklist */}
                      {enhanceResult.keywords.locations && (
                        <div style={{ background: C.light, borderRadius: 8, padding: "0.65rem 0.85rem" }}>
                          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.4rem" }}>Ubicaciones</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.2rem 0.5rem" }}>
                            {[
                              ["H1", enhanceResult.keywords.locations.h1],
                              ["Primeras 100 palabras", enhanceResult.keywords.locations.first_100_words],
                              [`${enhanceResult.keywords.locations.h2_count} H2 con keyword`, enhanceResult.keywords.locations.h2_count > 0],
                              ["Último párrafo", enhanceResult.keywords.locations.last_paragraph],
                              ["Meta título", enhanceResult.keywords.locations.meta_title],
                              ["Meta descripción", enhanceResult.keywords.locations.meta_description],
                            ].map(([label, ok]) => (
                              <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", color: ok ? C.green : C.muted }}>
                                <span>{ok ? "✓" : "○"}</span><span>{label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Issues */}
                      {(enhanceResult.keywords.issues || []).length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {enhanceResult.keywords.issues.map((issue, i) => (
                            <div key={i} style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", background: issue.type === "error" ? C.redLight : C.orangeLight, border: `1px solid ${issue.type === "error" ? C.red : C.orange}30`, borderRadius: 7, padding: "0.4rem 0.6rem" }}>
                              <span style={{ color: issue.type === "error" ? C.red : C.orange, fontWeight: 800, flexShrink: 0 }}>{issue.type === "error" ? "✖" : "⚠"}</span>
                              <span style={{ fontSize: "0.8rem", color: C.dark, lineHeight: 1.4 }}>{issue.text}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Suggestions */}
                      {(enhanceResult.keywords.suggestions || []).length > 0 && (
                        <div>
                          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.3rem" }}>Sugerencias</div>
                          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                            {enhanceResult.keywords.suggestions.map((s, i) => (
                              <li key={i} style={{ fontSize: "0.8rem", color: C.mid, lineHeight: 1.55 }}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── CRO TAB ── */}
                  {enhanceTab === "cro" && enhanceResult.cro && !enhanceResult.cro.error && (() => {
                    const { score, strategy_summary, elements = [] } = enhanceResult.cro;
                    const typeColors = { cta: "#10B981", objection: "#F59E0B", social_proof: "#3B82F6", trust: "#8B5CF6", authority: "#EC4899" };
                    const typeLabels = { cta: "CTA", objection: "Objeción", social_proof: "Prueba social", trust: "Confianza", authority: "Autoridad" };
                    return (
                      <div>
                        {/* Score + summary */}
                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem" }}>
                          <div style={{ width: 54, height: 54, borderRadius: "50%", border: `3px solid ${score >= 80 ? C.green : score >= 60 ? C.orange : C.red}`, background: `${score >= 80 ? C.green : score >= 60 ? C.orange : C.red}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: score >= 80 ? C.green : score >= 60 ? C.orange : C.red, fontFamily: "'Oswald', sans-serif" }}>{score}</span>
                          </div>
                          {strategy_summary && <p style={{ fontSize: "0.82rem", color: C.muted, margin: 0, lineHeight: 1.4, fontStyle: "italic" }}>{strategy_summary}</p>}
                        </div>
                        {/* Elements list */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "0.75rem" }}>
                          {elements.map((el) => {
                            const isSelected = croSelected.has(el.id);
                            const tagColor = typeColors[el.type] || C.muted;
                            return (
                              <div key={el.id} onClick={() => {
                                const next = new Set(croSelected);
                                isSelected ? next.delete(el.id) : next.add(el.id);
                                setCroSelected(next);
                              }} style={{ background: isSelected ? `${tagColor}12` : C.light, border: `1.5px solid ${isSelected ? tagColor : C.border}`, borderRadius: 10, padding: "0.65rem 0.85rem", cursor: "pointer", transition: "all 0.15s" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSelected ? tagColor : C.border}`, background: isSelected ? tagColor : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    {isSelected && <span style={{ color: "#FFF", fontSize: "0.6rem", fontWeight: 900 }}>✓</span>}
                                  </div>
                                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: tagColor, background: `${tagColor}15`, padding: "0.1rem 0.45rem", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.03em" }}>{typeLabels[el.type] || el.type}</span>
                                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: C.dark }}>{el.label}</span>
                                  {el.placement && <span style={{ fontSize: "0.7rem", color: C.muted, marginLeft: "auto" }}>→ {el.placement.replace(/^H2:\s*/i, "")}</span>}
                                </div>
                                {el.reason && <p style={{ fontSize: "0.75rem", color: C.muted, margin: "0 0 0.3rem 1.6rem", lineHeight: 1.35, fontStyle: "italic" }}>{el.reason}</p>}
                                <div style={{ marginLeft: "1.6rem", fontSize: "0.78rem", color: C.mid, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "0.4rem 0.6rem", fontFamily: "monospace", lineHeight: 1.45, maxHeight: 60, overflow: "hidden", position: "relative" }}>
                                  {el.text?.slice(0, 120)}{el.text?.length > 120 ? "…" : ""}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Apply button */}
                        {croSelected.size > 0 && (
                          <button onClick={() => { aplicarSeleccionados(elements, croSelected); setCroSelected(new Set()); }}
                            style={{ width: "100%", padding: "0.6rem", background: "linear-gradient(135deg,#10B981,#059669)", color: "#FFF", border: "none", borderRadius: 8, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                            ✦ Aplicar {croSelected.size} elemento{croSelected.size > 1 ? "s" : ""} al artículo
                          </button>
                        )}
                        {elements.length === 0 && <p style={{ color: C.muted, fontSize: "0.82rem", fontStyle: "italic" }}>No se generaron elementos de conversión.</p>}
                      </div>
                    );
                  })()}

                  {/* ── LANDING TAB ── */}
                  {enhanceTab === "landing" && enhanceResult.landing && !enhanceResult.landing.error && (() => {
                    const { score, summary, elements = [] } = enhanceResult.landing;
                    const typeColors = { cta: "#10B981", trust_signal: "#8B5CF6", intro_hook: "#3B82F6", closing: "#F59E0B", friction_fix: "#EF4444" };
                    const typeLabels = { cta: "CTA", trust_signal: "Confianza", intro_hook: "Gancho", closing: "Cierre", friction_fix: "Fricción" };
                    return (
                      <div>
                        {/* Score + summary */}
                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem" }}>
                          <div style={{ width: 54, height: 54, borderRadius: "50%", border: `3px solid ${score >= 80 ? C.green : score >= 60 ? C.orange : C.red}`, background: `${score >= 80 ? C.green : score >= 60 ? C.orange : C.red}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: score >= 80 ? C.green : score >= 60 ? C.orange : C.red, fontFamily: "'Oswald', sans-serif" }}>{score}</span>
                          </div>
                          {summary && <p style={{ fontSize: "0.82rem", color: C.muted, margin: 0, lineHeight: 1.4, fontStyle: "italic" }}>{summary}</p>}
                        </div>
                        {/* Elements list */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "0.75rem" }}>
                          {elements.map((el) => {
                            const isSelected = landingSelected.has(el.id);
                            const tagColor = typeColors[el.type] || C.muted;
                            return (
                              <div key={el.id} onClick={() => {
                                const next = new Set(landingSelected);
                                isSelected ? next.delete(el.id) : next.add(el.id);
                                setLandingSelected(next);
                              }} style={{ background: isSelected ? `${tagColor}12` : C.light, border: `1.5px solid ${isSelected ? tagColor : C.border}`, borderRadius: 10, padding: "0.65rem 0.85rem", cursor: "pointer", transition: "all 0.15s" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSelected ? tagColor : C.border}`, background: isSelected ? tagColor : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    {isSelected && <span style={{ color: "#FFF", fontSize: "0.6rem", fontWeight: 900 }}>✓</span>}
                                  </div>
                                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: tagColor, background: `${tagColor}15`, padding: "0.1rem 0.45rem", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.03em" }}>{typeLabels[el.type] || el.type}</span>
                                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: C.dark }}>{el.label}</span>
                                  {el.placement && <span style={{ fontSize: "0.7rem", color: C.muted, marginLeft: "auto" }}>→ {el.placement.replace(/^H2:\s*/i, "")}</span>}
                                </div>
                                {el.reason && <p style={{ fontSize: "0.75rem", color: C.muted, margin: "0 0 0.3rem 1.6rem", lineHeight: 1.35, fontStyle: "italic" }}>{el.reason}</p>}
                                <div style={{ marginLeft: "1.6rem", fontSize: "0.78rem", color: C.mid, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "0.4rem 0.6rem", fontFamily: "monospace", lineHeight: 1.45, maxHeight: 60, overflow: "hidden" }}>
                                  {el.text?.slice(0, 120)}{el.text?.length > 120 ? "…" : ""}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Apply button */}
                        {landingSelected.size > 0 && (
                          <button onClick={() => { aplicarSeleccionados(elements, landingSelected); setLandingSelected(new Set()); }}
                            style={{ width: "100%", padding: "0.6rem", background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#FFF", border: "none", borderRadius: 8, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                            ✦ Aplicar {landingSelected.size} elemento{landingSelected.size > 1 ? "s" : ""} al artículo
                          </button>
                        )}
                        {elements.length === 0 && <p style={{ color: C.muted, fontSize: "0.82rem", fontStyle: "italic" }}>No se generaron mejoras de landing.</p>}
                      </div>
                    );
                  })()}

                  {/* Error states */}
                  {enhanceTab === "links" && enhanceResult.linker?.error && <div style={{ color: C.red, fontSize: "0.82rem", padding: "0.5rem" }}>⚠ Error en el agente de enlaces: {enhanceResult.linker.error}</div>}
                  {enhanceTab === "headlines" && enhanceResult.headlines?.error && <div style={{ color: C.red, fontSize: "0.82rem", padding: "0.5rem" }}>⚠ Error en el generador de titulares: {enhanceResult.headlines.error}</div>}
                  {enhanceTab === "keywords" && enhanceResult.keywords?.error && <div style={{ color: C.red, fontSize: "0.82rem", padding: "0.5rem" }}>⚠ Error en el mapeador de keywords: {enhanceResult.keywords.error}</div>}
                  {enhanceTab === "cro" && enhanceResult.cro?.error && <div style={{ color: C.red, fontSize: "0.82rem", padding: "0.5rem" }}>⚠ Error en el agente CRO: {enhanceResult.cro.error}</div>}
                  {enhanceTab === "landing" && enhanceResult.landing?.error && <div style={{ color: C.red, fontSize: "0.82rem", padding: "0.5rem" }}>⚠ Error en el agente Landing: {enhanceResult.landing.error}</div>}
                </div>
              </div>
            )}

            {imageError && <div style={{ marginTop: "0.85rem", background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: "0.65rem 1.1rem", color: C.red, fontSize: "0.9rem", fontWeight: 600 }}>⚠ {imageError}</div>}
            <ImagePalette imagenes={imagenes} loadingImages={loadingImages} onGenerate={generarImagenes} hasArticle={!!articulo} onDragStart={setDraggedImg} C={C} />
          </div>

          {/* ── Right sidebar: SEO ── */}
          <div style={{ position: "sticky", top: "1.5rem", alignSelf: "start", maxHeight: "calc(100vh - 3rem)", overflowY: "auto" }}>
            <SEOPanel articulo={articulo} tema={tema} keywords={keywords} C={C} />
          </div>
        </div>
      </div>
      )}
    </>
  );
}
