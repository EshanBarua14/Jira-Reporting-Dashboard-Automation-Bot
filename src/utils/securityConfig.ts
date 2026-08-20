/**
 * Environment-aware Network & Security Header Configuration
 * Ensures safe host binding and frame protection across AI Studio Preview,
 * Local/Packaged Electron Desktop, and Production server environments.
 */

export function isContainerEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    env.K_SERVICE ||
    env.K_REVISION ||
    env.CLOUD_RUN ||
    env.GAE_ENV ||
    (env.HOSTNAME && (env.HOSTNAME.startsWith("ais-") || env.HOSTNAME.includes("run.app")))
  );
}

export function isIframePreviewAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  // 1. If explicitly disabled (e.g. in packaged Electron or hardened production), deny iframe embedding
  if (env.IS_ELECTRON === "true" || env.PREVIEW_IFRAME === "false") {
    return false;
  }
  // 2. If explicitly enabled for preview
  if (env.PREVIEW_IFRAME === "true") {
    return true;
  }
  // 3. Container environment (Cloud Run / AI Studio preview container)
  if (isContainerEnvironment(env)) {
    return true;
  }
  // 4. Default to allowing in non-production preview when not in Electron
  return env.NODE_ENV !== "production";
}

export function getResolvedHost(env: NodeJS.ProcessEnv = process.env): string {
  // 1. Electron desktop application must strictly bind to 127.0.0.1 (loopback)
  if (env.IS_ELECTRON === "true") {
    return "127.0.0.1";
  }
  // 2. Explicit preview iframe mode binds to 0.0.0.0
  if (env.PREVIEW_IFRAME === "true") {
    return "0.0.0.0";
  }
  // 3. Explicit HOST environment variable takes high priority if specified
  if (env.HOST && env.HOST.trim() !== "") {
    return env.HOST.trim();
  }
  // 4. Container environment detection (e.g. Cloud Run, AI Studio container ingress)
  if (isContainerEnvironment(env)) {
    return "0.0.0.0";
  }
  // 5. Development preview defaults to 0.0.0.0 for container ingress
  if (env.NODE_ENV !== "production") {
    return "0.0.0.0";
  }
  // 6. Generic production defaults to safe loopback unless explicitly configured
  return "127.0.0.1";
}

export function getHelmetConfig(env: NodeJS.ProcessEnv = process.env) {
  const allowIframe = isIframePreviewAllowed(env);

  const cspDirectives: Record<string, any> = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    connectSrc: ["'self'", "https:", "wss:", "ws:"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: allowIframe ? null : ["'self'"],
  };

  return {
    contentSecurityPolicy: {
      directives: cspDirectives,
    },
    frameguard: allowIframe ? false : { action: "sameorigin" as const },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  };
}

