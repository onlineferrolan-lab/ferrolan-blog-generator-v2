// ─── lib/edge-auth.js ────────────────────────────────────────────────────────
// Lógica de autenticación compartida entre middleware.js (Edge Runtime) y los
// tests. Solo usa APIs disponibles en Edge (Web Crypto) — nada de Node crypto.

// Rutas accesibles sin cookie de sesión:
// - /login y /api/auth: el propio flujo de login.
// - /api/cron/: invocadas por Vercel Cron (sin cookie); su handler exige
//   CRON_SECRET de forma obligatoria (ver pages/api/cron/publish.js).
export const PUBLIC_PATHS = ["/login", "/api/auth", "/api/cron/"];

export function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(png|jpg|jpeg|svg|ico|css|js|woff|woff2)$/.test(pathname)
  );
}

// Token de sesión: SHA-256(password + secret) en hex.
export async function computeToken(password, secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Comparación en tiempo constante para strings (evita timing attacks al
// comparar la cookie con el token esperado).
export function timingSafeEqualStr(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
