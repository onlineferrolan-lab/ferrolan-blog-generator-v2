// ─── pages/index.js — Dashboard del generador de blog ───────────────────────
// Componente orquestador: estado del artículo en curso + composición de los
// paneles. La lógica reutilizable vive en lib/ (markdown, edición de artículo,
// ejemplos GSC), los paneles en components/ y los datos de servidor en
// hooks/useDashboardData (SWR).

import { useState, useEffect, useMemo } from "react";
import Head from "next/head";

import { LIGHT, DARK_THEME, CATEGORIAS, TONOS } from "../lib/theme";
import { markdownToPreviewHtml } from "../lib/markdown-preview";
import { EJEMPLOS_FALLBACK, generateExamplesFromGSC } from "../lib/gsc-examples";
import {
  insertImageAfterBlock,
  insertElementsInArticle,
  applyInternalLink,
  applyTitle,
} from "../lib/article-editor";

import { ThemeToggle, ProviderToggle } from "../components/Toggles";
import { DroppableArticle } from "../components/ArticleRenderer";
import { ImagePalette } from "../components/ImagePalette";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { OpportunitiesPanel } from "../components/OpportunitiesPanel";
import { EvergreenPanel } from "../components/EvergreenPanel";
import { SavedArticlesPanel } from "../components/SavedArticlesPanel";
import { ScheduledList } from "../components/ScheduledList";
import { SEOPanel } from "../components/SEOPanel";
import { EnhancePanel } from "../components/EnhancePanel";
import { EditorialCalendar } from "../components/EditorialCalendar";
import { PerformancePanel } from "../components/PerformancePanel";

import {
  useGSC,
  useArticles,
  useScheduled,
  useNextSlot,
  useSyncMeta,
  useEvergreen,
  usePsCategories,
  useWpCategories,
  useKeywordsData,
  usePerformance,
} from "../hooks/useDashboardData";

