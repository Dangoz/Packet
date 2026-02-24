export function resolveIpfsUrl(url: string | undefined | null): string | null {
  if (!url) return null
  if (url.startsWith('ipfs://')) {
    return `https://cloudflare-ipfs.com/ipfs/${url.slice(7)}`
  }
  return url
}
