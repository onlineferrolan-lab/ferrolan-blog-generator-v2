// Conmutadores de tema (claro/oscuro) y proveedor de IA (Claude/ChatGPT).

export function ThemeToggle({ isDark, onToggle }) {
  return (
    <button onClick={onToggle} title={isDark ? "Modo claro" : "Modo oscuro"} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: isDark ? "#374151" : "#E5E7EB", position: "relative", transition: "background 0.25s ease", flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", position: "absolute", top: 3, left: isDark ? 23 : 3, transition: "left 0.25s ease", background: isDark ? "#F59E0B" : "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem" }}>{isDark ? "☀" : "🌙"}</div>
    </button>
  );
}

export function ProviderToggle({ provider, onToggle, C }) {
  const isOpenAI = provider === "openai";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "3px 4px" }}>
      <button
        onClick={() => onToggle("anthropic")}
        title="Usar Claude (Anthropic)"
        style={{ padding: "3px 11px", borderRadius: 16, border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.04em", background: !isOpenAI ? C.red : "transparent", color: !isOpenAI ? "#fff" : C.muted, transition: "all 0.2s" }}
      >Claude</button>
      <button
        onClick={() => onToggle("openai")}
        title="Usar ChatGPT (OpenAI)"
        style={{ padding: "3px 11px", borderRadius: 16, border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.04em", background: isOpenAI ? "#10A37F" : "transparent", color: isOpenAI ? "#fff" : C.muted, transition: "all 0.2s" }}
      >ChatGPT</button>
    </div>
  );
}
