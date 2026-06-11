// Editor markdown con panel dividido: textarea + preview en vivo.

import { useRef } from "react";
import { BlockRenderer } from "./ArticleRenderer";

export function MarkdownEditor({ value, onChange, C }) {
  const textareaRef = useRef(null);

  // Insert text at cursor position in textarea
  const insertAtCursor = (before, after = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const replacement = before + (selected || "texto") + after;
    const newValue = value.slice(0, start) + replacement + value.slice(end);
    onChange(newValue);
    // Restore cursor after React re-render
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + (selected || "texto").length);
    }, 0);
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  // Count sections (## headings)
  const sectionCount = (value.match(/^## /gm) || []).length;
  // Count internal links
  const linkCount = (value.match(/\[([^\]]+)\]\(\/[^)]+\)/g) || []).length;
  // Word count status
  const wordStatus = wordCount < 700 ? "short" : wordCount > 1100 ? "long" : "ok";
  const wordStatusColor = wordStatus === "ok" ? C.green : C.orange;
  const wordStatusLabel = wordStatus === "ok" ? "✓ En rango" : wordStatus === "short" ? "Corto" : "Largo";

  const toolbarBtn = (label, title, action) => (
    <button
      key={label}
      onClick={action}
      title={title}
      style={{
        background: "transparent",
        border: `1px solid ${C.border}`,
        borderRadius: 5,
        padding: "0.3rem 0.55rem",
        fontSize: "0.8rem",
        cursor: "pointer",
        color: C.mid,
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        fontWeight: 600,
        lineHeight: 1,
        transition: "all 0.12s",
      }}
      onMouseOver={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; e.currentTarget.style.background = C.redLight; }}
      onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.mid; e.currentTarget.style.background = "transparent"; }}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.6rem 0.85rem",
        background: C.light, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap",
      }}>
        {toolbarBtn("B", "Negrita (**texto**)", () => insertAtCursor("**", "**"))}
        {toolbarBtn("H2", "Encabezado H2", () => insertAtCursor("\n## ", "\n"))}
        {toolbarBtn("H3", "Encabezado H3", () => insertAtCursor("\n### ", "\n"))}
        {toolbarBtn("—", "Lista", () => insertAtCursor("\n- ", "\n"))}
        {toolbarBtn("🔗", "Enlace interno", () => insertAtCursor("[", "](/ruta)"))}
        {toolbarBtn("---", "Separador", () => insertAtCursor("\n\n---\n\n", ""))}

        <div style={{ flex: 1 }} />

        {/* Stats */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", fontSize: "0.72rem", color: C.muted, fontWeight: 600 }}>
          <span style={{ color: wordStatusColor, background: `${wordStatusColor}15`, padding: "0.15rem 0.45rem", borderRadius: 5 }}>
            {wordCount} pal · {wordStatusLabel}
          </span>
          <span>{sectionCount} H2</span>
          <span>{linkCount} link{linkCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Split pane */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "55vh", maxHeight: "65vh" }}>
        {/* Left: textarea */}
        <div style={{ borderRight: `1px solid ${C.border}`, position: "relative" }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              outline: "none",
              resize: "none",
              padding: "1.25rem 1.5rem",
              fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
              fontSize: "0.88rem",
              lineHeight: 1.75,
              color: C.dark,
              background: C.cardBg,
              boxSizing: "border-box",
              overflowY: "auto",
            }}
          />
          <div style={{
            position: "absolute", bottom: "0.5rem", left: "0.85rem",
            fontSize: "0.65rem", color: C.muted, fontWeight: 600, opacity: 0.5,
            pointerEvents: "none", fontFamily: "'Oswald', sans-serif",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            Markdown
          </div>
        </div>

        {/* Right: live preview */}
        <div style={{
          padding: "1.25rem 1.5rem",
          overflowY: "auto",
          background: C.light,
          maxHeight: "65vh",
        }}>
          <BlockRenderer block={value} C={C} />
        </div>
      </div>
    </div>
  );
}
