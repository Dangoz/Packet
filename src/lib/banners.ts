export const BANNERS = [
  { id: 1, src: '/banner1.png', label: 'Year of the Snake' },
  { id: 2, src: '/banner2.png', label: 'Festive' },
  { id: 3, src: '/banner3.png', label: 'Fortune' },
] as const

export function getBannerSrc(id: number): string | null {
  return BANNERS.find((b) => b.id === id)?.src ?? null
}
