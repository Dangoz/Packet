'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'

const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]
const TOTAL_DURATION_MS = 3400

// Origin point — roughly where the envelope sits on the claim page
const CX = 50
const CY = 42

// ── Center Burst: 24 particles exploding outward from center ──
const BURST_PARTICLES = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * 360 + (((i * 7) % 11) - 5) // slight jitter
  const rad = (angle * Math.PI) / 180
  const dist = 140 + ((i * 17 + 3) % 9) * 20 // 140–320px
  const type = i % 3 === 0 ? 'dot' : i % 3 === 1 ? 'diamond' : 'line'
  const size = type === 'dot' ? 3 + (i % 3) : type === 'diamond' ? 5 + (i % 3) * 2 : 2
  return {
    dx: Math.cos(rad) * dist,
    dy: Math.sin(rad) * dist,
    size,
    type,
    angle,
    delay: ((i * 13) % 24) * 0.012, // 0–0.28s stagger, pseudo-shuffled
    duration: 1.0 + ((i * 5) % 5) * 0.12, // 1.0–1.48s
  }
})

// ── Edge Cascade: ambient particles drifting from edges ──
const CASCADE_DIAMONDS = [
  // Left edge
  { startX: 6, startY: 72, dx: 30, dy: -320, size: 5, delay: 0.0 },
  { startX: 9, startY: 60, dx: 20, dy: -280, size: 8, delay: 0.08 },
  { startX: 4, startY: 80, dx: 40, dy: -350, size: 6, delay: 0.2 },
  { startX: 12, startY: 55, dx: 15, dy: -260, size: 4, delay: 0.31 },
  // Right edge
  { startX: 94, startY: 68, dx: -28, dy: -310, size: 6, delay: 0.04 },
  { startX: 88, startY: 75, dx: -35, dy: -290, size: 10, delay: 0.13 },
  { startX: 92, startY: 58, dx: -18, dy: -340, size: 5, delay: 0.24 },
  { startX: 86, startY: 82, dx: -42, dy: -370, size: 8, delay: 0.38 },
  // Bottom-left
  { startX: 22, startY: 85, dx: 10, dy: -280, size: 7, delay: 0.07 },
  { startX: 16, startY: 90, dx: 25, dy: -320, size: 4, delay: 0.27 },
  { startX: 30, startY: 78, dx: -5, dy: -260, size: 9, delay: 0.43 },
  // Bottom-right
  { startX: 78, startY: 88, dx: -12, dy: -300, size: 5, delay: 0.11 },
  { startX: 70, startY: 80, dx: -22, dy: -270, size: 7, delay: 0.34 },
  { startX: 83, startY: 92, dx: -30, dy: -340, size: 4, delay: 0.52 },
  // Center-low
  { startX: 47, startY: 88, dx: -15, dy: -380, size: 6, delay: 0.17 },
]

// ── Viewport corner tick positions ──
const CORNERS = [
  { top: true, left: true, delay: 0.14 },
  { top: true, left: false, delay: 0.18 },
  { top: false, left: true, delay: 0.22 },
  { top: false, left: false, delay: 0.27 },
] as const

// ── Diagonal Slash Arms — 4 blades cutting outward from center ──
const SLASH_ARMS = [
  { angle: 45, delay: 0.0 },
  { angle: 135, delay: 0.05 },
  { angle: 225, delay: 0.02 },
  { angle: 315, delay: 0.06 },
]

// ═══════════════════════════════════════════════
// Layer 1: Grid Pulse
// ═══════════════════════════════════════════════
function GridPulse() {
  return (
    <motion.div
      className="pointer-events-none fixed inset-0"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255, 208, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 208, 0, 0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0, 1, 0] }}
      transition={{ duration: 2.0, times: [0, 0.07, 0.35, 1], ease: 'easeOut' }}
    />
  )
}

// ═══════════════════════════════════════════════
// Layer 2: Center Flash — bright radial pop
// ═══════════════════════════════════════════════
function CenterFlash() {
  return (
    <motion.div
      className="pointer-events-none fixed"
      style={{
        left: `${CX}%`,
        top: `${CY}%`,
        width: 400,
        height: 400,
        marginLeft: -200,
        marginTop: -200,
        background: 'radial-gradient(circle, rgba(255, 208, 0, 0.35) 0%, rgba(255, 208, 0, 0.08) 40%, transparent 70%)',
      }}
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: [0.3, 1.8, 2.5], opacity: [0, 1, 0] }}
      transition={{ duration: 1.1, ease: EXPO_OUT }}
    />
  )
}

// ═══════════════════════════════════════════════
// Layer 3: Diagonal Slash Arms
// ═══════════════════════════════════════════════
function DigitalWaves() {
  return (
    <>
      {SLASH_ARMS.map((arm, i) => {
        const rad = (arm.angle * Math.PI) / 180
        const translateX = Math.cos(rad) * 40
        const translateY = Math.sin(rad) * 40

        return (
          <motion.div
            key={`sa${i}`}
            className="pointer-events-none fixed"
            style={{
              left: `${CX}%`,
              top: `${CY}%`,
              width: 160,
              height: 2,
              marginLeft: -80,
              marginTop: -1,
              transformOrigin: 'center center',
              rotate: `${arm.angle}deg`,
              background: 'var(--pkt-accent)',
              boxShadow: '0 0 8px rgba(255,208,0,0.6), 0 0 16px rgba(255,208,0,0.3)',
            }}
            initial={{ scaleX: 0, opacity: 0.9, x: 0, y: 0 }}
            animate={{
              scaleX: [0, 1],
              opacity: [0.9, 0],
              x: [0, translateX],
              y: [0, translateY],
            }}
            transition={{
              duration: 1.0,
              delay: arm.delay,
              scaleX: { duration: 1.0, ease: EXPO_OUT },
              opacity: { duration: 1.0, ease: 'easeOut' },
              x: { duration: 1.0, ease: EXPO_OUT },
              y: { duration: 1.0, ease: EXPO_OUT },
            }}
          />
        )
      })}
    </>
  )
}

