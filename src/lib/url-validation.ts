/**
 * Validates a banner URL to prevent SSRF attacks.
 * - Must be a valid URL
 * - Must use HTTPS
 * - Must not resolve to private/internal IP ranges
 */
export function isValidBannerUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.protocol !== 'https:') return false

  const hostname = parsed.hostname.toLowerCase()

  // Block localhost variants
  if (hostname === 'localhost' || hostname === '[::1]') return false

  // Block private/internal IPv4 ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4Match) {
    const [, a, b, c] = ipv4Match.map(Number)
    if (a === 127) return false // 127.0.0.0/8 loopback
    if (a === 10) return false // 10.0.0.0/8 private
    if (a === 172 && b >= 16 && b <= 31) return false // 172.16.0.0/12 private
    if (a === 192 && b === 168) return false // 192.168.0.0/16 private
    if (a === 169 && b === 254) return false // 169.254.0.0/16 link-local
    if (a === 0) return false // 0.0.0.0/8
    if (a >= 224) return false // multicast + reserved
  }

  // Block IPv6 private ranges (bracketed notation)
  if (hostname.startsWith('[')) {
    const ipv6 = hostname.slice(1, -1).toLowerCase()
    if (ipv6 === '::1') return false
    if (ipv6.startsWith('fe80:')) return false // link-local
    if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return false // unique local
  }

  return true
}
