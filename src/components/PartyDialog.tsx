import { useEffect, useId, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

export interface PartyDialogProps {
  label: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
  onClose?: () => void
}

export interface PartyChoiceCardProps {
  index: number
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  recommended?: boolean
  tone?: 'default' | 'danger' | 'primary'
  compact?: boolean
  disabled?: boolean
  className?: string
  onClick: () => void
}

/** Shared blue/white streetball dialog used by every in-game popup. */
export function PartyDialog({ label, title, subtitle, description, children, footer, className = '', onClose }: PartyDialogProps) {
  const titleId = useId()

  useEffect(() => {
    if (!onClose) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return <motion.div
    className="modal-backdrop party-dialog-backdrop"
    role="presentation"
    onMouseDown={(event) => {
      if (onClose && event.target === event.currentTarget) onClose()
    }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <motion.section
      className={`party-dialog ${className}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      initial={{ y: 34, opacity: 0, scale: .975 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 24, opacity: 0, scale: .985 }}
      transition={{ type: 'spring', damping: 25, stiffness: 230 }}
    >
      <div className="party-dialog__scroll">
        <header className="party-dialog__header">
          <span className="party-dialog__label">{label}</span>
          {onClose ? <button type="button" className="party-dialog__close" aria-label="关闭弹窗" onClick={onClose}><X /></button> : null}
        </header>
        <h2 id={titleId} className="party-dialog__title type-title-readable">{title}</h2>
        {subtitle ? <div className="party-dialog__subtitle">{subtitle}</div> : null}
        {description ? <p className="party-dialog__description">{description}</p> : null}
        <div className="party-dialog__content">{children}</div>
        {footer ? <footer className="party-dialog__footer">{footer}</footer> : null}
      </div>
    </motion.section>
  </motion.div>
}

export function PartyChoiceCard({ index, title, description, children, recommended = false, tone = 'default', compact = false, disabled = false, className = '', onClick }: PartyChoiceCardProps) {
  return <button
    type="button"
    className={`party-choice-card tone-${tone} ${compact ? 'is-compact' : ''} ${recommended ? 'is-recommended' : ''} ${className}`.trim()}
    disabled={disabled}
    onClick={onClick}
  >
    {recommended ? <span className="party-choice-card__recommend">★ 推荐</span> : null}
    <b className="party-choice-card__index" aria-hidden="true">{String(index).padStart(2, '0')}</b>
    <span className="party-choice-card__copy">
      <strong>{title}</strong>
      {description ? <small>{description}</small> : null}
    </span>
    {children ? <span className="party-choice-card__details">{children}</span> : null}
  </button>
}
