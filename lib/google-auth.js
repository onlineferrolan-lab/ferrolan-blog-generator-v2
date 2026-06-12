// ─── lib/google-auth.js ──────────────────────────────────────────────────────
// JWT de Google Service Account compartido. Sustituye a las 3 implementaciones
// que había duplicadas en keywords-data.js, gsc-data.js y schedule-article.js.

import { google } from "googleapis";

export const SCOPES = {
  searchConsole: "https://www.googleapis.com/auth/webmasters.readonly",
  sheets: "https://www.googleapis.com/auth/spreadsheets",
};

/**
 * Crea el JWT de la Service Account con los scopes pedidos.
 * @param {string[]} scopes
 * @returns {import("googleapis").Auth.JWT | null} null si no hay credenciales
 */
export function getGoogleAuth(scopes) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return null;
  // La private key llega de la env var con los saltos escapados (\\n)
  return new google.auth.JWT(email, null, key.replace(/\\n/g, "\n"), scopes);
}
