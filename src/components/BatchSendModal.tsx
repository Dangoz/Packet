import { useState } from 'react'
import { motion } from 'motion/react'
import { Modal } from './Modal'
import { Input } from './Input'
import { LiquidGlassButton } from './LiquidGlassButton'
import { useBatchSendRaw, type Recipient } from '@/hooks/useBatchSendRaw'

interface BatchSendModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BatchSendModal({ isOpen, onClose }: BatchSendModalProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([
    { email: 'a@canteen.com', amount: '1' },
    { email: 'katie@canteen.com', amount: '2' },
  ])
  const { sendBatch, result, reset } = useBatchSendRaw()

  const addRecipient = () => {
    if (recipients.length < 5) {
      setRecipients([...recipients, { email: '', amount: '' }])
    }
  }

  const removeRecipient = (index: number) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index))
    }
  }

  const updateRecipient = (index: number, field: keyof Recipient, value: string) => {
    const updated = [...recipients]
    updated[index] = { ...updated[index], [field]: value }
    setRecipients(updated)
  }

  const handleSend = async () => {
    const validRecipients = recipients.filter((r) => r.email && r.amount)
    if (validRecipients.length > 0) {
      await sendBatch(validRecipients)
    }
  }

  const handleClose = () => {
    reset()
    setRecipients([{ email: '', amount: '' }])
    onClose()
  }

  const totalAmount = recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toFixed(2)

  const validRecipients = recipients.filter((r) => r.email && r.amount)
  const isSending = result.status === 'building' || result.status === 'signing' || result.status === 'broadcasting'
  const hasResult = result.status === 'success' || result.status === 'error'
  const isSuccess = result.status === 'success'

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Batch Send">
      <div className="space-y-6">
        {hasResult ? (
          /* Results View */
          <div className="space-y-4">
            <div className={`text-center p-4 rounded-lg ${isSuccess ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <div className="text-2xl mb-2">{isSuccess ? '✓' : '✗'}</div>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {isSuccess ? `Batch transaction sent with ${validRecipients.length} transfers` : 'Transaction failed'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {isSuccess ? 'All transfers executed atomically in a single transaction!' : result.error}
              </p>
            </div>

            {/* Single transaction link for atomic batch */}
            {isSuccess && result.txHash && (
              <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <a
                  href={`https://explore.tempo.xyz/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:underline"
                >
                  View transaction on explorer →
                </a>
              </div>
            )}

            <LiquidGlassButton onClick={handleClose} fullWidth>
              <span className="uppercase tracking-wider">Done</span>
            </LiquidGlassButton>
          </div>
        ) : (
          /* Input Form */
          <div className="space-y-4">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recipients.map((recipient, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg relative"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  {/* Nonce Key Badge */}
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-blue-500/30 border border-blue-400/50 flex items-center justify-center">
                    <span className="text-xs font-mono text-blue-300">{index + 1}</span>
                  </div>

                  {recipients.length > 1 && (
                    <button
                      onClick={() => removeRecipient(index)}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/10"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      ×
                    </button>
                  )}

                  <div className="space-y-3 mt-2">
                    <Input
                      label="Email"
                      value={recipient.email}
                      onChange={(v) => updateRecipient(index, 'email', v)}
                      placeholder="recipient@email.com"
                    />
                    <Input
                      label="Amount"
                      type="number"
                      value={recipient.amount}
                      onChange={(v) => updateRecipient(index, 'amount', v)}
                      placeholder="0.00"
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {recipients.length < 5 && (
              <button
                onClick={addRecipient}
                className="w-full py-3 border border-dashed rounded-lg text-sm transition-colors hover:bg-white/5"
                style={{
                  borderColor: 'var(--glass-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                + Add Recipient ({recipients.length}/5)
              </button>
            )}

            <div className="flex justify-between text-sm px-1" style={{ color: 'var(--text-secondary)' }}>
              <span>Total:</span>
              <span style={{ color: 'var(--text-primary)' }}>${totalAmount}</span>
            </div>

            <LiquidGlassButton
              onClick={handleSend}
              fullWidth
              className="py-3"
              disabled={isSending || validRecipients.length === 0}
            >
              {isSending ? (
                <span className="uppercase tracking-wider">
                  {result.status === 'building' && 'Building tx...'}
                  {result.status === 'signing' && 'Signing...'}
                  {result.status === 'broadcasting' && 'Broadcasting...'}
                </span>
              ) : (
                <span className="uppercase tracking-wider">Send to {validRecipients.length} Recipients</span>
              )}
            </LiquidGlassButton>
          </div>
        )}
      </div>
    </Modal>
  )
}
