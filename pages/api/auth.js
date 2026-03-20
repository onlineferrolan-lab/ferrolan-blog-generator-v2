import crypto from "crypto";

// ─── Auth API ───────────────────────────────────────────────────────────────
// POST: Valida la contraseña y establece la cookie de sesión.
// DELETE: Cierra sesión eliminando la cookie.

function computeToken(password, secret) {
  return crypto.createHash("sha256").update(password + secret).digest("hex");
}

export default async function handler(req, res) {
  const secret = process.env.AUTH_SECRET || "ferrolan-default-secret-2026";

  // ─── POST: Login ───
  if (req.method === "POST") {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Contraseña requerida" });
    }

    const expectedPassword = process.env.AUTH_PASSWORD;

    if (!expectedPassword) {
      return res.status(500).json({ error: "AUTH_PASSWORD no configurada en Vercel" });
    }

    // Constant-time comparison to prevent timing attacks
    const inputBuffer = Buffer.from(password);
    const expectedBuffer = Buffer.from(expectedPassword);

    if (
      inputBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(inputBuffer, expectedBuffer)
    ) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // Generate auth token
    const token = computeToken(password, secret);

    // Set secure cookie (30 days)
    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = [
      `ferrolan-auth=${token}`,
      "Path=/",
      `Max-Age=${30 * 24 * 60 * 60}`, // 30 days
      "HttpOnly",
      "SameSite=Lax",
      isProduction ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; ");

    res.setHeader("Set-Cookie", cookieOptions);

    return res.status(200).json({ ok: true });
  }

  // ─── DELETE: Logout ───
  if (req.method === "DELETE") {
    res.setHeader(
      "Set-Cookie",
      "ferrolan-auth=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
