import { describe, expect, it } from 'vitest'
import { DEFAULT_ALLOCATION, createCareerBuild } from '../engine/builderEngine'
import { EMPTY_GAME, migrateGame } from '../engine/careerState'
import type { BuilderProfile } from '../engine/builderEngine'
import { fixedNumberForPreset, getPlayerPreset, portraitIdFromLegacyNumber } from './playerPresets'

const profile: BuilderProfile = {
  name: '测试后卫', hometown: '上海', age: 19, portraitId: 'guard-23', position: 'SG', secondaryPosition: 'PG',
  height: 190, weight: 84, wingspan: 201, background: '大学明星', focus: 'scorer', allocation: { ...DEFAULT_ALLOCATION },
}

describe('预设球员身份', () => {
  it('为两张预设形象提供固定号码', () => {
    expect(fixedNumberForPreset('guard-11')).toBe(11)
    expect(fixedNumberForPreset('guard-23')).toBe(23)
  })

  it('旧号码回退时仍指向集中定义的预设图片', () => {
    expect(getPlayerPreset(portraitIdFromLegacyNumber(23)).image).toBe('/assets/players/presets/guard-23.png')
    expect(getPlayerPreset(portraitIdFromLegacyNumber(11)).image).toBe('/assets/players/presets/guard-11.png')
  })

  it('创建球员时从预设派生号码，不信任旧输入字段', () => {
    const legacyLikeProfile = { ...profile, number: 11 } as BuilderProfile
    const player = createCareerBuild(legacyLikeProfile, [])
    expect(player.portraitId).toBe('guard-23')
    expect(player.number).toBe(23)
  })

  it('旧存档按旧号码稳定迁移到预设形象', () => {
    expect(portraitIdFromLegacyNumber(23)).toBe('guard-23')
    expect(portraitIdFromLegacyNumber(11)).toBe('guard-11')
    expect(portraitIdFromLegacyNumber(undefined)).toBe('guard-11')

    const oldPlayer = { ...createCareerBuild({ ...profile, portraitId: 'guard-11' }, []), portraitId: undefined, number: 23 }
    const migrated = migrateGame({ ...EMPTY_GAME, version: 5, player: oldPlayer })
    expect(migrated.player?.portraitId).toBe('guard-23')
    expect(migrated.player?.number).toBe(23)
  })
})
