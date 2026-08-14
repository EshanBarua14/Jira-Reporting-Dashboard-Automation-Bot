import { describe, it, expect } from "vitest";
import express from "express";
import http from "http";
import helmet from "helmet";
import {
  getResolvedHost,
  isIframePreviewAllowed,
  getHelmetConfig
} from "../../src/utils/securityConfig";

describe("Environment-Aware Network & Security Header Configurations", () => {
  // TEST A: AI Studio / Preview configuration binds to 0.0.0.0
  it("TEST A: Binds to 0.0.0.0 in AI Studio / container preview environment", () => {
    const devEnv: NodeJS.ProcessEnv = {
      NODE_ENV: "development",
      PREVIEW_IFRAME: "true",
      IS_ELECTRON: "false"
    };
    expect(getResolvedHost(devEnv)).toBe("0.0.0.0");

    const explicitEnv: NodeJS.ProcessEnv = {
      HOST: "0.0.0.0",
      NODE_ENV: "production"
    };
    expect(getResolvedHost(explicitEnv)).toBe("0.0.0.0");
  });

  // TEST B: Electron / local production configuration binds to 127.0.0.1
  it("TEST B: Binds strictly to 127.0.0.1 in Electron / local production to prevent LAN exposure", () => {
    const electronEnv: NodeJS.ProcessEnv = {
      NODE_ENV: "production",
      IS_ELECTRON: "true",
      PREVIEW_IFRAME: "false"
    };
    expect(getResolvedHost(electronEnv)).toBe("127.0.0.1");

    const defaultProdEnv: NodeJS.ProcessEnv = {
      NODE_ENV: "production",
      IS_ELECTRON: "false"
    };
    expect(getResolvedHost(defaultProdEnv)).toBe("127.0.0.1");
  });

  // TEST C: Production / local configuration does not disable clickjacking protection
  it("TEST C: Enforces strict clickjacking protection outside preview (SAMEORIGIN & frame-ancestors 'self')", () => {
    const prodEnv: NodeJS.ProcessEnv = {
      NODE_ENV: "production",
      PREVIEW_IFRAME: "false"
    };
    const config = getHelmetConfig(prodEnv);
    expect(config.frameguard).toEqual({ action: "sameorigin" });
    const directives = (config.contentSecurityPolicy as any)?.directives;
    expect(directives?.frameAncestors).toEqual(["'self'"]);
  });

  // TEST D: Preview iframe compatibility is enabled only in intended preview environment
  it("TEST D: Enables preview iframe compatibility only when intended", () => {
    // Explicit preview mode
    expect(isIframePreviewAllowed({ PREVIEW_IFRAME: "true" })).toBe(true);

    // Development preview
    expect(isIframePreviewAllowed({ NODE_ENV: "development", IS_ELECTRON: "false" })).toBe(true);

    // Electron desktop must NEVER allow external iframe embedding
    expect(isIframePreviewAllowed({ NODE_ENV: "development", IS_ELECTRON: "true" })).toBe(false);
    expect(isIframePreviewAllowed({ PREVIEW_IFRAME: "true", IS_ELECTRON: "true" })).toBe(false);

    // Hardened production with PREVIEW_IFRAME=false
    expect(isIframePreviewAllowed({ NODE_ENV: "production", PREVIEW_IFRAME: "false" })).toBe(false);
  });

  // TEST E: CSP remains active in all environments
  it("TEST E: Preserves restrictive CSP directives in all environments", () => {
    const environments: NodeJS.ProcessEnv[] = [
      { NODE_ENV: "development", PREVIEW_IFRAME: "true" },
      { NODE_ENV: "production", IS_ELECTRON: "true" },
      { NODE_ENV: "production", PREVIEW_IFRAME: "false" }
    ];

    environments.forEach((env) => {
      const config = getHelmetConfig(env);
      const directives = (config.contentSecurityPolicy as any)?.directives;
      expect(directives?.defaultSrc).toEqual(["'self'"]);
      expect(directives?.objectSrc).toEqual(["'none'"]);
      expect(directives?.baseUri).toEqual(["'self'"]);
      expect(directives?.formAction).toEqual(["'self'"]);
      expect(directives?.connectSrc).toContain("'self'");
    });
  });

  // TEST F: No global frameguard disable remains unless explicitly scoped to preview
  it("TEST F: Sets frameguard to sameorigin whenever preview is inactive", () => {
    const electronConfig = getHelmetConfig({ IS_ELECTRON: "true" });
    expect(electronConfig.frameguard).toEqual({ action: "sameorigin" });

    const prodConfig = getHelmetConfig({ NODE_ENV: "production", PREVIEW_IFRAME: "false" });
    expect(prodConfig.frameguard).toEqual({ action: "sameorigin" });

    const previewConfig = getHelmetConfig({ PREVIEW_IFRAME: "true" });
    expect(previewConfig.frameguard).toBe(false);
  });

  // HTTP Integration: Verify actual response headers with Helmet middleware
  it("HTTP Integration: Sends X-Frame-Options and CSP headers correctly per environment", async () => {
    // 1. Production / Electron Express App
    const prodApp = express();
    prodApp.use(helmet(getHelmetConfig({ NODE_ENV: "production", IS_ELECTRON: "true", PREVIEW_IFRAME: "false" })));
    prodApp.get("/test", (_req, res) => res.send("ok"));

    const prodServer: http.Server = await new Promise((resolve) => {
      const s = prodApp.listen(0, "127.0.0.1", () => resolve(s));
    });
    const prodPort = (prodServer.address() as any).port;

    try {
      const prodRes = await fetch(`http://127.0.0.1:${prodPort}/test`);
      expect(prodRes.headers.get("x-frame-options")).toBe("SAMEORIGIN");
      const prodCsp = prodRes.headers.get("content-security-policy") || "";
      expect(prodCsp).toContain("frame-ancestors 'self'");
      expect(prodCsp).toContain("object-src 'none'");
    } finally {
      await new Promise<void>((resolve) => prodServer.close(() => resolve()));
    }

    // 2. AI Studio Preview Express App
    const previewApp = express();
    previewApp.use(helmet(getHelmetConfig({ NODE_ENV: "development", PREVIEW_IFRAME: "true" })));
    previewApp.get("/test", (_req, res) => res.send("ok"));

    const previewServer: http.Server = await new Promise((resolve) => {
      const s = previewApp.listen(0, "127.0.0.1", () => resolve(s));
    });
    const previewPort = (previewServer.address() as any).port;

    try {
      const previewRes = await fetch(`http://127.0.0.1:${previewPort}/test`);
      expect(previewRes.headers.get("x-frame-options")).toBeNull();
      const previewCsp = previewRes.headers.get("content-security-policy") || "";
      expect(previewCsp).toContain("object-src 'none'");
      expect(previewCsp).not.toContain("frame-ancestors 'self'");
    } finally {
      await new Promise<void>((resolve) => previewServer.close(() => resolve()));
    }
  });
});
