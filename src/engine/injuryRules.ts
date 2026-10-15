import type { InjuryState } from '../types'

export const PLAY_THROUGH_LIMIT = 3

export function normalizeInjuryName(name: string) {
  const seasonEnding = name.includes('赛季报销')
  const cleaned = name
    .replace(/（?赛季报销）?/g, '')
    .replace(/(?:加重)+$/g, '加重')
    .trim() || '伤势'
  return seasonEnding ? `${cleaned}（赛季报销）` : cleaned
}

export function worsenInjuryName(name: string) {
  const base = normalizeInjuryName(name)
    .replace(/（赛季报销）$/g, '')
    .replace(/(?:加重)+$/g, '')
  return `${base}加重`
}

export function normalizeInjuryMessage(message: string) {
  return message.replace(/(?:加重){2,}/g, '加重')
}

export function isMedicallyUnavailable(injury: InjuryState | null | undefined) {
  return Boolean(injury?.restriction)
}

export function injuryRestrictionLabel(injury: InjuryState | null | undefined) {
  if (injury?.restriction === 'season-ending') return '赛季报销'
  if (injury?.restriction === 'medical-dnp') return '强制DNP'
  return null
}

export function applyPlayThroughLimit(injury: InjuryState, health: number, remainingSeasonGames: number): InjuryState {
  const normalized = injury.name === normalizeInjuryName(injury.name) ? injury : { ...injury, name: normalizeInjuryName(injury.name) }
  if (normalized.restriction || normalized.playedThrough < PLAY_THROUGH_LIMIT) return normalized

  const seasonEnding = normalized.severity === 3 || normalized.reinjuryRisk >= 68 || health <= 42
  if (seasonEnding) {
    return {
      ...normalized,
      name: `${normalizeInjuryName(normalized.name).replace(/（赛季报销）$/g, '')}（赛季报销）`,
      gamesLeft: Math.max(normalized.gamesLeft, remainingSeasonGames + 28),
      severity: 3,
      reinjuryRisk: Math.max(90, normalized.reinjuryRisk),
      restriction: 'season-ending',
    }
  }

  return {
    ...normalized,
    gamesLeft: Math.max(normalized.gamesLeft, 4 + normalized.severity * 2),
    reinjuryRisk: Math.max(60, normalized.reinjuryRisk),
    restriction: 'medical-dnp',
  }
}
