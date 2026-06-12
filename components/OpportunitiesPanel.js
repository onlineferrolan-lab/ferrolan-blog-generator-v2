// Panel unificado de oportunidades: GSC (oportunidades, quick wins, artículos
// a revisar), Prestashop (sin cubrir, sugeridas) y verificador de keywords.

import { useState } from "react";

export function OpportunitiesPanel({ gscData, gscLoading, gscError, onRefreshGSC, kwData, kwLoading, onRefreshKW, onSelectTopic, syncMeta, C }) {
  const [tab, setTab] = useState("oportunidades");
  const [ocultarCubiertos, setOcultarCubiertos] = useState(true);
  const [checkKw, setCheckKw] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleCheckKeyword = async () => {
    if (!checkKw.trim()) return;
    setCheckLoading(true);
    setCheckResult(null);
    try {
      const r = await fetch("/api/check-keyword", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyword: checkKw.trim() }) });
      const data = await r.json();
      setCheckResult(data);
    } catch {
      setCheckResult({ error: "Error al conectar con la API" });
    }
    setCheckLoading(false);
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const r = await fetch("/api/sync-blog-posts", { method: "POST" });
      const data = await r.json();
      setSyncResult(data);
    } catch {
      setSyncResult({ error: "Error al sincronizar" });
    }
    setSyncLoading(false);
  };

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
    { key: "verificar",     label: "Verificar keyword", desc: "Comprueba si una keyword ya está cubierta en el blog antes de escribir." },
  ];

  const currentTab = TABS.find(t => t.key === tab);

  // ── Filtrado por cobertura (temas ya cubiertos por artículos publicados) ──
  // Solo aplica a las pestañas de "crear artículo nuevo".
  const FILTRABLE = ["oportunidades", "sinCubrir", "sugeridas"];
  const currentList =
    tab === "oportunidades" ? (gscData?.oportunidades || [])
    : tab === "sinCubrir"   ? (kwData?.sinCubrir || [])
    : tab === "sugeridas"   ? (kwData?.sugeridas || [])
    : [];
  const coveredCount = currentList.filter((x) => x?.cubierto).length;
  const visibleList = (list) => (ocultarCubiertos ? (list || []).filter((x) => !x?.cubierto) : (list || []));

  // Nota visual para items cuyo tema ya está cubierto por un artículo publicado.
  const CoveredNote = ({ cov }) => (
    <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.5rem", paddingTop: "0.45rem", borderTop: `1px dashed ${C.border}` }}>
      <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: 5, background: C.orangeLight, color: C.orange, border: `1px solid ${C.orange}40`, whiteSpace: "nowrap" }}>● Ya cubierto · {cov.matchType}</span>
      {cov.url
        ? <a href={cov.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.76rem", color: C.red, textDecoration: "none", fontWeight: 600, lineHeight: 1.3 }}>{cov.title} →</a>
        : <span style={{ fontSize: "0.76rem", color: C.mid, fontWeight: 600 }}>{cov.title}</span>}
    </div>
  );

  const KWCardGSC = ({ item, bg, borderColor, hoverShadow, badge, badgeColor, badgeBg, extra }) => {
    const cov = item.cubierto ? item.articuloExistente : null;
    return (
    <button onClick={() => handleClickGSC(item)} style={{ display: "block", width: "100%", textAlign: "left", background: bg, border: `1px solid ${cov ? `${C.orange}55` : borderColor}`, borderRadius: 10, padding: "0.85rem 1rem", cursor: "pointer", transition: "all 0.15s", opacity: cov ? 0.62 : 1 }}
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
      {cov && <CoveredNote cov={cov} />}
    </button>
    );
  };

  const KWCardPS = ({ item, bg, borderColor, hoverColor }) => {
    const cov = item.cubierto ? item.articuloExistente : null;
    return (
    <button onClick={() => handleClickPS(item)}
      style={{ display: "block", width: "100%", textAlign: "left", background: bg, border: `1px solid ${cov ? `${C.orange}55` : borderColor}`, borderRadius: 10, padding: "0.85rem 1rem", cursor: "pointer", transition: "all 0.15s", opacity: cov ? 0.62 : 1 }}
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
      {cov && <CoveredNote cov={cov} />}
    </button>
    );
  };

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

        {/* ── Toggle: ocultar temas ya cubiertos ── */}
        {FILTRABLE.includes(tab) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.8rem", padding: "0.5rem 0.75rem", background: C.light, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <span style={{ fontSize: "0.78rem", color: C.mid, fontWeight: 600 }}>
              Ocultar temas ya cubiertos
              {coveredCount > 0 && <span style={{ color: C.orange, fontWeight: 700 }}> · {coveredCount} detectado{coveredCount !== 1 ? "s" : ""}</span>}
            </span>
            <button onClick={() => setOcultarCubiertos(v => !v)} title={ocultarCubiertos ? "Mostrar los ya cubiertos (en gris)" : "Ocultar los ya cubiertos"}
              style={{ width: 42, height: 23, borderRadius: 12, border: "none", cursor: "pointer", background: ocultarCubiertos ? C.red : C.border, position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
              <span style={{ position: "absolute", top: 2, left: ocultarCubiertos ? 21 : 2, width: 19, height: 19, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
            </button>
          </div>
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
            {visibleList(gscData.oportunidades).map((item, i) => (
              <KWCardGSC key={item.query || i} item={item} bg={C.cardBg} borderColor={C.border} hoverShadow={`0 2px 12px ${C.red}20`} badge={`pos ${item.posicion}`} badgeColor={posColor(item.posicion)} badgeBg={`${posColor(item.posicion)}18`} extra={item.sugerencia ? { text: `→ ${item.sugerencia}`, style: { color: C.mid, fontStyle: "italic" } } : null} />
            ))}
            {visibleList(gscData.oportunidades).length === 0 && (
              <div style={{ fontSize: "0.85rem", color: C.muted, textAlign: "center", padding: "1rem" }}>
                {ocultarCubiertos && (gscData.oportunidades || []).length > 0
                  ? "Todas las oportunidades ya están cubiertas. Desactiva el filtro para verlas."
                  : "Sin oportunidades disponibles."}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Quick Wins GSC ── */}
        {tab === "quickwins" && gscData && !gscLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {(gscData.quickWins || []).map((item, i) => (
              <KWCardGSC key={item.query || i} item={{ ...item, sugerencia: item.nota }} bg={C.greenLight} borderColor={C.greenBorder} hoverShadow={`0 2px 12px ${C.green}20`} badge={`✓ pos ${item.posicion}`} badgeColor={C.green} badgeBg={`${C.green}18`} extra={item.nota ? { text: `✦ ${item.nota}`, style: { color: C.green, fontWeight: 600 } } : null} />
            ))}
          </div>
        )}

        {/* ── Tab: Sin cubrir (Prestashop) ── */}
        {tab === "sinCubrir" && kwData?.resumen && !kwLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {visibleList(kwData.sinCubrir).map((item, i) => <KWCardPS key={item.keyword || i} item={item} bg={C.redLight} borderColor={C.redBorder} hoverColor={C.red} />)}
            {visibleList(kwData.sinCubrir).length === 0 && <div style={{ fontSize: "0.85rem", color: C.muted, textAlign: "center", padding: "1rem" }}>{ocultarCubiertos && (kwData.sinCubrir || []).length > 0 ? "Todas las keywords sin cubrir ya tienen artículo. Desactiva el filtro para verlas." : "Todas las categorías del catálogo tienen contenido"}</div>}
          </div>
        )}

        {/* ── Tab: Sugeridas (Prestashop) ── */}
        {tab === "sugeridas" && kwData?.resumen && !kwLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {visibleList(kwData.sugeridas).map((item, i) => <KWCardPS key={item.keyword || i} item={item} bg={C.blueLight} borderColor={C.blueBorder} hoverColor={C.blue} />)}
            {visibleList(kwData.sugeridas).length === 0 && <div style={{ fontSize: "0.85rem", color: C.muted, textAlign: "center", padding: "1rem" }}>{ocultarCubiertos && (kwData.sugeridas || []).length > 0 ? "Todas las sugerencias ya están cubiertas. Desactiva el filtro para verlas." : "No hay sugerencias adicionales"}</div>}
          </div>
        )}

        {/* ── Tab: Artículos a revisar (GSC) ── */}
        {tab === "articulos" && gscData && !gscLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {(gscData.articulosActualizar || []).map((item, i) => (
              <div key={item.url || i} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.85rem 1rem" }}>
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

        {/* ── Tab: Verificar keyword ── */}
        {tab === "verificar" && (
          <div>
            {/* ── Sync section ── */}
            <div style={{ background: C.light, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: C.dark }}>Base de datos del blog</span>
                {syncMeta?.lastSync && (
                  <span style={{ fontSize: "0.72rem", color: C.muted }}>
                    {syncMeta.count} posts · {new Date(syncMeta.lastSync).toLocaleDateString("es-ES")}
                  </span>
                )}
                {syncResult?.synced !== undefined && (
                  <span style={{ fontSize: "0.72rem", color: C.green, fontWeight: 700 }}>
                    ✓ {syncResult.synced} posts sincronizados
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.78rem", color: C.muted, marginBottom: "0.65rem", lineHeight: 1.4 }}>
                Sincroniza todos los posts publicados de WordPress para que el verificador conozca el blog completo.
                {!syncMeta?.lastSync && <span style={{ color: C.orange, fontWeight: 600 }}> Sin sincronizar todavía.</span>}
              </div>
              <button onClick={handleSync} disabled={syncLoading}
                style={{ background: syncLoading ? C.muted : C.dark, color: "#FFF", border: "none", borderRadius: 7, padding: "0.5rem 1rem", fontSize: "0.8rem", cursor: syncLoading ? "default" : "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", transition: "background 0.15s" }}>
                {syncLoading ? "Sincronizando..." : "↻ Sincronizar blog de WordPress"}
              </button>
              {syncResult?.error && <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: C.red }}>⚠ {syncResult.error}</div>}
            </div>

            {/* ── Keyword check input ── */}
            <div style={{ marginBottom: "0.85rem" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.dark, marginBottom: "0.5rem" }}>Verificar disponibilidad de keyword</div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={checkKw}
                  onChange={e => setCheckKw(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCheckKeyword()}
                  placeholder="ej: azulejos para baño pequeño"
                  style={{ flex: 1, background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 8, padding: "0.55rem 0.85rem", fontSize: "0.88rem", color: C.dark, outline: "none", fontFamily: "inherit" }}
                />
                <button onClick={handleCheckKeyword} disabled={checkLoading || !checkKw.trim()}
                  style={{ background: checkLoading ? C.muted : C.red, color: "#FFF", border: "none", borderRadius: 8, padding: "0.55rem 1.1rem", fontSize: "0.85rem", cursor: (checkLoading || !checkKw.trim()) ? "default" : "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", transition: "background 0.15s" }}>
                  {checkLoading ? "..." : "Verificar"}
                </button>
              </div>
            </div>

            {/* ── Result ── */}
            {checkResult && !checkResult.error && (
              <div>
                {checkResult.available ? (
                  <div style={{ background: C.greenLight, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "0.85rem 1rem" }}>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.green, marginBottom: "0.25rem" }}>✓ Keyword disponible</div>
                    <div style={{ fontSize: "0.82rem", color: C.mid }}>No se ha encontrado ningún artículo publicado sobre <strong>"{checkResult.keyword}"</strong>. Puedes proceder a escribir.</div>
                    <button onClick={() => onSelectTopic({ tema: `Guía completa de ${checkResult.keyword}`, keywords: checkResult.keyword })}
                      style={{ marginTop: "0.65rem", background: C.green, color: "#FFF", border: "none", borderRadius: 7, padding: "0.45rem 1rem", fontSize: "0.8rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      → Usar esta keyword
                    </button>
                  </div>
                ) : (
                  <div style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: "0.85rem 1rem" }}>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.red, marginBottom: "0.35rem" }}>⚠ Keyword ya cubierta — riesgo de canibalización</div>
                    <div style={{ fontSize: "0.82rem", color: C.mid, marginBottom: "0.65rem" }}>Se encontraron {checkResult.conflicts.length} artículo(s) relacionados con <strong>"{checkResult.keyword}"</strong>:</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {checkResult.conflicts.map((c, i) => (
                        <div key={i} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0.65rem 0.85rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: C.dark, lineHeight: 1.35 }}>{c.title}</span>
                            <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }}>
                              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: 5, background: c.source === "wordpress" ? "#EFF6FF" : C.redLight, color: c.source === "wordpress" ? C.blue : C.red, border: `1px solid ${c.source === "wordpress" ? C.blueBorder : C.redBorder}` }}>{c.source === "wordpress" ? "WP" : "KV"}</span>
                              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: 5, background: C.orangeLight, color: C.orange }}>{c.matchType}</span>
                            </div>
                          </div>
                          {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.78rem", color: C.red, textDecoration: "none", fontWeight: 600, marginTop: "0.25rem", display: "inline-block" }}>Ver artículo →</a>}
                          {c.date && <span style={{ fontSize: "0.72rem", color: C.muted, marginLeft: c.url ? "0.75rem" : 0 }}>{c.date}</span>}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: C.mid, lineHeight: 1.5 }}>
                      Opciones: <strong>actualizar el artículo existente</strong>, o bien buscar un enfoque más específico (long-tail diferenciado) para evitar la canibalización.
                    </div>
                  </div>
                )}
              </div>
            )}
            {checkResult?.error && (
              <div style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: "0.75rem", fontSize: "0.85rem", color: C.red }}>⚠ {checkResult.error}</div>
            )}
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
