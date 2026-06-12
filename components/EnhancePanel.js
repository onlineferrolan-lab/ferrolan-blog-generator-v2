// Panel de resultados del pipeline de agentes (enhance-article):
// enlaces internos, titulares, keywords, CRO y landing.

import { useState } from "react";

export function EnhancePanel({ enhanceResult, fixingKeywords, onFixKeywords, onApplyLink, onApplyTitle, onApplyElements, C }) {
  const [enhanceTab, setEnhanceTab] = useState("links");
  const [croSelected, setCroSelected] = useState(new Set());
  const [landingSelected, setLandingSelected] = useState(new Set());

  if (!enhanceResult) return null;

  return (
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
                    <button onClick={() => onApplyLink(link.sentence)}
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
                    <button onClick={() => onApplyTitle(h.title)}
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

            {/* Fix keywords button */}
            {((enhanceResult.keywords.issues || []).some(i => i.type === "error" || i.type === "warning") ||
              !enhanceResult.keywords.locations?.last_paragraph ||
              !enhanceResult.keywords.locations?.h1 ||
              enhanceResult.keywords.density?.primary?.status !== "ok") && (
              <button onClick={onFixKeywords} disabled={fixingKeywords}
                style={{ width: "100%", padding: "0.65rem", background: fixingKeywords ? "#5B21B6" : "linear-gradient(135deg,#7C3AED,#4F46E5)", color: "#FFF", border: "none", borderRadius: 8, fontSize: "0.82rem", fontWeight: 700, cursor: fixingKeywords ? "not-allowed" : "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.04em", textTransform: "uppercase", opacity: fixingKeywords ? 0.75 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                {fixingKeywords ? <>⏳ Optimizando keywords…</> : <>✦ Corregir keywords en el artículo</>}
              </button>
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
                <button onClick={() => { onApplyElements(elements, croSelected); setCroSelected(new Set()); }}
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
                <button onClick={() => { onApplyElements(elements, landingSelected); setLandingSelected(new Set()); }}
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
  );
}
