import { hexToString, stringToHex, pad, type Hex } from 'viem'

/**
 * Decode bytes 0–29 as UTF-8 text, ignoring the last 2 bytes (banner ID).
 * Backward-compatible: old memos had byte 30 as null padding, so reading 0–29 still works.
 */
export function parseMemo(memoBytes: Hex): string {
  try {
    // Take only the first 30 bytes (60 hex chars) to ignore the 2-byte banner at positions 30-31
    const textHex = ('0x' + memoBytes.slice(2, 62)) as Hex
    const raw = hexToString(textHex)
    return raw.replace(/\0+$/, '').replace(/^\0+/, '')
  } catch {
    return ''
  }
}

/**
 * Extract banner ID from bytes 30-31 (big-endian uint16) of the bytes32 memo.
 * Backward-compatible: old memos had byte 30 = 0x00, so (0x00 << 8) | old_byte31 = same old ID.
 */
export function parseBannerId(memoBytes: Hex): number {
  try {
    const hex = memoBytes.slice(2).padEnd(64, '0')
    const byte30 = parseInt(hex.slice(60, 62), 16)
    const byte31 = parseInt(hex.slice(62, 64), 16)
    return (byte30 << 8) | byte31
  } catch {
    return 0
  }
}

/**
 * Encode text + banner ID into a single bytes32.
 * Text occupies bytes 0–29 (max 30 bytes), banner ID is a big-endian uint16 in bytes 30-31.
 */
export function encodeMemo(text: string, bannerId: number): Hex {
  const textBytes = new TextEncoder().encode(text || '')
  if (textBytes.length > 30) throw new Error(`Memo exceeds 30 bytes (got ${textBytes.length})`)
  const padded = pad(stringToHex(text || ''), { size: 32, dir: 'right' })
  if (bannerId <= 0 || bannerId > 65535) return padded
  // Overwrite bytes 30-31 (hex chars 60-63 after 0x prefix) with big-endian uint16
  const bannerHex = bannerId.toString(16).padStart(4, '0')
  return (padded.slice(0, 62) + bannerHex) as Hex
}
