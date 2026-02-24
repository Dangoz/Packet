'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, ChevronLeft, ImageOff, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { PacketCard } from '@/components/inspired'
import { useNftGallery } from '@/hooks/useNftGallery'
import { cn } from '@/lib/utils'

interface NftGalleryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (imageUrl: string) => void
}

export function NftGalleryModal({ isOpen, onClose, onSelect }: NftGalleryModalProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const {
    collections,
    nfts,
    loading,
    imagesLoading,
    error,
    hasMore,
    loadMore,
    searchQuery,
    searchByTokenId,
    clearSearch,
  } = useNftGallery(selectedSlug)
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set())
  const [searchInput, setSearchInput] = useState('')

  // Debounced search: fires 800ms after user stops typing
  useEffect(() => {
    if (!selectedSlug) return

    const trimmed = searchInput.trim()

    if (!trimmed) {
      // Auto-clear search when input is emptied
      if (searchQuery) clearSearch()
      return
    }

    const timeout = setTimeout(() => {
      searchByTokenId(trimmed)
    }, 800)

    return () => clearTimeout(timeout)
  }, [searchInput, selectedSlug])

  const handleClose = () => {
    onClose()
    // Reset after animation completes
    setTimeout(() => setSelectedSlug(null), 200)
  }

  const handleBack = () => {
    setSelectedSlug(null)
    setSearchInput('')
  }

  const handleSelect = (imageUrl: string) => {
    onSelect(imageUrl)
    handleClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.85)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <PacketCard
              header={selectedSlug ? collections.find((c) => c.slug === selectedSlug)?.name || 'NFTs' : 'NFT Gallery'}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 text-pkt-text-tertiary transition-colors hover:text-pkt-text"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col gap-4">
                <AnimatePresence mode="wait">
                  {!selectedSlug ? (
                    /* ── Collections Grid ── */
                    <motion.div
                      key="collections"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-3">
                          {collections.map((c) => (
                            <button
                              key={c.slug}
                              onClick={() => setSelectedSlug(c.slug)}
                              className="group flex flex-col overflow-hidden border border-pkt-border bg-pkt-bg/50 transition-all hover:border-pkt-accent/50"
                            >
                              <div className="aspect-square w-full overflow-hidden bg-pkt-bg">
                                {imagesLoading ? (
                                  <Skeleton className="h-full w-full rounded-none" />
                                ) : c.coverImage && !imgErrors.has(c.slug) ? (
                                  <img
                                    src={c.coverImage}
                                    alt={c.name}
                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                    loading="lazy"
                                    onError={() => setImgErrors((prev) => new Set(prev).add(c.slug))}
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-pkt-surface">
                                    <span className="px-2 text-center font-mono text-[11px] font-bold uppercase tracking-wider text-pkt-text-tertiary">
                                      {c.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-0.5 px-3 py-2">
                                <span className="text-left font-mono text-[11px] font-bold uppercase tracking-wider text-pkt-text">
                                  {c.name}
                                </span>
                                <span className="text-left font-mono text-[9px] leading-snug text-pkt-text-tertiary line-clamp-1">
                                  {c.contract.slice(0, 6)}...{c.contract.slice(-4)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    /* ── NFTs Grid ── */
                    <motion.div
                      key="nfts"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col gap-4"
                    >
                      {/* Back button */}
                      <button
                        onClick={handleBack}
                        className="flex items-center gap-1 self-start font-mono text-[10px] uppercase tracking-wider text-pkt-text-secondary transition-colors hover:text-pkt-accent"
                      >
                        <ChevronLeft className="h-3 w-3" />
                        All Collections
                      </button>

                      {/* Search by token ID */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-pkt-text-tertiary" />
                        <input
                          type="text"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          placeholder="Search by token ID..."
                          className="w-full border border-pkt-border bg-pkt-bg/50 py-1.5 pl-8 pr-8 font-mono text-[11px] text-pkt-text placeholder:text-pkt-text-tertiary focus:border-pkt-accent/50 focus:outline-none"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => {
                              setSearchInput('')
                              clearSearch()
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-pkt-text-tertiary transition-colors hover:text-pkt-text"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* Error state */}
                      {error && (
                        <div className="flex flex-col items-center gap-2 py-8">
                          <ImageOff className="h-6 w-6 text-pkt-text-tertiary" />
                          <span className="font-mono text-[11px] text-red-400">{error}</span>
                        </div>
                      )}

                      {/* NFT grid */}
                      <div className="max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-3 gap-2">
                          {nfts.map((nft) => (
                            <button
                              key={nft.tokenId}
                              onClick={() => handleSelect(nft.imageUrl)}
                              className={cn(
                                'group relative aspect-square overflow-hidden border border-pkt-border bg-pkt-bg transition-all',
                                'hover:border-pkt-accent hover:shadow-[0_0_8px_rgba(255,208,0,0.25)]',
                              )}
                            >
                              <img
                                src={nft.thumbnailUrl}
                                alt={nft.name}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                loading="lazy"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-4 opacity-0 transition-opacity group-hover:opacity-100">
                                <span className="font-mono text-[8px] uppercase tracking-wider text-white/90 line-clamp-1">
                                  {nft.name}
                                </span>
                              </div>
                            </button>
                          ))}

                          {/* Skeleton cells while loading */}
                          {loading &&
                            nfts.length === 0 &&
                            Array.from({ length: 9 }).map((_, i) => (
                              <Skeleton
                                key={`skel-${i}`}
                                className="aspect-square rounded-none border border-pkt-border"
                              />
                            ))}
                        </div>

                        {/* Load more */}
                        {hasMore && !loading && !searchQuery && (
                          <button
                            onClick={loadMore}
                            className="mt-3 flex w-full items-center justify-center gap-1.5 border border-pkt-border py-2 font-mono text-[10px] uppercase tracking-wider text-pkt-text-secondary transition-colors hover:border-pkt-accent/50 hover:text-pkt-accent"
                          >
                            Load More
                          </button>
                        )}

                        {/* Loading indicator for pagination */}
                        {loading && nfts.length > 0 && (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <Skeleton
                                key={`page-skel-${i}`}
                                className="aspect-square rounded-none border border-pkt-border"
                              />
                            ))}
                          </div>
                        )}

                        {/* Empty state */}
                        {!loading && !error && nfts.length === 0 && (
                          <div className="flex flex-col items-center gap-2 py-8">
                            <ImageOff className="h-6 w-6 text-pkt-text-tertiary" />
                            <span className="font-mono text-[11px] text-pkt-text-tertiary">No NFTs found</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </PacketCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
