import { NextResponse } from "next/server";
import {
  isPublicPath,
  isStaticAsset,
  computeToken,
  timingSafeEqualStr,
} from "./lib/edge-auth";

// ─── Auth Middleware ────────────────────────────────────────────────────────
// Protege TODAS las rutas (páginas y API) excepto /login, /api/auth, /api/cron
// (que exige CRON_SECRET en su handler) y assets.
// Comprueba que exista la cookie "ferrolan-auth" con un token válido.
// El token es SHA-256(password + secret) generado en /api/auth al hacer login.
//
// FAIL-CLOSED: en producción, si AUTH_PASSWORD no está configurada se deniega
// el acceso (antes se permitía todo, y un despiste de configuración dejaba la
// app y sus APIs de pago expuestas públicamente). En desarrollo local sigue
// abierto para no estorbar.

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const password = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET || "ferrolan-default-secret-2026";

  if (!password) {
    if (process.env.NODE_ENV !== "production") {
      // Modo desarrollo sin contraseña: acceso libre
      return NextResponse.next();
    }
    // Producción sin AUTH_PASSWORD: denegar todo (fail-closed)
    if (pathname.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({ error: "AUTH_PASSWORD no configurada en el servidor" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
    return redirectToLogin(request);
  }

  const authCookie = request.cookies.get("ferrolan-auth")?.value;

  if (!authCookie) {
    return redirectToLogin(request);
  }

  // Verify token (comparación en tiempo constante)
  const expectedToken = await computeToken(password, secret);
  if (!timingSafeEqualStr(authCookie, expectedToken)) {
    // Invalid cookie — clear it and redirect
    const response = redirectToLogin(request);
    response.cookies.delete("ferrolan-auth");
    return response;
  }

  return NextResponse.next();
}

function redirectToLogin(request) {
  const { pathname } = request.nextUrl;

  // For API routes, return 401 instead of redirect
  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // For pages, redirect to login
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
