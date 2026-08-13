import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';
import { URL } from 'url';

export class SSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SSRFError';
  }
}

/**
 * Validates a target URL against SSRF (Server-Side Request Forgery) attacks.
 * Rejects non-HTTP/HTTPS schemes, localhost, private IP ranges, link-local IPs, IPv6 loopbacks, and cloud metadata endpoints.
 */
export async function validateUrlForSSRF(targetUrl: string): Promise<{ url: URL; resolvedIp: string }> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    throw new SSRFError('Invalid URL format');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new SSRFError('Only HTTP and HTTPS protocols are allowed');
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Explicit check for localhost, 0.0.0.0, and known cloud metadata hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '0.0.0.0' ||
    hostname === 'instance-data' ||
    hostname === 'metadata.google.internal' ||
    hostname === '::' ||
    hostname === '::1'
  ) {
    throw new SSRFError(`Access to hostname "${hostname}" is blocked for security reasons`);
  }

  let ipAddresses: string[] = [];

  // Remove IPv6 brackets if present e.g. [::1]
  const cleanHostname = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;

  if (ipaddr.isValid(cleanHostname)) {
    ipAddresses = [cleanHostname];
  } else {
    try {
      const resolved = await dns.lookup(cleanHostname, { all: true });
      ipAddresses = resolved.map((r) => r.address);
    } catch {
      throw new SSRFError(`Unable to resolve DNS for hostname "${cleanHostname}"`);
    }
  }

  if (ipAddresses.length === 0) {
    throw new SSRFError(`No IP address found for hostname "${cleanHostname}"`);
  }

  for (const ipStr of ipAddresses) {
    let parsedIp: ipaddr.IPv4 | ipaddr.IPv6;
    try {
      parsedIp = ipaddr.parse(ipStr);
    } catch {
      throw new SSRFError(`Invalid IP address format "${ipStr}"`);
    }

    // Handle IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1)
    if (parsedIp.kind() === 'ipv6') {
      const ipv6 = parsedIp as ipaddr.IPv6;
      if (ipv6.isIPv4MappedAddress()) {
        parsedIp = ipv6.toIPv4Address();
      }
    }

    const range = parsedIp.range();
    if (
      range === 'loopback' ||
      range === 'private' ||
      range === 'linkLocal' ||
      range === 'broadcast' ||
      range === 'carrierGradeNat' ||
      range === 'unspecified' ||
      range === 'uniqueLocal'
    ) {
      throw new SSRFError(`Destination IP ${ipStr} (${range}) is restricted`);
    }

    // Explicit check for AWS metadata IP 169.254.169.254
    if (ipStr === '169.254.169.254' || ipStr === '169.254.169.250') {
      throw new SSRFError('Cloud metadata IP access is strictly prohibited');
    }
  }

  return {
    url: parsedUrl,
    resolvedIp: ipAddresses[0]
  };
}

/**
 * Validates a redirect location header against SSRF rules before following it.
 */
export async function validateRedirectTarget(baseUrl: string, locationHeader: string): Promise<string> {
  let targetUrl: string;
  try {
    const resolved = new URL(locationHeader, baseUrl);
    targetUrl = resolved.toString();
  } catch {
    throw new SSRFError(`Invalid redirect location header "${locationHeader}"`);
  }

  await validateUrlForSSRF(targetUrl);
  return targetUrl;
}
