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

function ImagePanel({ imagenes, loadingImages, onGenerate, hasArticle, C }) {
  if (!hasArticle) return null;
  return (
    <div style={{ marginTop: "1.25rem", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ background: C.panelHeader, padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.panelHeaderText} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Imágenes del artículo</span>
        </div>
        {!loadingImages && imagenes.length === 0 && <button onClick={onGenerate} style={{ background: C.red, color: "#FFF", border: "none", borderRadius: 6, padding: "0.4rem 1rem", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase" }} onMouseOver={e => e.currentTarget.style.background = C.redDark} onMouseOut={e => e.currentTarget.style.background = C.red}>Generar imágenes</button>}
        {imagenes.length > 0 && <button onClick={onGenerate} style={{ background: "rgba(255,255,255,0.12)", color: "#CCC", border: "none", borderRadius: 6, padding: "0.4rem 1rem", fontSize: "0.82rem", cursor: "pointer", fontWeight: 600 }}>↺ Regenerar</button>}
      </div>
      <div style={{ padding: "1.5rem" }}>
        {loadingImages && <div style={{ textAlign: "center", padding: "3rem 1rem" }}><div style={{ width: 44, height: 44, border: `3px solid ${C.border}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1.2rem" }} /><div style={{ color: C.dark, fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: "0.95rem", marginBottom: "0.4rem" }}>Generando imágenes...</div><div style={{ color: C.muted, fontSize: "0.9rem" }}>Claude diseña los prompts · Gemini Imagen 3 las renderiza</div></div>}
        {!loadingImages && imagenes.length === 0 && <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: C.muted, fontSize: "0.95rem" }}>Pulsa <strong style={{ color: C.red }}>Generar imágenes</strong> para crear las imágenes del artículo con IA</div>}
        {imagenes.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>{imagenes.map((img, i) => (<div key={i}><div style={{ fontSize: "0.78rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem", fontFamily: "'Oswald', sans-serif" }}>{i === 0 ? "Imagen ambiente" : "Detalle de material"}</div><img src={img.src} alt={img.descripcion} style={{ width: "100%", borderRadius: 10, display: "block", border: `1px solid ${C.border}` }} /><div style={{ fontSize: "0.85rem", color: C.muted, marginTop: "0.5rem", lineHeight: 1.5, fontStyle: "italic" }}>{img.descripcion}</div><a href={img.src} download={`ferrolan-imagen-${i + 1}.png`} style={{ display: "inline-block", marginTop: "0.5rem", fontSize: "0.85rem", color: C.red, fontWeight: 600, textDecoration: "none" }}>↓ Descargar</a></div>))}</div>}
      </div>
    </div>
  );
}

// ─── GSC Panel ──────────────────────────────────────────────────────────────

function GSCPanel({ gscData, gscLoading, gscError, onRefresh, onSelectTopic, C }) {
  const [tab, setTab] = useState("oportunidades");
  const tabStyle = (t) => ({ padding: "0.45rem 0.6rem", borderRadius: 6, border: "none", background: tab === t ? C.red : "transparent", color: tab === t ? "#FFF" : "#AAA", fontSize: "0.78rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap", flex: 1, textAlign: "center" });
  const posColor = (pos) => pos <= 3 ? C.green : pos <= 7 ? C.orange : C.red;
  const formatNum = (n) => n >= 1000 ? (n / 1000).toFixed(1) + "K" : n.toString();
  const handleClick = (item) => onSelectTopic({ tema: item.sugerencia || item.query, categoria: item.categoria || "", keywords: item.query });

  const KWCard = ({ item, bg, borderColor, hoverShadow, badge, badgeColor, badgeBg, extra }) => (
    <button onClick={() => handleClick(item)} style={{ display: "block", width: "100%", textAlign: "left", background: bg, border: `1px solid ${borderColor}`, borderRadius: 10, padding: "0.85rem 1rem", cursor: "pointer", transition: "all 0.15s" }}
      onMouseOver={e => e.currentTarget.style.boxShadow = hoverShadow} onMouseOut={e => e.currentTarget.style.boxShadow = "none"}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: C.dark }}>{item.query}</span>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: badgeColor, background: badgeBg, padding: "0.15rem 0.5rem", borderRadius: 6, whiteSpace: "nowrap" }}>{badge}</span>
      </div>
      <div style={{ display: "flex", gap: "0.85rem", fontSize: "0.82rem", color: C.muted }}>
        <span>{formatNum(item.impresiones)} impr</span>
        {item.clics !== undefined && <span>{item.clics} clics</span>}
        {item.ctr !== undefined && <span>CTR {item.ctr}%</span>}
      </div>
      {extra && <div style={{ fontSize: "0.84rem", marginTop: "0.3rem", lineHeight: 1.4, ...extra.style }}>{extra.text}</div>}
    </button>
  );

  return (
    <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ background: C.panelHeader, padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.panelHeaderText} strokeWidth="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Panel GSC</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {gscData && <span style={{ fontSize: "0.72rem", padding: "0.18rem 0.55rem", borderRadius: 5, background: gscData.live ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.08)", color: gscData.live ? "#34D399" : "#888", fontWeight: 700 }}>{gscData.live ? "● LIVE" : "● ESTÁTICO"}</span>}
          <button onClick={onRefresh} disabled={gscLoading} style={{ background: "rgba(255,255,255,0.08)", color: "#CCC", border: "none", borderRadius: 6, width: 30, height: 30, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Actualizar">↺</button>
        </div>
      </div>
      <div style={{ padding: "1.25rem", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
        {gscLoading && <div style={{ textAlign: "center", padding: "3rem 1rem" }}><div style={{ width: 32, height: 32, border: `2.5px solid ${C.border}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1rem" }} /><div style={{ fontSize: "0.9rem", color: C.muted }}>Cargando datos GSC...</div></div>}
        {gscError && !gscLoading && <div style={{ background: C.redLight, borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.9rem", color: C.red }}>⚠ {gscError}</div>}
        {gscData && !gscLoading && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "1rem" }}>
              {[["Clics", formatNum(gscData.resumen.clics)], ["Impresiones", formatNum(gscData.resumen.impresiones)], ["CTR medio", gscData.resumen.ctr + "%"], ["Posición", gscData.resumen.posicion]].map(([label, value], i) => (
                <div key={i} style={{ background: C.light, borderRadius: 10, padding: "0.85rem", textAlign: "center", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: "1.35rem", fontWeight: 700, color: C.dark, fontFamily: "'Oswald', sans-serif" }}>{value}</div>
                  <div style={{ fontSize: "0.72rem", color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.1rem" }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "0.78rem", color: C.muted, textAlign: "center", marginBottom: "1rem" }}>{gscData.resumen.periodo}</div>
            <div style={{ display: "flex", gap: "0.2rem", marginBottom: "1rem", background: C.panelHeader, borderRadius: 8, padding: "0.2rem" }}>
              {[["oportunidades", "Oportunidades"], ["quickwins", "Quick Wins"], ["nuevos", "Nuevos"], ["articulos", "Artículos"]].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} style={tabStyle(key)}>{label}</button>
              ))}
            </div>

            {tab === "oportunidades" && <div><p style={{ fontSize: "0.88rem", color: C.muted, marginBottom: "0.75rem" }}>Alto volumen, posición mejorable. Clic para generar artículo.</p><div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>{(gscData.oportunidades || []).map((item, i) => <KWCard key={i} item={item} bg={C.cardBg} borderColor={C.border} hoverShadow={`0 2px 12px ${C.red}20`} badge={`pos ${item.posicion}`} badgeColor={posColor(item.posicion)} badgeBg={`${posColor(item.posicion)}18`} extra={item.sugerencia ? { text: `→ ${item.sugerencia}`, style: { color: C.mid, fontStyle: "italic" } } : null} />)}</div></div>}
            {tab === "quickwins" && <div><p style={{ fontSize: "0.88rem", color: C.muted, marginBottom: "0.75rem" }}>Ya bien posicionados — mantener y reforzar.</p><div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>{(gscData.quickWins || []).map((item, i) => <KWCard key={i} item={{ ...item, sugerencia: item.nota }} bg={C.greenLight} borderColor={C.greenBorder} hoverShadow={`0 2px 12px ${C.green}20`} badge={`✓ pos ${item.posicion}`} badgeColor={C.green} badgeBg={`${C.green}18`} extra={item.nota ? { text: `✦ ${item.nota}`, style: { color: C.green, fontWeight: 600 } } : null} />)}</div></div>}
            {tab === "nuevos" && <div><p style={{ fontSize: "0.88rem", color: C.muted, marginBottom: "0.75rem" }}>Keywords con demanda sin artículo dedicado.</p><div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>{(gscData.nuevosTemasGSC || []).map((item, i) => <KWCard key={i} item={item} bg={C.blueLight} borderColor={C.blueBorder} hoverShadow={`0 2px 12px ${C.blue}20`} badge={`${formatNum(item.impresiones)} impr`} badgeColor={C.blue} badgeBg={`${C.blue}18`} extra={item.sugerencia ? { text: `→ ${item.sugerencia}`, style: { color: C.blue, fontWeight: 600 } } : null} />)}</div></div>}
            {tab === "articulos" && <div><p style={{ fontSize: "0.88rem", color: C.muted, marginBottom: "0.75rem" }}>Artículos con más impresiones. Revisar periódicamente.</p><div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>{(gscData.articulosActualizar || []).map((item, i) => (<div key={i} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.85rem 1rem" }}><div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.dark, marginBottom: "0.3rem", lineHeight: 1.35 }}>{item.pagina}</div><div style={{ display: "flex", gap: "0.75rem", fontSize: "0.82rem", color: C.muted, flexWrap: "wrap" }}><span style={{ fontWeight: 600 }}>{formatNum(item.impresiones)} impr</span><span>{formatNum(item.clics)} clics</span><span style={{ color: posColor(item.posicion), fontWeight: 600 }}>pos {item.posicion}</span><span>CTR {item.ctr}%</span></div>{item.url && <a href={`https://ferrolan.es${item.url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.82rem", color: C.red, textDecoration: "none", marginTop: "0.3rem", display: "inline-block", fontWeight: 600 }}>Ver artículo →</a>}</div>))}</div></div>}

            {!gscData.live && <div style={{ marginTop: "1rem", padding: "0.65rem 0.85rem", background: C.orangeLight, border: `1px solid ${C.orange}30`, borderRadius: 8, fontSize: "0.82rem", color: C.orange, lineHeight: 1.45 }}>ⓘ Datos del último análisis manual. Configura credenciales de Google para datos en vivo.</div>}
          </>
        )}
      </div>
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
  const [isDark, setIsDark] = useState(false);
  const [gscData, setGscData] = useState(null);
  const [gscLoading, setGscLoading] = useState(true);
  const [gscError, setGscError] = useState("");
  const [ejemplos, setEjemplos] = useState(EJEMPLOS_FALLBACK);

  // Saved articles
  const [savedArticles, setSavedArticles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Scheduling
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [scheduledArticles, setScheduledArticles] = useState([]);

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

  useEffect(() => { fetchGSC(); fetchArticles(); fetchScheduled(); }, [fetchGSC, fetchArticles, fetchScheduled]);

  const refreshExamples = () => setEjemplos(generateExamplesFromGSC(gscData));

  const handleSelectTopic = ({ tema: t, categoria: c, keywords: k }) => {
    setTema(t); if (c) setCategoria(c); if (k) setKeywords(k);
    document.querySelector(".form-column")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const generarArticulo = async () => {
    if (!tema || !categoria) { setError("Por favor, rellena el tema y la categoría."); return; }
    setError(""); setLoading(true); setArticulo(""); setImagenes([]); setImageError(""); setSaveSuccess(false);
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tema, categoria, keywords, tono, notas }) });
      const data = await res.json();
      if (data.articulo) { setArticulo(data.articulo); setActiveTab("preview"); }
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

  const copiarContenido = () => {
    const content = activeTab === "html" ? articuloHtml : articulo;
    navigator.clipboard.writeText(content);
    setCopied(true); setTimeout(() => setCopied(false), 2200);
  };

  const programarArticulo = async () => {
    if (!articulo || !scheduleDate || !scheduleTime) return;
    setScheduling(true); setScheduleSuccess(false);
    try {
      const publishDate = `${scheduleDate}T${scheduleTime}:00`;
      const res = await fetch("/api/schedule-article", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema, categoria, keywords, tono, articulo, publishDate }),
      });
      const data = await res.json();
      if (data.scheduled) {
        setScheduleSuccess(true);
        setShowScheduler(false);
        fetchArticles();
        fetchScheduled();
        setTimeout(() => setScheduleSuccess(false), 5000);
      } else {
        setError(data.error || "Error al programar.");
      }
    } catch { setError("Error de conexión al programar."); }
    setScheduling(false);
  };

  // Memoize HTML conversion so it only recalculates when articulo changes
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
        <title>Ferrolan · Generador de Blog + GSC</title>
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
      `}</style>

      <header style={{ background: C.cardBg, borderBottom: `3px solid ${C.red}`, padding: "0 2.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, transition: "background 0.3s" }}>
        <img src="/logo-ferrolan.png" alt="Ferrolan" style={{ height: 38, objectFit: "contain", filter: isDark ? "brightness(1.2)" : "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {savedArticles.length > 0 && (
            <span style={{ fontSize: "0.78rem", color: C.muted, fontWeight: 600, fontFamily: "'Oswald', sans-serif" }}>
              {savedArticles.length} artículo{savedArticles.length !== 1 ? "s" : ""} publicado{savedArticles.length !== 1 ? "s" : ""}
            </span>
          )}
          <span style={{ fontSize: "0.82rem", color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Oswald', sans-serif" }}>Generador · Herramienta interna</span>
          <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
        </div>
      </header>

      <div style={{ background: C.red, padding: "0.45rem 2.5rem" }}>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.78rem", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>Blog · Claude AI + Gemini Imagen 3 · Panel Google Search Console</p>
      </div>

      <div className="main-grid" style={{ maxWidth: 1920, margin: "0 auto", padding: "1.5rem 2rem", display: "grid", gridTemplateColumns: "380px 1fr 420px", gap: "1.5rem", alignItems: "start" }}>

        {/* ─── LEFT: FORM ─── */}
        <div className="form-column form-sticky" style={{ position: "sticky", top: "1.5rem" }}>
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
              <div><label style={labelStyle}>Notas <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.78rem", color: C.muted }}>(opcional)</span></label><textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Productos, datos técnicos..." rows={2} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} /></div>
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
            <div style={{ fontSize: "0.88rem", color: C.mid, lineHeight: 1.6 }}>Tono informativo · Estructura editorial · Links internos · Meta SEO · 2 imágenes IA</div>
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
                          {a.calendarEvent && <span style={{ color: C.muted }}>📆 En calendario</span>}
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

        {/* ─── CENTER: RESULT ─── */}
        <div>
          {!articulo && !loading && (
            <div style={{ background: C.cardBg, border: `2px dashed ${C.border}`, borderRadius: 12, padding: "6rem 2.5rem", textAlign: "center", transition: "background 0.3s" }}>
              <div style={{ width: 60, height: 60, background: C.redLight, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
              <div style={{ color: C.dark, fontWeight: 700, fontSize: "1.1rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.5rem" }}>Genera tu artículo</div>
              <div style={{ color: C.muted, fontSize: "0.95rem", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>Rellena el formulario o selecciona una oportunidad del panel GSC para empezar</div>
            </div>
          )}

          {loading && (
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "6rem 2.5rem", textAlign: "center", transition: "background 0.3s" }}>
              <div style={{ width: 48, height: 48, border: `3px solid ${C.border}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1.5rem" }} />
              <div style={{ color: C.dark, fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: "1.05rem", marginBottom: "0.5rem" }}>Generando artículo...</div>
              <div style={{ color: C.muted, fontSize: "0.95rem" }}>Claude está redactando en el estilo de Ferrolan</div>
            </div>
          )}

          {articulo && (
            <div className="articulo-panel">
              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", transition: "background 0.3s" }}>
                <div style={{ background: C.panelHeader, padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: "0.2rem" }}>
                    {[["preview", "Vista previa"], ["html", "HTML"]].map(([val, label]) => (
                      <button key={val} onClick={() => setActiveTab(val)} style={{ padding: "0.4rem 1rem", borderRadius: 6, border: "none", background: activeTab === val ? C.red : "transparent", color: activeTab === val ? "#FFF" : "#AAA", fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</button>
                    ))}
                  </div>
                  <button onClick={copiarContenido} style={{ background: copied ? "#059669" : "rgba(255,255,255,0.1)", color: "#FFF", border: "none", borderRadius: 6, padding: "0.45rem 1rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>{copied ? "✓ Copiado" : activeTab === "html" ? "⎘ Copiar HTML" : "⎘ Copiar texto"}</button>
                </div>
                <div style={{ padding: "2.5rem 3rem", maxHeight: "70vh", overflowY: "auto" }}>
                  {activeTab === "preview" ? <MarkdownRenderer content={articulo} C={C} /> : <pre style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: "0.88rem", lineHeight: 1.75, color: C.mid, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{articuloHtml}</pre>}
                </div>

                {/* Bottom bar with Regenerar + Publicar + Programar */}
                <div style={{ borderTop: `1px solid ${C.border}`, padding: "0.85rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", background: C.light }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
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

                    <button onClick={() => { setShowScheduler(!showScheduler); if (!scheduleDate) { const d = new Date(); d.setDate(d.getDate() + 1); setScheduleDate(d.toISOString().split("T")[0]); } }}
                      disabled={scheduleSuccess}
                      style={{ background: scheduleSuccess ? "#2563EB" : showScheduler ? C.blue : C.cardBg, color: scheduleSuccess ? "#FFF" : showScheduler ? "#FFF" : C.blue, border: `1px solid ${scheduleSuccess || showScheduler ? "transparent" : C.blue}`, borderRadius: 8, padding: "0.55rem 1.2rem", fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {scheduleSuccess ? <span className="save-check">✓ Programado</span> : <>📅 Programar</>}
                    </button>

                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: "0.82rem", color: C.muted }}>
                      {scheduleSuccess ? "Añadido al calendario ✓" : saveSuccess ? "Guardado en la base de datos ✓" : "Revisa antes de publicar"}
                    </span>
                  </div>

                  {/* Scheduler panel */}
                  {showScheduler && (
                    <div style={{ background: C.cardBg, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: "1rem 1.25rem", animation: "fadeIn 0.2s ease" }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.dark, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Oswald', sans-serif", marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        📅 Programar publicación
                      </div>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: C.muted, display: "block", marginBottom: "0.3rem" }}>Fecha</label>
                          <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            style={{ border: `1px solid ${C.inputBorder}`, borderRadius: 8, padding: "0.55rem 0.75rem", fontSize: "0.9rem", background: C.inputBg, color: C.dark, fontFamily: "inherit", outline: "none" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: C.muted, display: "block", marginBottom: "0.3rem" }}>Hora</label>
                          <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                            style={{ border: `1px solid ${C.inputBorder}`, borderRadius: 8, padding: "0.55rem 0.75rem", fontSize: "0.9rem", background: C.inputBg, color: C.dark, fontFamily: "inherit", outline: "none" }} />
                        </div>
                        <button onClick={programarArticulo} disabled={scheduling || !scheduleDate}
                          style={{ background: scheduling ? "#1D4ED8" : C.blue, color: "#FFF", border: "none", borderRadius: 8, padding: "0.55rem 1.5rem", fontSize: "0.85rem", cursor: scheduling ? "not-allowed" : "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {scheduling ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "spin 0.85s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Programando...</> : "Confirmar"}
                        </button>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: "0.5rem", lineHeight: 1.4 }}>
                        Se creará un evento en Google Calendar y el artículo se publicará automáticamente en WordPress a la hora programada.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {imageError && <div style={{ marginTop: "0.85rem", background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: "0.65rem 1.1rem", color: C.red, fontSize: "0.9rem", fontWeight: 600 }}>⚠ {imageError}</div>}
              <ImagePanel imagenes={imagenes} loadingImages={loadingImages} onGenerate={generarImagenes} hasArticle={!!articulo} C={C} />
            </div>
          )}
        </div>

        {/* ─── RIGHT: GSC PANEL ─── */}
        <div className="gsc-sticky" style={{ position: "sticky", top: "1.5rem" }}>
          <GSCPanel gscData={gscData} gscLoading={gscLoading} gscError={gscError} onRefresh={fetchGSC} onSelectTopic={handleSelectTopic} C={C} />
        </div>
      </div>
    </>
  );
}
