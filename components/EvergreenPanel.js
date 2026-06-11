// Panel de pilares evergreen: artículos top del blog + gaps sin cubrir.

import { useState } from "react";

export function EvergreenPanel({ data, loading, onRefresh, onSelectTopic, C }) {
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
                      {pilar.fuente === "gsc"
                        ? `${(pilar.clics || 0).toLocaleString("es")} clics`
                        : edadLabel(pilar.edad)}
                    </span>
                  </div>
                  {/* Metrics row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    {pilar.categoria && (
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: C.red, background: `${C.red}12`, padding: "0.1rem 0.4rem", borderRadius: 4 }}>{pilar.categoria}</span>
                    )}
                    {pilar.fuente === "gsc" ? (
                      <span style={{ fontSize: "0.7rem", color: C.muted }}>
                        {(pilar.impresiones || 0).toLocaleString("es")} imp · pos {pilar.posicion}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.7rem", color: C.muted }}>{pilar.fecha}</span>
                    )}
                    {pilar.fuente === "gsc" && (
                      <span style={{ fontSize: "0.62rem", fontWeight: 700, color: C.muted, background: C.inputBg, padding: "0.1rem 0.35rem", borderRadius: 4, border: `1px solid ${C.border}` }}>
                        {pilar.fuente_live ? "GSC LIVE" : "GSC"}
                      </span>
                    )}
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
                  No se encontraron pilares evergreen. Configura las credenciales de GSC para ver los artículos reales del blog.
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
