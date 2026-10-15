import type { Position } from '../types'

export type PlayerPortraitId = 'guard-11' | 'guard-23'

export interface PlayerPreset {
  id: PlayerPortraitId
  number: 11 | 23
  label: string
  role: string
  position: Position
  secondaryPosition: Position
  image: string
  accent: string
  description: string
}

/**
 * The visual identity and jersey number are one immutable preset. Keep this
 * table as the single source of truth for onboarding and save migrations.
 */
export const PLAYER_PRESETS: readonly PlayerPreset[] = [
  {
    id: 'guard-11',
    number: 11,
    label: '11号后卫',
    role: '持球创造者',
    position: 'PG',
    secondaryPosition: 'SG',
    image: '/assets/players/presets/guard-11.png',
    accent: '#00c5ff',
    description: '第一步、传球视野与快攻节奏',
  },
  {
    id: 'guard-23',
    number: 23,
    label: '23号后卫',
    role: '双能得分手',
    position: 'SG',
    secondaryPosition: 'PG',
    image: '/assets/players/presets/guard-23.png',
    accent: '#ffd400',
    description: '中距离、对抗终结与外线压迫',
  },
] as const

export const DEFAULT_PLAYER_PRESET_ID: PlayerPortraitId = 'guard-11'

export function getPlayerPreset(id?: string | null): PlayerPreset {
  return PLAYER_PRESETS.find((preset) => preset.id === id) ?? PLAYER_PRESETS[0]
}

export function portraitIdFromLegacyNumber(number?: number | null): PlayerPortraitId {
  return number === 23 ? 'guard-23' : DEFAULT_PLAYER_PRESET_ID
}

export function fixedNumberForPreset(id?: string | null) {
  return getPlayerPreset(id).number
}
