import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export type StickerNumberSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero'

export interface StickerNumberProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  value: string | number
  size?: StickerNumberSize
  label?: string
}

const DIGIT_RUN = /\d+|[^\d]+/g

export function splitStickerNumber(value: string | number) {
  const text = String(value)
  return (text.match(DIGIT_RUN) ?? [text]).map((part) => ({ part, digits: /^\d+$/.test(part) }))
}

/**
 * Keeps the dedicated numeric font isolated from punctuation and CJK copy.
 * The wrapper owns the accessible label while visual fragments stay hidden.
 */
export function StickerNumber({ value, size = 'md', label, className = '', ...props }: StickerNumberProps) {
  const text = String(value)
  const parts = splitStickerNumber(text)
  return <span {...props} className={`sticker-number sticker-number-${size} ${className}`.trim()} aria-label={label ?? text}>
    <span aria-hidden="true">{parts.map(({ part, digits }, index) => digits
      ? <span className="sticker-number-digits" key={`${part}-${index}`}>{part}</span>
      : <span className="sticker-number-separator" key={`${part}-${index}`}>{part}</span>)}</span>
  </span>
}

export interface ReadableTitleProps {
  as?: 'h1' | 'h2'
  children: ReactNode
  className?: string
  fixed?: boolean
}

/** Fixed titles may use the complete generated graffiti font; dynamic copy never does. */
export function ReadableTitle({ as: Tag = 'h2', children, className = '', fixed = false }: ReadableTitleProps) {
  return <Tag className={`${fixed ? 'type-title-fixed' : 'type-title-readable'} ${className}`.trim()}>{children}</Tag>
}
