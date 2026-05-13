import { Elysia } from 'elysia';

const isProd: boolean = process.env.NODE_ENV === 'production' || process.env.ENV === 'production';

/**
 * Adds OWASP-recommended response headers for an API.
 * Permissive CSP (frame-ancestors 'none') prevents clickjacking without
 * blocking JSON responses.
 */
export const securityHeaders = new Elysia({ name: 'security-headers' }).onAfterHandle(({ set }) => {
  set.headers['X-Content-Type-Options'] = 'nosniff';
  set.headers['X-Frame-Options'] = 'DENY';
  set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  set.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()';
  set.headers['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'";
  if (isProd) {
    set.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }
});