export default function Home() {
  // ── Formulario ──
  const [tema, setTema] = useState("");
  const [categoria, setCategoria] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tono, setTono] = useState(TONOS[0]);
  const [publico, setPublico] = useState("General");
  const [longitud, setLongitud] = useState("Estándar");
  const [intencion, setIntencion] = useState("Informativa");
  const [contexto, setContexto] = useState("");
  const [psCategoria, setPsCategoria] = useState(""); // "Nombre|https://url"

  // ── Artículo en curso ──
  const [articulo, setArticulo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [view, setView] = useState("panels"); // "panels" | "article"

  // ── Research ──
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [includeResearch, setIncludeResearch] = useState(true);
  const [researchExpanded, setResearchExpanded] = useState(true);

  // ── Imágenes ──
  const [imagenes, setImagenes] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [draggedImg, setDraggedImg] = useState(null);
  const [imageError, setImageError] = useState("");

  // ── UI ──
  const [isDark, setIsDark] = useState(true);
  const [provider, setProvider] = useState("anthropic");
  const [ejemplos, setEjemplos] = useState(EJEMPLOS_FALLBACK);

  // ── Guardar / programar / publicar ──
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [scheduleResult, setScheduleResult] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [wpCategoryId, setWpCategoryId] = useState("");

  // ── Agentes (enhance) ──
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceResult, setEnhanceResult] = useState(null);
  const [fixingKeywords, setFixingKeywords] = useState(false);

  // ── Coste de la última generación (tokens + USD estimado) ──
  const [genUsage, setGenUsage] = useState(null);

  // ── Datos de servidor (SWR) ──
  const { gscData, gscLoading, gscError, refreshGSC } = useGSC();
  const { savedArticles, refreshArticles } = useArticles();
  const { scheduledArticles, refreshScheduled } = useScheduled();
  const { nextSlot, refreshNextSlot } = useNextSlot();
  const { syncMeta } = useSyncMeta();
  const { evergreenData, evergreenLoading, refreshEvergreen } = useEvergreen();
  const { psCategories } = usePsCategories();
  const { wpCategories } = useWpCategories();
  const { kwData, kwLoading, fetchKeywords } = useKeywordsData();
  const { performanceData, performanceLoading, refreshPerformance } = usePerformance();

  const C = isDark ? DARK_THEME : LIGHT;

  // Ideas de ejemplo derivadas de GSC (se regeneran al llegar los datos)
  useEffect(() => {
    if (gscData) setEjemplos(generateExamplesFromGSC(gscData));
  }, [gscData]);

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
        body: JSON.stringify({ tema, categoria, keywords, contexto, provider, ...(psCategoria ? { nombreCategoriaPrestashop: psCategoria.split("|")[0], urlCategoriaPrestashop: psCategoria.split("|")[1] } : {}) }),
      });
      const data = await res.json();
      if (data.error) setResearchError(data.error);
      else { setResearchData(data); setResearchExpanded(true); }
    } catch { setResearchError("Error de conexión al investigar."); }
    setResearchLoading(false);
  };

  // Generación en streaming (SSE): el artículo se pinta según Claude escribe.
  // En cuanto llega el primer fragmento se salta a la vista de artículo.
  const generarArticulo = async () => {
    if (!tema || !categoria) { setError("Por favor, rellena el tema y la categoría."); return; }
    setError(""); setLoading(true); setArticulo(""); setImagenes([]); setImageError(""); setSaveSuccess(false); setPublishResult(null); setScheduleSuccess(false); setScheduleResult(null); setEnhanceResult(null); setGenUsage(null);
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        tema, categoria, keywords, tono, contexto, publico, longitud, intencion, provider, stream: true,
        ...(psCategoria ? { nombreCategoriaPrestashop: psCategoria.split("|")[0], urlCategoriaPrestashop: psCategoria.split("|")[1] } : {}),
        ...(includeResearch && researchData ? { researchData } : {}),
      }) });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Error al generar el artículo.");
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let firstChunk = true;
      let streamError = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop(); // el último puede estar incompleto
        for (const block of blocks) {
          const line = block.trim();
          if (!line.startsWith("data:")) continue;
          let payload;
          try { payload = JSON.parse(line.slice(5)); } catch { continue; }
          if (payload.delta) {
            acc += payload.delta;
            if (firstChunk) {
              setActiveTab("preview");
              setView("article");
              setLoading(false);
              firstChunk = false;
            }
            setArticulo(acc);
          } else if (payload.done) {
            if (payload.usage) setGenUsage({ ...payload.usage, cost: payload.cost });
          } else if (payload.error) {
            streamError = payload.error;
          }
        }
      }

      if (streamError) setError(streamError);
      else if (!acc) setError("Error al generar el artículo. Inténtalo de nuevo.");
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
        refreshArticles();
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch { setError("Error al guardar el artículo."); }
    setSaving(false);
  };

  // Generación de imágenes en dos fases: primero los prompts (rápido) y
  // después cada imagen en su propia request — van apareciendo según terminan
  // y ninguna request roza el timeout del servidor.
  const generarImagenes = async () => {
    if (!articulo) return;
    setLoadingImages(true); setImagenes([]); setImageError("");
    try {
      const pRes = await fetch("/api/generate-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "prompts", tema, categoria, articleText: articulo }) });
      const pData = await pRes.json();
      if (!pData.prompts?.length) {
        setImageError(pData.error || "No se pudieron generar los prompts de imagen.");
        setLoadingImages(false);
        return;
      }

      const results = await Promise.allSettled(pData.prompts.map(async (p) => {
        const r = await fetch("/api/generate-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "image", prompt: p.prompt }) });
        const d = await r.json();
        if (!d.src) throw new Error(d.error || "Error generando la imagen");
        const img = { src: d.src, descripcion: p.descripcion, prompt: p.prompt, tipo: p.tipo };
        setImagenes(prev => [...prev, img]);
        return img;
      }));

      const ok = results.filter(r => r.status === "fulfilled").length;
      if (ok === 0) setImageError("Error generando las imágenes. Inténtalo de nuevo.");
      else if (ok < pData.prompts.length) setImageError(`Se generaron ${ok} de ${pData.prompts.length} imágenes.`);
    } catch { setImageError("Error de conexión al generar imágenes."); }
    setLoadingImages(false);
  };

  const potenciarConAgentes = async () => {
    if (!articulo) return;
    setEnhancing(true); setEnhanceResult(null);
    try {
      const res = await fetch("/api/enhance-article", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articulo, tema, keywords, categoria, provider }),
      });
      const data = await res.json();
      setEnhanceResult(data);
    } catch { /* silent */ }
    setEnhancing(false);
  };

  // Aplica los elementos CRO/Landing seleccionados (funciones puras encadenadas)
  const aplicarSeleccionados = (elements, selectedSet) => {
    const toApply = (elements || []).filter(el => selectedSet.has(el.id));
    if (!toApply.length) return;
    setArticulo(insertElementsInArticle(articulo, toApply));
  };

  const handleFixKeywords = async () => {
    if (!articulo || !enhanceResult?.keywords) return;
    setFixingKeywords(true);
    try {
      const res = await fetch("/api/fix-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articulo, tema, keywords, keywordAnalysis: enhanceResult.keywords, provider }),
      });
      const data = await res.json();
      if (!data.articulo) return;
      setArticulo(data.articulo);
      // Re-analizar con el artículo corregido para refrescar ubicaciones y score
      const kwRes = await fetch("/api/keyword-mapper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articulo: data.articulo, tema, keywords, provider }),
      });
      const kwAnalysis = await kwRes.json();
      if (!kwAnalysis.error) setEnhanceResult(prev => ({ ...prev, keywords: kwAnalysis }));
    } catch (e) {
      console.error("fix-keywords error:", e);
    } finally {
      setFixingKeywords(false);
    }
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
        refreshArticles();
        refreshScheduled();
        refreshNextSlot();
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
        body: JSON.stringify({ tema, categoria, keywords, tono, articulo, wpCategoryId: wpCategoryId || undefined }),
      });
      const data = await res.json();
      if (data.published) {
        setPublishResult(data);
        refreshArticles();
        setTimeout(() => setPublishResult(null), 10000);
      } else {
        setError(data.error || "Error al subir borrador a WordPress.");
      }
    } catch { setError("Error de conexión al publicar."); }
    setPublishing(false);
  };

  // Inserta la imagen arrastrada tras el bloque indicado (función pura)
  const insertImageAtBlock = (afterBlockIdx) => {
    if (draggedImg === null || !imagenes[draggedImg]) return;
    setArticulo(insertImageAfterBlock(articulo, imagenes[draggedImg], afterBlockIdx));
    setDraggedImg(null);
  };

  const articuloHtml = useMemo(() => articulo ? markdownToPreviewHtml(articulo) : "", [articulo]);

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
          .bottom-row { grid-template-columns: 1fr !important; }
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
          <ProviderToggle provider={provider} onToggle={setProvider} C={C} />
          <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
        </div>
      </header>

      <div style={{ background: C.red, padding: "0.45rem 2.5rem" }}>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.78rem", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>Blog · {provider === "openai" ? "ChatGPT (gpt-4o)" : "Claude AI"} + OpenAI Images · GSC + Keywords Prestashop</p>
      </div>

      {/* ═══  VIEW: PANELS (dashboard principal)  ═══ */}
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
              <div>
                <label style={labelStyle}>Categoría de producto <span style={{ color: C.muted, fontWeight: 400, textTransform: "none", fontSize: "0.78rem" }}>(opcional)</span></label>
                <select value={psCategoria} onChange={e => setPsCategoria(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }} disabled={psCategories.length === 0}>
                  <option value="">Sin categoría de producto...</option>
                  {psCategories.map(parent => parent.children?.length > 0 ? (
                    <optgroup key={parent.id} label={parent.name}>
                      <option value={`${parent.name}|${parent.url}`}>{parent.name}</option>
                      {parent.children.map(child => <option key={child.id} value={`${child.name}|${child.url}`}>&nbsp;&nbsp;{child.name}</option>)}
                    </optgroup>
                  ) : (
                    <option key={parent.id} value={`${parent.name}|${parent.url}`}>{parent.name}</option>
                  ))}
                </select>
                {psCategoria && <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: "0.25rem" }}>{psCategoria.split("|")[1]}</div>}
              </div>
              <div><label style={labelStyle}>Keywords SEO <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.78rem", color: C.muted }}>(opcional)</span></label><input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Ej: suelo porcelánico, exterior" style={inputStyle} /></div>
              <div><label style={labelStyle}>Tono</label><div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>{TONOS.map(t => <button key={t} onClick={() => setTono(t)} style={{ padding: "0.4rem 0.75rem", borderRadius: 8, border: tono === t ? `2px solid ${C.red}` : `1px solid ${C.border}`, background: tono === t ? C.redLight : C.cardBg, color: tono === t ? C.red : C.mid, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", fontWeight: tono === t ? 700 : 500 }}>{t}</button>)}</div></div>
              <div><label style={labelStyle}>Público objetivo</label><div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>{["General", "Particulares / DIY", "Profesionales", "Arquitectos"].map(p => (<button key={p} onClick={() => setPublico(p)} style={{ padding: "0.4rem 0.75rem", borderRadius: 8, border: publico === p ? `2px solid ${C.red}` : `1px solid ${C.border}`, background: publico === p ? C.redLight : C.cardBg, color: publico === p ? C.red : C.mid, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", fontWeight: publico === p ? 700 : 500 }}>{p}</button>))}</div></div>
              <div><label style={labelStyle}>Longitud objetivo</label><div style={{ display: "flex", gap: "0.35rem" }}>{[["Corto", "~600 pal"], ["Estándar", "~900 pal"], ["Largo", "~1200 pal"]].map(([l, hint]) => (<button key={l} onClick={() => setLongitud(l)} style={{ flex: 1, padding: "0.4rem 0.5rem", borderRadius: 8, border: longitud === l ? `2px solid ${C.red}` : `1px solid ${C.border}`, background: longitud === l ? C.redLight : C.cardBg, color: longitud === l ? C.red : C.mid, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", fontWeight: longitud === l ? 700 : 500, textAlign: "center", lineHeight: 1.25 }}><div style={{ fontWeight: 700 }}>{l}</div><div style={{ fontSize: "0.62rem", opacity: 0.65 }}>{hint}</div></button>))}</div></div>
              <div><label style={labelStyle}>Intención de búsqueda</label><div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>{["Informativa", "Comparativa", "Transaccional", "Guía técnica"].map(it => (<button key={it} onClick={() => setIntencion(it)} style={{ padding: "0.4rem 0.75rem", borderRadius: 8, border: intencion === it ? `2px solid ${C.red}` : `1px solid ${C.border}`, background: intencion === it ? C.redLight : C.cardBg, color: intencion === it ? C.red : C.mid, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", fontWeight: intencion === it ? 700 : 500 }}>{it}</button>))}</div></div>
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
                    {/* Keyword check banner */}
                    {researchData.keywordCheck && !researchData.keywordCheck.available && researchData.keywordCheck.conflicts?.length > 0 && (
                      <div style={{ marginBottom: "0.75rem", padding: "0.65rem 0.85rem", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: "0.82rem" }}>
                        <div style={{ fontWeight: 700, color: C.red, marginBottom: "0.3rem" }}>⚠ Keyword ya cubierta — posible canibalización</div>
                        {researchData.keywordCheck.conflicts.slice(0, 3).map((c, i) => (
                          <div key={i} style={{ color: C.mid, lineHeight: 1.4 }}>
                            · <strong>{c.title}</strong> <span style={{ fontSize: "0.72rem", color: C.muted }}>({c.source} · {c.matchType})</span>
                            {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "0.4rem", color: C.red, fontWeight: 600, textDecoration: "none" }}>→</a>}
                          </div>
                        ))}
                      </div>
                    )}
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
          <SavedArticlesPanel articles={savedArticles} C={C} />

          {/* Scheduled articles */}
          <ScheduledList scheduledArticles={scheduledArticles} C={C} />
        </div>

        {/* ─── CENTER: OPPORTUNITIES ─── */}
        <div className="gsc-sticky" style={{ position: "sticky", top: "1.5rem", alignSelf: "start", maxHeight: "calc(100vh - 3rem)", overflowY: "auto" }}>
          <OpportunitiesPanel
            gscData={gscData} gscLoading={gscLoading} gscError={gscError} onRefreshGSC={refreshGSC}
            kwData={kwData} kwLoading={kwLoading} onRefreshKW={() => fetchKeywords(true)}
            onSelectTopic={handleSelectTopic} syncMeta={syncMeta} C={C}
          />
        </div>

        {/* ─── RIGHT: EVERGREEN ─── */}
        <div className="evergreen-sticky" style={{ position: "sticky", top: "1.5rem", alignSelf: "start", maxHeight: "calc(100vh - 3rem)", overflowY: "auto" }}>
          <EvergreenPanel
            data={evergreenData} loading={evergreenLoading} onRefresh={refreshEvergreen}
            onSelectTopic={handleSelectTopic} C={C}
          />
        </div>

        {/* ─── FILA INFERIOR: Calendario editorial + Rendimiento ─── */}
        <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }} className="bottom-row">
          <EditorialCalendar scheduledArticles={scheduledArticles} savedArticles={savedArticles} C={C} />
          <PerformancePanel data={performanceData} loading={performanceLoading} onRefresh={refreshPerformance} C={C} />
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

      {/* ═══  VIEW: ARTICLE (editor a pantalla completa)  ═══ */}
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
            {genUsage && (
              <span title={`Modelo: ${genUsage.model}\nInput: ${genUsage.inputTokens} tokens (caché: ${genUsage.cacheReadTokens || 0} leídos, ${genUsage.cacheWriteTokens || 0} escritos)\nOutput: ${genUsage.outputTokens} tokens`}
                style={{ fontSize: "0.72rem", fontWeight: 700, color: C.green, background: `${C.green}15`, padding: "0.15rem 0.5rem", borderRadius: 5, border: `1px solid ${C.green}30`, cursor: "help" }}>
                {genUsage.cost != null ? `≈ $${genUsage.cost.toFixed(3)}` : `${genUsage.outputTokens} tok`}
                {(genUsage.cacheReadTokens || 0) > 0 ? " · caché ✓" : ""}
              </span>
            )}
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
                  ? <DroppableArticle articulo={articulo} onInsertImage={insertImageAtBlock} C={C} />
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
                    style={{ background: "#059669", color: "#FFF", border: "none", borderRadius: 8, padding: "0.55rem 1.2rem", fontSize: "0.85rem", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "0.4rem" }}
                    onMouseOver={e => !saving && !saveSuccess && (e.currentTarget.style.background = "#047857")}
                    onMouseOut={e => !saving && !saveSuccess && (e.currentTarget.style.background = "#059669")}>
                    {saveSuccess ? <span className="save-check">✓ Guardado</span> : saving ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "spin 0.85s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Guardando...</> : <>✦ Guardar</>}
                  </button>

                  <button onClick={() => setShowScheduler(!showScheduler)}
                    disabled={scheduleSuccess}
                    style={{ background: scheduleSuccess ? "#2563EB" : showScheduler ? C.blue : C.cardBg, color: scheduleSuccess ? "#FFF" : showScheduler ? "#FFF" : C.blue, border: `1px solid ${scheduleSuccess || showScheduler ? "transparent" : C.blue}`, borderRadius: 8, padding: "0.55rem 1.2rem", fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {scheduleSuccess ? <span className="save-check">✓ Programado</span> : <>📅 Programar</>}
                  </button>

                  {wpCategories.length > 0 && (
                    <select value={wpCategoryId} onChange={e => setWpCategoryId(e.target.value)}
                      style={{ background: C.cardBg, color: C.dark, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0.45rem 0.65rem", fontSize: "0.8rem", cursor: "pointer", maxWidth: 160 }}>
                      <option value="">Categoría WP</option>
                      {(() => {
                        const parents = wpCategories.filter(c => c.parent === 0);
                        const children = wpCategories.filter(c => c.parent !== 0);
                        return parents.flatMap(p => [
                          <option key={p.id} value={p.id}>{p.name}</option>,
                          ...children.filter(c => c.parent === p.id).map(c => (
                            <option key={c.id} value={c.id}>· {c.name}</option>
                          )),
                        ]);
                      })()}
                    </select>
                  )}
                  <button onClick={publicarEnWP} disabled={publishing || !!publishResult}
                    style={{ background: publishResult ? "#DC2626" : publishing ? "#991B1B" : C.red, color: "#FFF", border: "none", borderRadius: 8, padding: "0.55rem 1.2rem", fontSize: "0.85rem", cursor: publishing ? "not-allowed" : "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "0.4rem" }}
                    onMouseOver={e => !publishing && !publishResult && (e.currentTarget.style.background = C.redDark)}
                    onMouseOut={e => !publishing && !publishResult && (e.currentTarget.style.background = C.red)}>
                    {publishResult ? <span className="save-check">✓ Borrador en WP</span> : publishing ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "spin 0.85s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Subiendo...</> : <>📝 Borrador WP</>}
                  </button>

                  <button onClick={potenciarConAgentes} disabled={enhancing}
                    style={{ background: enhancing ? "#5B21B6" : "linear-gradient(135deg,#7C3AED,#4F46E5)", color: "#FFF", border: "none", borderRadius: 8, padding: "0.55rem 1.2rem", fontSize: "0.85rem", cursor: enhancing ? "not-allowed" : "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "0.4rem", opacity: enhancing ? 0.75 : 1 }}>
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
            <EnhancePanel
              enhanceResult={enhanceResult}
              fixingKeywords={fixingKeywords}
              onFixKeywords={handleFixKeywords}
              onApplyLink={(sentence) => setArticulo(applyInternalLink(articulo, sentence))}
              onApplyTitle={(title) => setArticulo(applyTitle(articulo, title))}
              onApplyElements={aplicarSeleccionados}
              C={C}
            />

            {imageError && <div style={{ marginTop: "0.85rem", background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: "0.65rem 1.1rem", color: C.red, fontSize: "0.9rem", fontWeight: 600 }}>⚠ {imageError}</div>}
            <ImagePalette imagenes={imagenes} loadingImages={loadingImages} onGenerate={generarImagenes} hasArticle={!!articulo} onDragStart={setDraggedImg} C={C} />
          </div>

          {/* ── Right sidebar: SEO ── */}
          <div style={{ position: "sticky", top: "1.5rem", alignSelf: "start", maxHeight: "calc(100vh - 3rem)", overflowY: "auto" }}>
            <SEOPanel articulo={articulo} tema={tema} keywords={keywords} provider={provider} C={C} />
          </div>
        </div>
      </div>
      )}
    </>
  );
}
