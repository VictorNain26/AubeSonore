import { describe, it, expect } from 'bun:test';
import { getClientIp } from './rateLimit';

describe('getClientIp', () => {
  it('prefers CF-Connecting-IP over a spoofed X-Forwarded-For', () => {
    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.7',
      'x-forwarded-for': '1.2.3.4, 203.0.113.7',
    });
    expect(getClientIp(headers)).toBe('203.0.113.7');
  });

  it('ignores a client-forged first X-Forwarded-For entry, using the last', () => {
    const headers = new Headers({ 'x-forwarded-for': '9.9.9.9, 203.0.113.7' });
    expect(getClientIp(headers)).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip when CF-Connecting-IP is absent', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.2' });
    expect(getClientIp(headers)).toBe('198.51.100.2');
  });

  it('returns anon when no client IP header is present', () => {
    expect(getClientIp(new Headers())).toBe('anon');
  });
});
