import { lookup } from 'dns/promises';
import { isIP } from 'net';

const PRIVATE_IPV4_RANGES: ReadonlyArray<readonly [number, number, number]> = [
  [10, 0, 0xff], // 10.0.0.0/8
  [127, 0, 0xff], // 127.0.0.0/8 loopback
  [169, 254, 0xff], // 169.254.0.0/16 link-local (AWS/GCP/Azure metadata)
  [172, 16, 0xf0], // 172.16.0.0/12 (only second octet 16-31)
  [192, 168, 0xff], // 192.168.0.0/16
  [0, 0, 0xff], // 0.0.0.0/8
];

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts as [number, number, number, number];
  return PRIVATE_IPV4_RANGES.some(([rA, rB, mask]) => {
    if (rA !== a) return false;
    return mask === 0xff ? true : (b & 0xf0) === (rB & 0xf0);
  });
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80') ||
    lower.startsWith('::ffff:') // IPv4-mapped, check the v4 part separately
  );
}

export interface SafeUrlOptions {
  allowedHosts?: ReadonlyArray<string>;
  requireHttps?: boolean;
}

/**
 * Validates that a URL is safe to fetch: blocks private/loopback IPs (SSRF),
 * enforces https when required, and optionally restricts to a host allowlist.
 * Hosts in the allowlist match exact hostname or any subdomain.
 */
export async function assertSafeUrl(rawUrl: string, options: SafeUrlOptions = {}): Promise<URL> {
  const { allowedHosts, requireHttps = true } = options;
  const parsed = new URL(rawUrl);

  if (parsed.protocol !== 'https:' && (requireHttps || parsed.protocol !== 'http:')) {
    throw new Error(`Unsafe URL protocol: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  if (allowedHosts && allowedHosts.length > 0) {
    const allowed = allowedHosts.some(
      (h) => hostname === h.toLowerCase() || hostname.endsWith(`.${h.toLowerCase()}`)
    );
    if (!allowed) {
      throw new Error(`URL host not in allowlist: ${hostname}`);
    }
  }

  // If the hostname is already a literal IP, validate without DNS
  const ipVersion = isIP(hostname);
  if (ipVersion === 4 && isPrivateIpv4(hostname)) {
    throw new Error(`Private IPv4 not allowed: ${hostname}`);
  }
  if (ipVersion === 6 && isPrivateIpv6(hostname)) {
    throw new Error(`Private IPv6 not allowed: ${hostname}`);
  }

  if (ipVersion === 0) {
    // Resolve and verify none of the addresses are private
    const records = await lookup(hostname, { all: true });
    for (const { address, family } of records) {
      if (family === 4 && isPrivateIpv4(address)) {
        throw new Error(`Hostname ${hostname} resolves to private IPv4 ${address}`);
      }
      if (family === 6 && isPrivateIpv6(address)) {
        throw new Error(`Hostname ${hostname} resolves to private IPv6 ${address}`);
      }
    }
  }

  return parsed;
}
