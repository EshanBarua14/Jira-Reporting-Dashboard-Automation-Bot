/**
 * Environment-aware Network & Security Header Configuration
 * Ensures safe host binding and frame protection across AI Studio Preview,
 * Local/Packaged Electron Desktop, and Production server environments.
 */

export function isIframePreviewAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  // If explicitly disabled (e.g. in packaged Electron or hardened production), deny iframe embedding
  if (env.PREVIEW_IFRAME === "false" || env.IS_ELECTRON === "true") {
    return false;
  }
  // If explicitly enabled for preview
  if (env.PREVIEW_IFRAME === "true") {
    return true;
  }
  // Default to allowing in non-production preview when not in Electron
  return env.NODE_ENV !== "production";
}

export function getResolvedHost(env: NodeJS.ProcessEnv = process.env): string {
  // Explicit HOST environment variable takes highest priority
  if (env.HOST && env.HOST.trim() !== "") {
    return env.HOST.trim();
  }
  // Electron desktop application must strictly bind to 127.0.0.1 (loopback)
  if (env.IS_ELECTRON === "true") {
    return "127.0.0.1";
  }
  // Development / AI Studio container preview defaults to 0.0.0.0 for container ingress
  if (env.NODE_ENV !== "production" || env.PREVIEW_IFRAME === "true") {
    return "0.0.0.0";
  }
  // Generic production defaults to safe loopback unless explicitly configured
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
