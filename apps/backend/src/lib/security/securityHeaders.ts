import { Elysia } from 'elysia';
import { env } from '../../config/env';

/**
 * Adds OWASP-recommended response headers for an API.
 * Permissive CSP (frame-ancestors 'none') prevents clickjacking without
 * blocking JSON responses.
 *
 * `{ as: 'global' }` propagates the hook to all routes of the parent app;
 * Elysia 1.4's default scope is `local`, in which case the hook would only
 * fire for routes defined inside this Elysia instance — i.e. never.
 */
export const securityHeaders = new Elysia({ name: 'security-headers' }).onAfterHandle(
  { as: 'global' },
  ({ set }) => {
    set.headers['X-Content-Type-Options'] = 'nosniff';
    set.headers['X-Frame-Options'] = 'DENY';
    set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    set.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()';
    set.headers['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'";
    if (env.IS_PROD) {
      set.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }
  }
);
