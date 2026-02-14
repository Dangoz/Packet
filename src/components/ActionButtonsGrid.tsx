import { motion } from 'motion/react'
import { ActionButton } from './ActionButton'

interface ActionButtonsGridProps {
  onSendClick: () => void
  onReceiveClick: () => void
  onBatchClick?: () => void
}

export function ActionButtonsGrid({ onSendClick, onReceiveClick, onBatchClick }: ActionButtonsGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="grid grid-cols-3 gap-4 mb-12"
    >
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <ActionButton type="send" onClick={onSendClick} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <ActionButton type="batch" onClick={onBatchClick || (() => {})} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
      >
        <ActionButton type="receive" onClick={onReceiveClick} />
      </motion.div>
    </motion.div>
  )
}
