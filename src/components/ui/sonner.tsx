'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast !rounded-none !border-pkt-border !bg-[#0a0a0a]/95 !backdrop-blur-xl !font-mono !text-pkt-text !shadow-[0_0_20px_rgba(0,0,0,0.5)]',
          title: '!text-pkt-text !text-xs !font-bold !uppercase !tracking-wider',
          description: '!text-pkt-text-secondary !text-[11px] !font-mono',
          actionButton: '!bg-pkt-accent !text-black !font-mono !text-[10px] !uppercase !tracking-wider !rounded-none',
          cancelButton:
            '!bg-transparent !text-pkt-text-tertiary !font-mono !text-[10px] !uppercase !tracking-wider !rounded-none',
        },
      }}
      style={
        {
          '--normal-bg': '#0a0a0a',
          '--normal-text': 'var(--pkt-text)',
          '--normal-border': 'var(--pkt-border)',
          '--border-radius': '0px',
        } as React.CSSProperties
      }
      duration={8000}
      {...props}
    />
  )
}

export { Toaster }
