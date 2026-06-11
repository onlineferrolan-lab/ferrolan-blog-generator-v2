// Render del artículo markdown como React (preview con estilos de marca).
// BlockRenderer pinta un bloque (incluyendo imágenes inline del drag & drop);
// DroppableArticle añade zonas de drop entre secciones H2 para las imágenes.

import { useState } from "react";
import { splitBlocks } from "../lib/article-editor";

// Negrita + enlaces internos (con dominio para que el preview sea navegable)
function parseInline(text, C) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="https://ferrolan.es$2" style="color:${C.red};text-decoration:underline;font-weight:600" target="_blank">$1</a>`);
}

export function BlockRenderer({ block, C }) {
  const lines = block.split("\n");
  const elements = [];
  let listItems = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={`ul-${key++}`} style={{ margin: "0.8em 0 1.2em 1.6em", padding: 0 }}>{listItems.map((item, i) => (<li key={i} style={{ marginBottom: "0.5em", lineHeight: 1.75, color: C.mid, fontSize: "1.02rem" }} dangerouslySetInnerHTML={{ __html: item }} />))}</ul>);
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    // Inline image from drag & drop: ![desc](src)
    const imgMatch = line.match(/^!\[([^\]]*)\]\((.+)\)$/);
    if (imgMatch) {
      flushList();
      elements.push(
        <div key={`img-${i}`} style={{ margin: "1.5rem 0", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
          <img src={imgMatch[2]} alt={imgMatch[1]} style={{ width: "100%", display: "block", maxHeight: "420px", objectFit: "cover" }} />
          {imgMatch[1] && <div style={{ padding: "0.5rem 0.85rem", fontSize: "0.82rem", color: C.muted, fontStyle: "italic", background: C.light }}>{imgMatch[1]}</div>}
        </div>
      );
    } else if (line.startsWith("# ")) { flushList(); elements.push(<h1 key={i} style={{ fontSize: "1.7rem", fontWeight: 700, color: C.dark, fontFamily: "'Oswald', sans-serif", lineHeight: 1.2, margin: "0 0 1.2rem", borderLeft: `4px solid ${C.red}`, paddingLeft: "1rem" }}>{line.slice(2)}</h1>); }
    else if (line.startsWith("## ")) { flushList(); elements.push(<h2 key={i} style={{ fontSize: "1.2rem", fontWeight: 700, color: C.dark, fontFamily: "'Oswald', sans-serif", margin: "2em 0 0.7em", textTransform: "uppercase", letterSpacing: "0.04em" }}><span style={{ color: C.red, marginRight: "0.5rem" }}>▸</span>{line.slice(3)}</h2>); }
    else if (line.startsWith("### ")) { flushList(); elements.push(<h3 key={i} style={{ fontSize: "1rem", fontWeight: 700, color: C.mid, margin: "1.2em 0 0.4em", textTransform: "uppercase", letterSpacing: "0.05em" }}>{line.slice(4)}</h3>); }
    else if (line.startsWith("- ")) { listItems.push(parseInline(line.slice(2), C)); }
    else if (line === "---") { flushList(); elements.push(<hr key={i} style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "2.2em 0" }} />); }
    else if (line.trim() === "") { flushList(); elements.push(<div key={i} style={{ height: "0.5em" }} />); }
    else { flushList(); elements.push(<p key={i} style={{ lineHeight: 1.8, color: C.mid, margin: "0 0 0.85em", fontSize: "1.02rem" }} dangerouslySetInnerHTML={{ __html: parseInline(line, C) }} />); }
  });

  flushList();
  return <div>{elements}</div>;
}

export function DroppableArticle({ articulo, onInsertImage, C }) {
  const [dropHighlight, setDropHighlight] = useState(null);

  const blocks = splitBlocks(articulo);

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    setDropHighlight(idx);
  };
  const handleDragLeave = () => setDropHighlight(null);
  const handleDrop = (e, afterBlockIdx) => {
    e.preventDefault();
    setDropHighlight(null);
    onInsertImage(afterBlockIdx);
  };

  return (
    <div>
      {blocks.map((block, i) => (
        <div key={i}>
          <BlockRenderer block={block} C={C} />
          {/* Drop zone after each block */}
          <div
            onDragOver={e => handleDragOver(e, i)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, i)}
            style={{
              height: dropHighlight === i ? "56px" : "12px",
              margin: "0 0 0",
              borderRadius: 8,
              border: dropHighlight === i ? `2px dashed ${C.blue}` : "2px dashed transparent",
              background: dropHighlight === i ? C.blueLight : "transparent",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}>
            {dropHighlight === i && (
              <span style={{ fontSize: "0.8rem", color: C.blue, fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", pointerEvents: "none" }}>
                ⊕ Insertar imagen aquí
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
