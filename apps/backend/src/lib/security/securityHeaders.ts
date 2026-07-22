import { Elysia } from 'elysia';
import { env } from '../../config/env';

/**
 * Writes the OWASP-recommended response headers onto a header bag. Extracted so
 * it can run both in the success path (onAfterHandle) and the error path
 * (onError) — the latter never fires onAfterHandle, so error responses would
 * otherwise ship without these headers.
 * Permissive CSP (frame-ancestors 'none') prevents clickjacking without
 * blocking JSON responses.
 */
export function applySecurityHeaders(headers: Record<string, string | number | undefined>): void {
  headers['X-Content-Type-Options'] = 'nosniff';
  headers['X-Frame-Options'] = 'DENY';
  headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()';
  headers['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'";
  if (env.IS_PROD) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }
}

/**
 * `{ as: 'global' }` propagates the hook to all routes of the parent app;
 * Elysia 1.4's default scope is `local`, in which case the hook would only
 * fire for routes defined inside this Elysia instance — i.e. never.
 */
export const securityHeaders = new Elysia({ name: 'security-headers' }).onAfterHandle(
  { as: 'global' },
  ({ set }) => applySecurityHeaders(set.headers)
);
