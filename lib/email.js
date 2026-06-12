// ─── lib/email.js ────────────────────────────────────────────────────────────
// Envío de correo por SMTP (Gmail / Outlook / Microsoft 365), mismo patrón que
// el proyecto de Informes de Ferrolan. Por defecto Gmail SSL (465); host/puerto
// configurables para Outlook (smtp.office365.com:587 STARTTLS).
//
// Variables de entorno:
//   SMTP_HOST  (def. smtp.gmail.com) · SMTP_PORT (def. 465)
//   SMTP_USER  · SMTP_PASS  (contraseña de aplicación)
//   DIGEST_EMAIL_FROM (def. = SMTP_USER)

import nodemailer from "nodemailer";

export function isEmailConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail({ to, subject, html, text }) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error("SMTP no configurado: faltan SMTP_USER / SMTP_PASS");
  }
  if (!to) throw new Error("Falta el destinatario del correo");

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const from = process.env.DIGEST_EMAIL_FROM || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL; 587 = STARTTLS
    auth: { user, pass },
  });

  return transporter.sendMail({ from, to, subject, html, text });
}
