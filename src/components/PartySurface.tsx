import { createElement, type CSSProperties, type ElementType, type ReactNode } from 'react'
import { PARTY_SKINS, type PartySkinName, type PartySkinPage } from '../theme/partySkins.generated'

type SkinStyle = CSSProperties & {
  '--party-skin-url': string
  '--party-safe-top': string
  '--party-safe-right': string
  '--party-safe-bottom': string
  '--party-safe-left': string
  '--party-slice': string
}

type PartySurfaceProps<P extends PartySkinPage> = {
  page: P
  skin: PartySkinName<P>
  as?: ElementType
  className?: string
  children?: ReactNode
  style?: CSSProperties
  [key: string]: any
}

export function PartySurface<P extends PartySkinPage>({
  page,
  skin,
  as = 'div',
  className = '',
  children,
  style,
  ...props
}: PartySurfaceProps<P>) {
  const spec = PARTY_SKINS[page][skin] as (typeof PARTY_SKINS)[P][PartySkinName<P>] & {
    src: string
    mode: 'nine-slice' | 'fixed-aspect' | 'decorative'
    safeArea: { top: number; right: number; bottom: number; left: number }
    slice: number | null
  }
  const skinStyle: SkinStyle = {
    ...style,
    '--party-skin-url': `url("${spec.src}")`,
    '--party-safe-top': `${spec.safeArea.top * 100}%`,
    '--party-safe-right': `${spec.safeArea.right * 100}%`,
    '--party-safe-bottom': `${spec.safeArea.bottom * 100}%`,
    '--party-safe-left': `${spec.safeArea.left * 100}%`,
    '--party-slice': String(spec.slice ?? 0),
  }

  return createElement(as, {
    ...props,
    className: `party-surface ${className}`.trim(),
    'data-party-skin': `${page}.${String(skin)}`,
    'data-party-skin-mode': spec.mode,
    style: skinStyle,
  }, children)
}
