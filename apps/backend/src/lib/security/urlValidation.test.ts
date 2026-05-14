import { describe, it, expect } from 'bun:test';
import { assertSafeUrl } from './urlValidation';

describe('assertSafeUrl', () => {
  it('accepts a public https URL', async () => {
    const parsed = await assertSafeUrl('https://example.com/image.png');
    expect(parsed.hostname).toBe('example.com');
  });

  it('rejects loopback IPv4', async () => {
    await expect(assertSafeUrl('http://127.0.0.1/x', { requireHttps: false })).rejects.toThrow(
      /Private IPv4/
    );
  });

  it('rejects cloud metadata link-local IPv4 (169.254.169.254)', async () => {
    await expect(
      assertSafeUrl('http://169.254.169.254/latest/meta-data/', { requireHttps: false })
    ).rejects.toThrow(/Private IPv4/);
  });

  it('rejects RFC1918 10.x.x.x', async () => {
    await expect(assertSafeUrl('http://10.0.0.5/x', { requireHttps: false })).rejects.toThrow(
      /Private IPv4/
    );
  });

  it('rejects RFC1918 192.168.x.x', async () => {
    await expect(assertSafeUrl('http://192.168.1.1/x', { requireHttps: false })).rejects.toThrow(
      /Private IPv4/
    );
  });

  it('rejects file:// scheme', async () => {
    await expect(assertSafeUrl('file:///etc/passwd', { requireHttps: false })).rejects.toThrow(
      /Unsafe URL protocol/
    );
  });

  it('rejects javascript: scheme', async () => {
    await expect(assertSafeUrl('javascript:alert(1)', { requireHttps: false })).rejects.toThrow(
      /Unsafe URL protocol/
    );
  });

  it('rejects http when requireHttps is true', async () => {
    await expect(assertSafeUrl('http://example.com/x', { requireHttps: true })).rejects.toThrow(
      /Unsafe URL protocol/
    );
  });

  it('rejects hostname not in allowlist', async () => {
    await expect(
      assertSafeUrl('https://evil.example.org/x', { allowedHosts: ['mzstatic.com'] })
    ).rejects.toThrow(/not in allowlist/);
  });

  it('accepts subdomain matching allowlist root', async () => {
    const parsed = await assertSafeUrl('https://is1-ssl.mzstatic.com/image.png', {
      allowedHosts: ['mzstatic.com'],
    });
    expect(parsed.hostname).toBe('is1-ssl.mzstatic.com');
  });
});
