// Panel de rendimiento post-publicación: cruza los artículos publicados por la
// app con los datos reales de GSC (90 días) — ¿posiciona lo que publicamos?

export function PerformancePanel({ data, loading, onRefresh, C }) {
  const posColor = (pos) => pos == null ? C.muted : pos <= 3 ? C.green : pos <= 10 ? C.orange : C.red;
  const edadBadge = (dias) => {
    if (dias == null) return null;
    const label = dias <= 30 ? "≤30d" : dias <= 60 ? "≤60d" : dias <= 90 ? "≤90d" : `${dias}d`;
    const color = dias <= 30 ? C.blue : dias <= 90 ? C.orange : C.muted;
    return <span style={{ fontSize: "0.65rem", fontWeight: 700, color, background: `${color}15`, padding: "0.1rem 0.4rem", borderRadius: 4 }}>{label}</span>;
  };

  const articulos = data?.articulos || [];

  return (
    <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: C.panelHeader, padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1rem" }}>📈</span>
          <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rendimiento post-publicación</span>
          {data?.periodo && <span style={{ fontSize: "0.65rem", color: "#888", fontWeight: 600 }}>GSC · {data.periodo}{data.cached ? " · caché" : ""}</span>}
        </div>
        <button onClick={onRefresh} title="Actualizar"
          style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 5, width: 26, height: 26, fontSize: "0.75rem", cursor: "pointer", color: "#aaa" }}
          onMouseOver={e => e.currentTarget.style.color = "#34D399"}
          onMouseOut={e => e.currentTarget.style.color = "#aaa"}>↺</button>
      </div>

      <div style={{ padding: "0.85rem 1rem", maxHeight: 420, overflowY: "auto" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
            <div style={{ width: 30, height: 30, border: `2.5px solid ${C.border}`, borderTopColor: C.green, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.75rem" }} />
            <div style={{ fontSize: "0.85rem", color: C.muted }}>Cruzando publicados con GSC...</div>
          </div>
        )}

        {!loading && data && !data.configured && (
          <div style={{ fontSize: "0.85rem", color: C.muted, textAlign: "center", padding: "1.5rem 1rem", lineHeight: 1.5 }}>
            Configura las credenciales de Google Search Console para ver cómo posicionan los artículos publicados.
          </div>
        )}

        {!loading && data?.configured && articulos.length === 0 && (
          <div style={{ fontSize: "0.85rem", color: C.muted, textAlign: "center", padding: "1.5rem 1rem", lineHeight: 1.5 }}>
            Aún no hay artículos publicados con slug que seguir. Publica desde el dashboard y aparecerán aquí con sus métricas reales.
          </div>
        )}

        {!loading && articulos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {articulos.map((a, i) => (
              <div key={a.slug || i} style={{ background: C.light, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0.6rem 0.85rem", opacity: a.enGSC ? 1 : 0.7 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: C.dark, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.titulo}</span>
                  <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0, alignItems: "center" }}>
                    {edadBadge(a.dias)}
                    {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: C.red, textDecoration: "none", fontWeight: 600 }}>Ver →</a>}
                  </div>
                </div>
                {a.enGSC ? (
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: C.green, background: `${C.green}15`, padding: "0.12rem 0.45rem", borderRadius: 12 }}>{a.clics} clics</span>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94A3B8", background: "rgba(148,163,184,0.12)", padding: "0.12rem 0.45rem", borderRadius: 12 }}>{a.impresiones >= 1000 ? (a.impresiones / 1000).toFixed(1) + "K" : a.impresiones} impr</span>
                    {a.posicion != null && <span style={{ fontSize: "0.7rem", fontWeight: 700, color: posColor(a.posicion), background: `${posColor(a.posicion)}15`, padding: "0.12rem 0.45rem", borderRadius: 12 }}>pos {a.posicion}</span>}
                    {a.ctr != null && <span style={{ fontSize: "0.7rem", fontWeight: 700, color: C.orange, background: `${C.orange}15`, padding: "0.12rem 0.45rem", borderRadius: 12 }}>CTR {a.ctr}%</span>}
                  </div>
                ) : (
                  <div style={{ fontSize: "0.72rem", color: C.muted }}>
                    Sin datos en GSC todavía {a.dias != null && a.dias < 30 ? "— normal en artículos de menos de un mes" : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
