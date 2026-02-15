import type { usePrivy } from '@privy-io/react-auth'

export function getDisplayInfo(user: ReturnType<typeof usePrivy>['user']) {
  if (!user) return { label: '', initials: '' }

  const email = user.email?.address
  const phone = user.phone?.number
  const name = user.google?.name || user.apple?.email?.split('@')[0]

  const label = name || email || phone || ''
  const initials = name
    ? name
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : label.slice(0, 2).toUpperCase()

  return { label, initials, email, phone, name }
}
