import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  isPublicPath,
  isStaticAsset,
  isAgentPath,
  verifyAgentRequest,
  computeToken,
  timingSafeEqualStr,
} from "../lib/edge-auth";
import { verifyCronRequest } from "../lib/cron-auth";

describe("isPublicPath", () => {
  it("permite login y api de auth", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/api/auth")).toBe(true);
  });

  it("permite las rutas de cron (protegidas por CRON_SECRET en el handler)", () => {
    expect(isPublicPath("/api/cron/publish")).toBe(true);
  });

  it("bloquea el resto de rutas de la app", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/api/articles")).toBe(false);
    expect(isPublicPath("/api/generate")).toBe(false);
    expect(isPublicPath("/api/generate-images")).toBe(false);
  });
});

describe("isAgentPath", () => {
  it("limita Quique a generación, anti-duplicados y sincronización", () => {
    expect(isAgentPath("/api/generate")).toBe(true);
    expect(isAgentPath("/api/check-keyword")).toBe(true);
    expect(isAgentPath("/api/sync-blog-posts/")).toBe(true);
  });

  it("no permite publicar, programar, generar imágenes ni investigar", () => {
    expect(isAgentPath("/api/publish-now")).toBe(false);
    expect(isAgentPath("/api/schedule-article")).toBe(false);
    expect(isAgentPath("/api/generate-images")).toBe(false);
    expect(isAgentPath("/api/research")).toBe(false);
    expect(isAgentPath("/api/cron/publish")).toBe(false);
  });
});

describe("verifyAgentRequest", () => {
  const token = "a".repeat(32);

  it("deja el flujo de cookie intacto cuando no hay Bearer", () => {
    expect(verifyAgentRequest("/api/generate", undefined, token)).toEqual({ present: false });
  });

  it("acepta el token correcto solo en una ruta permitida", () => {
    expect(verifyAgentRequest("/api/generate", `Bearer ${token}`, token)).toEqual({
      present: true,
      ok: true,
    });
  });

  it("falla cerrado para ruta, token o configuración no válidos", () => {
    expect(verifyAgentRequest("/api/publish-now", `Bearer ${token}`, token).status).toBe(403);
    expect(verifyAgentRequest("/api/generate", "Bearer incorrecto", token).status).toBe(401);
    expect(verifyAgentRequest("/api/generate", `Bearer ${token}`, "corto").status).toBe(503);
  });
});

describe("isStaticAsset", () => {
  it("detecta assets e internals de Next", () => {
    expect(isStaticAsset("/_next/static/chunk.js")).toBe(true);
    expect(isStaticAsset("/favicon.ico")).toBe(true);
    expect(isStaticAsset("/logo-ferrolan.png")).toBe(true);
  });

  it("no marca rutas API como assets", () => {
    expect(isStaticAsset("/api/articles")).toBe(false);
  });
});

describe("computeToken", () => {
  it("genera el mismo SHA-256 hex que Node crypto (paridad con /api/auth)", async () => {
    const expected = crypto
      .createHash("sha256")
      .update("password123" + "secreto")
      .digest("hex");
    expect(await computeToken("password123", "secreto")).toBe(expected);
  });

  it("es determinista y sensible a los inputs", async () => {
    const a = await computeToken("a", "s");
    expect(await computeToken("a", "s")).toBe(a);
    expect(await computeToken("b", "s")).not.toBe(a);
    expect(await computeToken("a", "t")).not.toBe(a);
  });
});

describe("timingSafeEqualStr", () => {
  it("compara strings correctamente", () => {
    expect(timingSafeEqualStr("abc", "abc")).toBe(true);
    expect(timingSafeEqualStr("abc", "abd")).toBe(false);
    expect(timingSafeEqualStr("abc", "abcd")).toBe(false);
  });

  it("rechaza no-strings", () => {
    expect(timingSafeEqualStr(null, "abc")).toBe(false);
    expect(timingSafeEqualStr("abc", undefined)).toBe(false);
  });
});

describe("verifyCronRequest", () => {
  it("falla cerrado si CRON_SECRET no está configurado", () => {
    const r = verifyCronRequest("Bearer lo-que-sea", undefined);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(503);
  });

  it("rechaza secreto incorrecto o ausente", () => {
    expect(verifyCronRequest("Bearer malo", "bueno").status).toBe(401);
    expect(verifyCronRequest(undefined, "bueno").status).toBe(401);
  });

  it("acepta el Bearer correcto", () => {
    expect(verifyCronRequest("Bearer bueno", "bueno").ok).toBe(true);
  });
});
