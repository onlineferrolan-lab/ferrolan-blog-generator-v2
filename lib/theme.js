// ─── lib/theme.js ────────────────────────────────────────────────────────────
// Paletas de color y constantes de UI compartidas por toda la app.
// Extraído de pages/index.js durante el troceo del monolito.

export const LIGHT = {
  red: "#E31E24", redDark: "#B71C1C", redLight: "#FEF2F2", redBorder: "#FECACA",
  dark: "#1A1A1A", mid: "#4A4A4A", light: "#F8F8F8",
  border: "#E5E5E5", white: "#FFFFFF", muted: "#999999",
  green: "#059669", greenLight: "#ECFDF5", greenBorder: "#A7F3D0",
  orange: "#D97706", orangeLight: "#FFFBEB",
  blue: "#2563EB", blueLight: "#EFF6FF", blueBorder: "#BFDBFE",
  panelHeader: "#2D2D2D", panelHeaderText: "#FFFFFF",
  bg: "#F3F3F3", cardBg: "#FFFFFF", inputBg: "#FFFFFF", inputBorder: "#E5E5E5",
};

export const DARK_THEME = {
  red: "#EF4444", redDark: "#DC2626", redLight: "#1C1517", redBorder: "#7F1D1D",
  dark: "#F1F1F1", mid: "#CCCCCC", light: "#1E1E1E",
  border: "#333333", white: "#171717", muted: "#777777",
  green: "#34D399", greenLight: "#0D1F17", greenBorder: "#065F46",
  orange: "#FBBF24", orangeLight: "#1C1A0E",
  blue: "#60A5FA", blueLight: "#0F172A", blueBorder: "#1E3A5F",
  panelHeader: "#111111", panelHeaderText: "#F1F1F1",
  bg: "#0F0F0F", cardBg: "#171717", inputBg: "#1E1E1E", inputBorder: "#333333",
};

export const CATEGORIAS = [
  { group: "Inspiración e ideas", items: ["Baño", "Cocinas", "Cerámica y parquet", "Espacios exteriores"] },
  { group: "Aprende con nosotros", items: ["Consejos", "Guía paso a paso", "Soluciones constructivas"] },
  { group: "Noticias", items: ["Nuevos productos", "Sector", "Eventos"] },
];

export const TONOS = [
  "Informativo / Educativo",
  "Inspiracional / Tendencias",
  "Técnico / Profesional",
  "Guía práctica paso a paso",
];
