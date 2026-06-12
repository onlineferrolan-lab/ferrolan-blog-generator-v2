// Panel de análisis SEO + generación de meta títulos/descripciones.

import { useState } from "react";

export function SEOPanel({ articulo, tema, keywords, provider = "anthropic", C }) {
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
        body: JSON.stringify({ articulo, tema, keywords, provider }),
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
        body: JSON.stringify({ articulo, tema, keywords, provider }),
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
