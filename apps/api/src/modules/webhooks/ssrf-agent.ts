import dns from 'node:dns/promises';
import type { LookupOptions } from 'node:dns';
import net from 'node:net';
import https from 'node:https';

export function isPrivateOrRestrictedIp(ip: string): boolean {
  if (!net.isIP(ip)) {
    return true; // Invalid IP strings treated as restricted
  }

  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const [p0, p1, p2] = parts;

    // 0.0.0.0/8 (Current network)
    if (p0 === 0) return true;

    // 10.0.0.0/8 (Private RFC 1918)
    if (p0 === 10) return true;

    // 100.64.0.0/10 (Shared Address Space / CGNAT)
    if (p0 === 100 && p1 !== undefined && p1 >= 64 && p1 <= 127) return true;

    // 127.0.0.0/8 (Loopback)
    if (p0 === 127) return true;

    // 169.254.0.0/16 (Link-local & AWS/Cloud IMDS metadata)
    if (p0 === 169 && p1 === 254) return true;

    // 172.16.0.0/12 (Private RFC 1918)
    if (p0 === 172 && p1 !== undefined && p1 >= 16 && p1 <= 31) return true;

    // 192.0.2.0/24 (TEST-NET-1)
    if (p0 === 192 && p1 === 0 && p2 === 2) return true;

    // 192.168.0.0/16 (Private RFC 1918)
    if (p0 === 192 && p1 === 168) return true;

    // 224.0.0.0/4 (Multicast / Reserved)
    if (p0 !== undefined && p0 >= 224) return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();

    // Loopback ::1 / 0:0:0:0:0:0:0:1 / ::
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1' || normalized === '::') return true;

    // Link-local fe80::/10
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
      return true;
    }

    // Unique Local fc00::/7 (fc00:: and fd00::)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }

    // IPv4-mapped IPv6 ::ffff:127.0.0.1 etc.
    if (normalized.includes('::ffff:')) {
      const ipv4Part = normalized.split('::ffff:')[1];
      if (ipv4Part && net.isIP(ipv4Part)) {
        return isPrivateOrRestrictedIp(ipv4Part);
      }
    }

    return false;
  }

  return true;
}

export async function validateWebhookUrl(urlStr: string): Promise<string> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Webhook URL must use HTTPS protocol');
  }

  const hostname = parsedUrl.hostname;

  // If hostname is directly an IP address
  if (net.isIP(hostname)) {
    if (isPrivateOrRestrictedIp(hostname)) {
      throw new Error(`SSRF Blocked: Target IP ${hostname} is restricted`);
    }
    return hostname;
  }

  // Resolve hostname via DNS
  let resolvedIps: string[];
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    resolvedIps = addresses.map((a) => a.address);
  } catch (err) {
    throw new Error(`DNS resolution failed for hostname ${hostname}: ${(err as Error).message}`, {
      cause: err,
    });
  }

  if (resolvedIps.length === 0) {
    throw new Error(`DNS resolution returned no IP addresses for ${hostname}`);
  }

  for (const ip of resolvedIps) {
    if (isPrivateOrRestrictedIp(ip)) {
      throw new Error(`SSRF Blocked: Hostname ${hostname} resolved to restricted IP ${ip}`);
    }
  }

  return resolvedIps[0]!;
}

export function createSsrfSafeHttpsAgent(): https.Agent {
  return new https.Agent({
    rejectUnauthorized: true,
    maxSockets: 10,
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, options as LookupOptions)
        .then((result) => {
          if (Array.isArray(result)) {
            for (const item of result) {
              if (isPrivateOrRestrictedIp(item.address)) {
                return callback(new Error(`SSRF Blocked: Target IP ${item.address} is restricted`), '', 4);
              }
            }
            const first = result[0];
            if (!first) {
              return callback(new Error(`DNS resolution returned no address for ${hostname}`), '', 4);
            }
            return callback(null, first.address, first.family);
          } else {
            if (isPrivateOrRestrictedIp(result.address)) {
              return callback(new Error(`SSRF Blocked: Target IP ${result.address} is restricted`), '', 4);
            }
            return callback(null, result.address, result.family);
          }
        })
        .catch((err) => {
          callback(err as Error, '', 4);
        });
    },
  });
}
