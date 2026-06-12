// Lista de artículos programados (estado: programado / publicado / error).

export function ScheduledList({ scheduledArticles, C }) {
  if (scheduledArticles.length === 0) return null;

  return (
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
  );
}
