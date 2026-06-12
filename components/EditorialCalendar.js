// Calendario editorial: vista mensual de artículos programados, publicados,
// borradores y guardados, con navegación entre meses.

import { useState } from "react";

const DOW = ["L", "M", "X", "J", "V", "S", "D"];
const TYPE_STYLES = {
  scheduled: { label: "Programado", color: "#60A5FA" },
  published: { label: "Publicado", color: "#34D399" },
  failed:    { label: "Error", color: "#EF4444" },
  draft:     { label: "Borrador WP", color: "#FBBF24" },
  saved:     { label: "Guardado", color: "#94A3B8" },
};

// Normaliza fecha a clave local YYYY-MM-DD
function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EditorialCalendar({ scheduledArticles, savedArticles, C }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  // ── Eventos por día ──
  const events = {};
  const push = (dateStr, ev) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;
    const key = dayKey(d);
    (events[key] = events[key] || []).push(ev);
  };

  const scheduledIds = new Set();
  for (const a of scheduledArticles || []) {
    scheduledIds.add(a.titulo);
    push(a.publishDate, { titulo: a.titulo, type: a.status === "published" ? "published" : a.status === "failed" ? "failed" : "scheduled", url: a.wpLink });
  }
  for (const a of savedArticles || []) {
    if (scheduledIds.has(a.titulo)) continue; // ya está como programado
    push(a.fecha, { titulo: a.titulo || a.tema, type: a.wpStatus === "draft" ? "draft" : a.wpStatus ? "published" : "saved" });
  }

  // ── Rejilla del mes (semanas empezando en lunes) ──
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = dayKey(new Date());
  const monthLabel = cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const move = (delta) => setCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  const monthEventCount = Object.entries(events).filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).reduce((s, [, v]) => s + v.length, 0);

  return (
    <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: C.panelHeader, padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1rem" }}>📅</span>
          <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Calendario editorial</span>
          {monthEventCount > 0 && <span style={{ background: "rgba(96,165,250,0.2)", color: "#93C5FD", fontSize: "0.68rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 10 }}>{monthEventCount} este mes</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button onClick={() => move(-1)} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 5, width: 26, height: 26, cursor: "pointer", color: "#aaa", fontSize: "0.8rem" }}>‹</button>
          <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.82rem", fontFamily: "'Oswald', sans-serif", textTransform: "capitalize", minWidth: 130, textAlign: "center" }}>{monthLabel}</span>
          <button onClick={() => move(1)} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 5, width: 26, height: 26, cursor: "pointer", color: "#aaa", fontSize: "0.8rem" }}>›</button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: "0.85rem 1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.25rem", marginBottom: "0.25rem" }}>
          {DOW.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: "0.65rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", padding: "0.2rem 0" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.25rem" }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = events[key] || [];
            const isToday = key === todayKey;
            return (
              <div key={key} style={{ minHeight: 64, background: isToday ? `${C.red}0A` : C.light, border: `1px solid ${isToday ? C.red : C.border}`, borderRadius: 8, padding: "0.3rem 0.35rem", overflow: "hidden" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: isToday ? C.red : C.muted, marginBottom: "0.2rem" }}>{day}</div>
                {dayEvents.slice(0, 2).map((ev, j) => {
                  const st = TYPE_STYLES[ev.type] || TYPE_STYLES.saved;
                  return (
                    <div key={j} title={`${st.label}: ${ev.titulo}`}
                      style={{ fontSize: "0.62rem", fontWeight: 600, color: st.color, background: `${st.color}18`, border: `1px solid ${st.color}30`, borderRadius: 4, padding: "0.08rem 0.3rem", marginBottom: "0.15rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ev.titulo}
                    </div>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div style={{ fontSize: "0.6rem", color: C.muted, fontWeight: 600 }}>+{dayEvents.length - 2} más</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Leyenda */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.65rem", paddingTop: "0.5rem", borderTop: `1px solid ${C.border}` }}>
          {Object.values(TYPE_STYLES).map((st) => (
            <span key={st.label} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", color: C.muted, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.color, display: "inline-block" }} />
              {st.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