// ═══════════════════════════════════════════════
// Layer 4: Center Burst — particles from center
// ═══════════════════════════════════════════════
function CenterBurst() {
  return (
    <>
      {BURST_PARTICLES.map((p, i) => {
        // Dot — small solid gold circle
        if (p.type === 'dot') {
          return (
            <motion.div
              key={`b${i}`}
              className="pointer-events-none fixed rounded-full bg-pkt-accent"
              style={{
                left: `${CX}%`,
                top: `${CY}%`,
                width: p.size,
                height: p.size,
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2,
                boxShadow: '0 0 4px rgba(255,208,0,0.6)',
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{ x: p.dx, y: p.dy, opacity: [1, 1, 0], scale: [0, 1.2, 0.6] }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: EXPO_OUT,
                opacity: { duration: p.duration, times: [0, 0.3, 1] },
              }}
            />
          )
        }

        // Diamond — small rotated square outline
        if (p.type === 'diamond') {
          return (
            <motion.div
              key={`b${i}`}
              className="pointer-events-none fixed rotate-45 border border-pkt-accent"
              style={{
                left: `${CX}%`,
                top: `${CY}%`,
                width: p.size,
                height: p.size,
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{ x: p.dx, y: p.dy, opacity: [1, 1, 0], scale: [0, 1, 0.5] }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: EXPO_OUT,
                opacity: { duration: p.duration, times: [0, 0.3, 1] },
              }}
            />
          )
        }

        // Line — thin radial streak
        return (
          <motion.div
            key={`b${i}`}
            className="pointer-events-none fixed bg-pkt-accent/70"
            style={{
              left: `${CX}%`,
              top: `${CY}%`,
              width: p.size,
              height: 12 + (i % 4) * 4,
              marginLeft: -p.size / 2,
              marginTop: -6,
              transformOrigin: 'center center',
              rotate: `${p.angle}deg`,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scaleY: 0 }}
            animate={{ x: p.dx, y: p.dy, opacity: [1, 0.8, 0], scaleY: [0, 1, 0.5] }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: EXPO_OUT,
              opacity: { duration: p.duration, times: [0, 0.3, 1] },
            }}
          />
        )
      })}
    </>
  )
}

// ═══════════════════════════════════════════════
// Layer 5: Edge Cascade — ambient drifting diamonds
// ═══════════════════════════════════════════════
function EdgeCascade() {
  return (
    <>
      {CASCADE_DIAMONDS.map((d, i) => (
        <motion.div
          key={i}
          className="pointer-events-none fixed rotate-45 border border-pkt-accent bg-pkt-accent/20"
          style={{
            width: d.size,
            height: d.size,
            left: `${d.startX}%`,
            top: `${d.startY}%`,
            boxShadow: d.size >= 8 ? '0 0 6px rgba(255,208,0,0.4)' : 'none',
          }}
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: d.dx,
            y: d.dy,
          }}
          transition={{
            duration: 2.0 + (i % 3) * 0.3,
            delay: d.delay,
            opacity: {
              duration: 2.0 + (i % 3) * 0.3,
              times: [0, 0.15, 0.5, 1],
              ease: 'easeOut',
            },
            x: { duration: 2.0 + (i % 3) * 0.3, ease: EXPO_OUT },
            y: { duration: 2.0 + (i % 3) * 0.3, ease: EXPO_OUT },
          }}
        />
      ))}
    </>
  )
}

// ═══════════════════════════════════════════════
// Layer 6: Viewport Corner Ticks
// ═══════════════════════════════════════════════
function ViewportCornerTicks() {
  return (
    <>
      {CORNERS.map((corner, i) => (
        <motion.div
          key={i}
          className="pointer-events-none fixed h-6 w-6"
          style={{
            top: corner.top ? 20 : undefined,
            bottom: corner.top ? undefined : 20,
            left: corner.left ? 20 : undefined,
            right: corner.left ? undefined : 20,
            borderTop: corner.top ? '2px solid var(--pkt-accent)' : 'none',
            borderBottom: corner.top ? 'none' : '2px solid var(--pkt-accent)',
            borderLeft: corner.left ? '2px solid var(--pkt-accent)' : 'none',
            borderRight: corner.left ? 'none' : '2px solid var(--pkt-accent)',
          }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0, 1, 0], scale: [0.7, 1, 1] }}
          transition={{ duration: 1.4, delay: corner.delay, ease: EXPO_OUT }}
        />
      ))}
    </>
  )
}

// ═══════════════════════════════════════════════
// Composed Overlay
// ═══════════════════════════════════════════════
export function FireworksOverlay() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), TOTAL_DURATION_MS)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <GridPulse />
      <CenterFlash />
      <DigitalWaves />
      <CenterBurst />
      <EdgeCascade />
      <ViewportCornerTicks />
    </div>
  )
}
