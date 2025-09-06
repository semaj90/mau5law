import { URL } from "url";
import { dev } from "$app/environment";
import type { RequestEvent } from "@sveltejs/kit";

/**
 * Advanced Security Middleware
 * Rate Limiting, JWT Refresh, and Security Headers
 */

// Simple logging functions
function logWarn(message: string, data?: any): void {
  console.warn(message, data);
}

function logError(message: string, data?: any): void {
  console.error(message, data);
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

export interface SecurityConfig {
  rateLimits: {
    general: { requests: number; windowMs: number };
    auth: { requests: number; windowMs: number };
    api: { requests: number; windowMs: number };
    upload: { requests: number; windowMs: number };
  };
  jwt: {
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
}

const config: SecurityConfig = {
  rateLimits: {
    general: { requests: 1000, windowMs: 15 * 60 * 1000 }, // 1000 requests per 15 minutes
    auth: { requests: 5, windowMs: 15 * 60 * 1000 }, // 5 auth attempts per 15 minutes
    api: { requests: 300, windowMs: 15 * 60 * 1000 }, // 300 API calls per 15 minutes
    upload: { requests: 10, windowMs: 60 * 1000 }, // 10 uploads per minute
  },
  jwt: {
    accessTokenExpiry: "15m",
    refreshTokenExpiry: "7d",
  },
};

class SecurityManager {
  private rateLimitStore = new Map<string, RateLimitEntry>();
  private blockedIPs = new Set<string>();

  /**
   * Apply rate limiting
   */
  checkRateLimit(clientIP: string, route: string): boolean {
    const now = Date.now();
    const key = `${clientIP}:${route}`;
    const entry = this.rateLimitStore.get(key);

    // Determine rate limit based on route
    const limit = this.getRateLimitForRoute(route);

    if (!entry) {
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + limit.windowMs,
        blocked: false,
      });
      return true;
    }

    // Reset window if expired
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + limit.windowMs;
      entry.blocked = false;
      return true;
    }

    // Check if within limits
    if (entry.count >= limit.requests) {
      entry.blocked = true;
      logWarn("Rate limit exceeded", { clientIP, route, count: entry.count });
      return false;
    }

    entry.count++;
    return true;
  }

  private getRateLimitForRoute(route: string) {
    if (route.includes("/auth/")) return config.rateLimits.auth;
    if (route.includes("/api/")) return config.rateLimits.api;
    if (route.includes("/upload")) return config.rateLimits.upload;
    return config.rateLimits.general;
  }

  /**
   * Get client IP from request
   */
  getClientIP(event: RequestEvent): string {
    const xForwardedFor = event.request.headers.get("x-forwarded-for");
    const xRealIP = event.request.headers.get("x-real-ip");
    
    if (xForwardedFor) {
      return xForwardedFor.split(",")[0].trim();
    }
    
    if (xRealIP) {
      return xRealIP.trim();
    }

    // Fallback to a default IP in development
    return dev ? "127.0.0.1" : "unknown";
  }

  /**
   * Apply security headers
   */
  applySecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers);

    // HSTS
    if (!dev) {
      headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    // Content Security Policy
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;"
    );

    // Other security headers
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("X-XSS-Protection", "1; mode=block");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Validate request origin
   */
  isValidOrigin(request: Request): boolean {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");

    if (dev) return true; // Allow all origins in development

    const allowedOrigins = [
      "http://localhost:5173",
      "https://yourdomain.com",
      // Add your production domains
    ];

    if (origin && allowedOrigins.includes(origin)) {
      return true;
    }

    if (referer) {
      try {
        const refererUrl = new URL(referer);
        return allowedOrigins.some(allowed => new URL(allowed).origin === refererUrl.origin);
      } catch {
        return false;
      }
    }

    return false;
  }
}

// Export singleton instance
export const securityManager = new SecurityManager();
;
/**
 * Security middleware hook
 */
export async function securityMiddleware(event: RequestEvent): Promise<any> {
  const clientIP = securityManager.getClientIP(event);
  const route = event.route.id || "";

  // Check rate limiting
  if (!securityManager.checkRateLimit(clientIP, route)) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  // Validate origin for state-changing requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(event.request.method)) {
    if (!securityManager.isValidOrigin(event.request)) {
      logWarn("Invalid origin detected", { clientIP, origin: event.request.headers.get("origin") });
      return new Response("Invalid origin", { status: 403 });
    }
  }

  return null; // Continue processing
}

export { config as securityConfig };