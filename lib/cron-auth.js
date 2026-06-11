// ─── lib/cron-auth.js ────────────────────────────────────────────────────────
// Verificación de las invocaciones del cron de Vercel.
//
// El middleware deja pasar /api/cron/* sin cookie (Vercel Cron no puede
// enviarla), así que la única barrera es CRON_SECRET: por eso es OBLIGATORIO.
// Sin él configurado, el endpoint se niega a ejecutarse (fail-closed).

/**
 * @param {string|undefined} authHeader - header Authorization de la request
 * @param {string|undefined} cronSecret - process.env.CRON_SECRET
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
export function verifyCronRequest(authHeader, cronSecret) {
  if (!cronSecret) {
    return {
      ok: false,
      status: 503,
      error: "CRON_SECRET no configurado — el cron está deshabilitado por seguridad",
    };
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}
