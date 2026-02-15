import { toast } from 'sonner'
import { ExternalLink } from 'lucide-react'

const EXPLORER = 'https://explore.tempo.xyz/tx'

/**
 * Creates a progressively-updating toast for on-chain transactions.
 * Call `.loading()` at each stage, then `.success()` or `.error()` to resolve.
 * Uses a single toast ID so each stage replaces the previous one in-place.
 */
export function txToast(id: string = crypto.randomUUID()) {
  return {
    id,
    loading: (message: string) => {
      toast.loading(message, { id })
    },
    success: (txHash: string, title = 'Transaction confirmed') => {
      toast.success(title, {
        id,
        description: (
          <a
            href={`${EXPLORER}/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-pkt-accent transition-all hover:brightness-110"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
            <ExternalLink className="h-3 w-3" />
          </a>
        ),
        duration: 6000,
      })
    },
    error: (message: string, title = 'Transaction failed') => {
      toast.error(title, { id, description: message })
    },
  }
}
