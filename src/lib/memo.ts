import { hexToString, stringToHex, pad, type Hex } from 'viem'

/** Decode bytes 0–30 as UTF-8 text, ignoring the last byte (banner ID). */
export function parseMemo(memoBytes: Hex): string {
  try {
    // Take only the first 31 bytes (62 hex chars) to ignore the banner byte at position 31
    const textHex = ('0x' + memoBytes.slice(2, 64)) as Hex
    const raw = hexToString(textHex)
    return raw.replace(/\0+$/, '')
  } catch {
    return ''
  }
}

/** Extract banner ID from byte 31 (the last byte of the bytes32 memo). */
export function parseBannerId(memoBytes: Hex): number {
  try {
    const hex = memoBytes.slice(2).padEnd(64, '0')
    return parseInt(hex.slice(62, 64), 16)
  } catch {
    return 0
  }
}

/** Encode text + banner ID into a single bytes32. Text occupies bytes 0–30, banner ID is byte 31. */
export function encodeMemo(text: string, bannerId: number): Hex {
  const padded = pad(stringToHex(text || ''), { size: 32 })
  if (bannerId <= 0 || bannerId > 255) return padded
  // Overwrite the last byte (chars 64-65 of the hex string after 0x prefix)
  const bannerHex = bannerId.toString(16).padStart(2, '0')
  return (padded.slice(0, 64) + bannerHex) as Hex
}
