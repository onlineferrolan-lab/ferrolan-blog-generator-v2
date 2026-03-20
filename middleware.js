import { NextResponse } from "next/server";

// ─── Auth Middleware ────────────────────────────────────────────────────────
// Protege TODAS las rutas (páginas y API) excepto /login, /api/auth y assets.
// Comprueba que exista la cookie "ferrolan-auth" con un token válido.
// El token es SHA-256(password + secret) generado en /api/auth al hacer login.

const PUBLIC_PATHS = ["/login", "/api/auth"];

async function computeToken(password, secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // Check auth cookie
  const authCookie = request.cookies.get("ferrolan-auth")?.value;
  const password = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET || "ferrolan-default-secret-2026";

  if (!password) {
    // If AUTH_PASSWORD is not set, allow everything (dev mode)
    return NextResponse.next();
  }

  if (!authCookie) {
    return redirectToLogin(request);
  }

  // Verify token
  const expectedToken = await computeToken(password, secret);
  if (authCookie !== expectedToken) {
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
