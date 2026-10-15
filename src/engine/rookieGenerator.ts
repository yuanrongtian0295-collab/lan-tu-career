import type { Archetype, AttributeKey, Attributes, LibraryPlayer, Position } from '../types'
import { ATTRIBUTE_LABELS } from '../data/playerLibrary'

const surnames = ['林', '赵', '陈', '周', '顾', '沈', '韩', '叶', '唐', '陆', '江', '程', '许', '梁', '蒋', '秦', '苏', '宋', '贺', '乔']
const given = ['野', '峥', '默', '骁', '川', '曜', '澈', '航', '昊', '辰', '铭', '凯', '睿', '泽', '宁', '铮', '旭', '尧', '一鸣', '景行']
const positions: Position[] = ['PG', 'SG', 'SF', 'PF', 'C']
const archetypes: Archetype[] = ['floorGeneral', 'scoringGuard', 'twoWayGuard', 'sharpshooter', 'wingScorer', 'twoWayWing', 'athleticWing', 'allAround', 'playmakingBig', 'stretchBig', 'rimProtector', 'postScorer']
const keys = Object.keys(ATTRIBUTE_LABELS) as AttributeKey[]

function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function generateRookieClass(year: number, count = 80): LibraryPlayer[] {
  const random = seeded(year * 7919 + 2026)
  const classStrength = 0.9 + random() * 0.2

  return Array.from({ length: count }, (_, index) => {
    const position = positions[Math.floor(random() * positions.length)]
    const secondary = positions[Math.max(0, Math.min(4, positions.indexOf(position) + (random() > 0.5 ? 1 : -1)))]
    const overall = Math.max(65, Math.min(86, Math.round((68 + random() * 15 + (index < 3 ? random() * 5 : 0)) * classStrength)))
    const archetype = archetypes[Math.floor(random() * archetypes.length)]
    const signature = [...keys].sort(() => random() - 0.5).slice(0, 3)
    const attributes = Object.fromEntries(keys.map((key) => {
      const signatureBoost = signature.includes(key) ? 10 + random() * 9 : 0
      return [key, Math.max(40, Math.min(92, Math.round(overall - 9 + random() * 12 + signatureBoost)))]
    })) as Attributes

    return {
      id: `rookie-${year}-${index}`,
      name: `${surnames[Math.floor(random() * surnames.length)]}${given[Math.floor(random() * given.length)]}`,
      era: 'generated' as const,
      season: `${year}-${String(year + 1).slice(2)}`,
      positions: position === secondary ? [position] : [position, secondary],
      archetype,
      overall,
      attributes,
      signature,
    }
  }).sort((a, b) => b.overall - a.overall)
}
