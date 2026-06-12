// Paleta de imágenes generadas por IA — miniaturas arrastrables al artículo.

export function ImagePalette({ imagenes, loadingImages, onGenerate, hasArticle, onDragStart, C }) {
  if (!hasArticle) return null;

  const TIPO_LABELS = { ambiente: "Ambiente", detalle: "Detalle", uso: "Uso real", inspiracion: "Inspiración", adicional: "Extra" };

  return (
    <div style={{ marginTop: "1.25rem", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ background: C.panelHeader, padding: "0.65rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.panelHeaderText} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span style={{ color: C.panelHeaderText, fontWeight: 700, fontSize: "0.82rem", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>Imágenes · arrastra al artículo</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {!loadingImages && imagenes.length === 0 && (
            <button onClick={onGenerate} style={{ background: C.red, color: "#FFF", border: "none", borderRadius: 6, padding: "0.35rem 0.9rem", fontSize: "0.78rem", cursor: "pointer", fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase" }}
              onMouseOver={e => e.currentTarget.style.background = C.redDark}
              onMouseOut={e => e.currentTarget.style.background = C.red}>Generar</button>
          )}
          {imagenes.length > 0 && (
            <button onClick={onGenerate} style={{ background: "rgba(255,255,255,0.08)", color: "#CCC", border: "none", borderRadius: 6, padding: "0.35rem 0.75rem", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}>↺ Regen.</button>
          )}
        </div>
      </div>

      <div style={{ padding: "1rem 1.25rem", maxHeight: "300px", overflowY: "auto" }}>
        {loadingImages && (
          <div style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.75rem" }} />
            <div style={{ color: C.dark, fontWeight: 700, fontFamily: "'Oswald', sans-serif", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Generando 4 imágenes...</div>
            <div style={{ color: C.muted, fontSize: "0.8rem" }}>Claude diseña los prompts · OpenAI las renderiza</div>
          </div>
        )}

        {!loadingImages && imagenes.length === 0 && (
          <div style={{ textAlign: "center", padding: "1.25rem 1rem", color: C.muted, fontSize: "0.88rem", lineHeight: 1.5 }}>
            Genera las imágenes y después <strong style={{ color: C.mid }}>arrástralas</strong> a la posición que quieras dentro del artículo
          </div>
        )}

        {imagenes.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
            {imagenes.map((img, i) => (
              <div key={i}
                draggable
                onDragStart={() => onDragStart(i)}
                style={{ cursor: "grab", userSelect: "none" }}>
                <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `2px solid ${C.border}`, transition: "border-color 0.15s" }}
                  onMouseOver={e => e.currentTarget.style.borderColor = C.red}
                  onMouseOut={e => e.currentTarget.style.borderColor = C.border}>
                  <img src={img.src} alt={img.descripcion} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.65))", padding: "0.4rem 0.35rem 0.3rem", fontSize: "0.6rem", color: "#FFF", fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {TIPO_LABELS[img.tipo] || `Img ${i + 1}`}
                  </div>
                  <div style={{ position: "absolute", top: "0.3rem", right: "0.3rem", background: "rgba(0,0,0,0.5)", color: "#FFF", borderRadius: 4, padding: "0.1rem 0.3rem", fontSize: "0.6rem", fontWeight: 700 }}>
                    ⠿
                  </div>
                </div>
                <a href={img.src} download={`ferrolan-img-${i + 1}.png`}
                  style={{ display: "block", textAlign: "center", marginTop: "0.3rem", fontSize: "0.65rem", color: C.muted, textDecoration: "none", fontWeight: 600 }}
                  onClick={e => e.stopPropagation()}>↓ DL</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
