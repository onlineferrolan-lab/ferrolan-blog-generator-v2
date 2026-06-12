// ─── Cron: resumen quincenal de propuestas de artículo ──────────────────────
// Ejecutado por Vercel Cron los días 1 y 16 de cada mes (≈ cada 15 días, ver
// vercel.json). Genera un par de artículos propuestos + un informe de
// metadatos/keywords y los envía por email.
//
// Seguridad: el middleware deja pasar /api/cron/* sin cookie; este handler
// EXIGE el header "Authorization: Bearer CRON_SECRET" (igual que el cron de
// publicación).

import { verifyCronRequest } from "../../../lib/cron-auth";
import { buildDigest, renderDigestEmail } from "../../../lib/digest";
import { sendEmail, isEmailConfigured } from "../../../lib/email";

// Genera 2 artículos completos (en paralelo) — la ruta más larga de la app.
export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  const auth = verifyCronRequest(req.headers.authorization, process.env.CRON_SECRET);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const to = process.env.DIGEST_EMAIL_TO;
  if (!isEmailConfigured() || !to) {
    return res.status(503).json({
      error: "Email no configurado: faltan SMTP_USER / SMTP_PASS / DIGEST_EMAIL_TO",
    });
  }

  // Permite ajustar el nº de propuestas con ?count=N (1-3); por defecto 2.
  const count = Math.min(3, Math.max(1, parseInt(req.query.count, 10) || 2));

  try {
    const digest = await buildDigest({ count });
    const { subject, html, text } = renderDigestEmail(digest);
    await sendEmail({ to, subject, html, text });

    return res.status(200).json({
      sent: true,
      to,
      articulos: digest.articles.length,
      titulos: digest.articles.map((a) => a.report.titulo),
    });
  } catch (err) {
    console.error("article-digest error:", err);
    return res.status(500).json({ error: "Error generando o enviando el resumen quincenal" });
  }
}
