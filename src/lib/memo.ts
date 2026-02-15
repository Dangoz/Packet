import { hexToString, type Hex } from 'viem'

export function parseMemo(memoBytes: Hex): string {
  try {
    const raw = hexToString(memoBytes)
    // Strip trailing null bytes
    return raw.replace(/\0+$/, '')
  } catch {
    return ''
  }
}
