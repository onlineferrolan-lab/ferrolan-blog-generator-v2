// ─── lib/edge-auth.js ────────────────────────────────────────────────────────
// Lógica de autenticación compartida entre middleware.js (Edge Runtime) y los
// tests. Solo usa APIs disponibles en Edge (Web Crypto) — nada de Node crypto.

// Rutas accesibles sin cookie de sesión:
// - /login y /api/auth: el propio flujo de login.
// - /api/cron/: invocadas por Vercel Cron (sin cookie); su handler exige
//   CRON_SECRET de forma obligatoria (ver pages/api/cron/publish.js).
export const PUBLIC_PATHS = ["/login", "/api/auth", "/api/cron/"];

// Alcance mínimo del token de servicio de Quique. No da acceso a publicación,
// programación, imágenes, investigación de pago ni administración.
export const AGENT_API_PATHS = new Set([
  "/api/check-keyword",
  "/api/generate",
  "/api/sync-blog-posts",
]);

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

export function isAgentPath(pathname) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  return AGENT_API_PATHS.has(normalized);
}

export function verifyAgentRequest(pathname, authHeader, agentToken) {
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return { present: false };
  }
  if (!isAgentPath(pathname)) {
    return { present: true, ok: false, status: 403, error: "Ruta no permitida para el token de agente" };
  }
  if (!agentToken || agentToken.length < 32) {
    return { present: true, ok: false, status: 503, error: "AGENT_TOKEN no configurado correctamente" };
  }
  const supplied = authHeader.slice(7).trim();
  if (!timingSafeEqualStr(supplied, agentToken)) {
    return { present: true, ok: false, status: 401, error: "Token de agente no válido" };
  }
  return { present: true, ok: true };
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
