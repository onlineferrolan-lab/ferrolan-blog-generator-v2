import fs from "fs";
import path from "path";

// ─── Context Loader ───────────────────────────────────────────────────────────
// Lee los archivos de contexto de Ferrolan y los prepara para inyectarlos
// en los system prompts de los distintos endpoints de la API.
//
// Los archivos de contexto están en /context/ y definen:
//   - brand-voice.md       → Voz, tono y pilares de mensaje de Ferrolan
//   - seo-guidelines.md    → Reglas SEO que debe seguir todo el contenido
//   - internal-links-map.md → URLs exactas de ferrolan.es para enlazar
//   - style-guide.md       → Gramática, formato y convenciones editoriales

const CONTEXT_DIR = path.join(process.cwd(), "context");

function readContextFile(filename) {
  try {
    return fs.readFileSync(path.join(CONTEXT_DIR, filename), "utf-8");
  } catch {
    console.warn(`[context-loader] No se pudo leer ${filename}`);
    return "";
  }
}

// Carga los contextos necesarios para la generación de artículos.
// Se llama una vez por request — no hay caché en memoria para evitar
// problemas en entornos serverless (Vercel).
export function loadGenerationContext() {
  const brandVoice       = readContextFile("brand-voice.md");
  const seoGuidelines    = readContextFile("seo-guidelines.md");
  const internalLinksMap = readContextFile("internal-links-map.md");
  const styleGuide       = readContextFile("style-guide.md");

  return { brandVoice, seoGuidelines, internalLinksMap, styleGuide };
}

// Carga los contextos necesarios para el pipeline de agentes (enhance).
// Incluye también target-keywords y competitor-analysis.
export function loadAgentContext() {
  const base = loadGenerationContext();
  const targetKeywords    = readContextFile("target-keywords.md");
  const competitorAnalysis = readContextFile("competitor-analysis.md");

  return { ...base, targetKeywords, competitorAnalysis };
}

// Compone el bloque de contexto de marca para añadir al system prompt.
// Formato compacto para no disparar el uso de tokens.
export function buildContextBlock({ brandVoice, seoGuidelines, internalLinksMap, styleGuide }) {
  const sections = [];

  if (brandVoice) {
    sections.push(`## VOZ Y TONO DE FERROLAN\n${brandVoice}`);
  }
  if (styleGuide) {
    sections.push(`## GUÍA DE ESTILO EDITORIAL\n${styleGuide}`);
  }
  if (seoGuidelines) {
    sections.push(`## REGLAS SEO\n${seoGuidelines}`);
  }
  if (internalLinksMap) {
    sections.push(`## MAPA DE ENLACES INTERNOS (ferrolan.es)\n${internalLinksMap}`);
  }

  return sections.join("\n\n---\n\n");
}
