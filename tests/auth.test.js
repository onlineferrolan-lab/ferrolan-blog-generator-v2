import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  isPublicPath,
  isStaticAsset,
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
