// Historial de artículos guardados/publicados (colapsable).

import { useState } from "react";

export function SavedArticlesPanel({ articles, C }) {
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
