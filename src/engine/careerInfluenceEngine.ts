import type { NextGameModifier, SaveGame } from '../types'

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value))

export function careerGameModifiers(current: SaveGame, home: boolean): NextGameModifier[] {
  const modifiers: NextGameModifier[] = []
  const add = (id: string, label: string, values: Omit<NextGameModifier, 'id' | 'label' | 'gamesLeft'>) => modifiers.push({ id, label, gamesLeft: 1, ...values })
  const coach = current.relationships.find((relationship) => relationship.id === 'coach')
  const mentor = current.relationships.find((relationship) => relationship.id === 'mentor')
  const romance = current.relationships.find((relationship) => relationship.id === 'romance')

  if (home && current.fans >= 70) add('influence-fans', '主场球迷声浪', { offense: 1.4 })
  if (home && current.city >= 65) add('influence-city', '城市主场认同', { defense: 1.4 })
  if (current.media >= 75) add('influence-media-high', '聚光灯压力', { usage: 0.012, turnoverRisk: 0.15 })
  if (current.media <= 25) add('influence-media-low', '舆论低谷', { offense: -1, turnoverRisk: 0.2 })
  if (current.money >= 1_000_000) add('influence-support-team', '个人保障团队', { fatigue: -1, injuryRisk: -1 })
  if (current.money < 50_000) add('influence-money-stress', '资产压力', { fatigue: 1, turnoverRisk: 0.15 })

  if (current.life.professionalism >= 70) add('influence-professional', '职业习惯', { turnoverRisk: -0.3, fatigue: -1 })
  if (current.life.professionalism <= 30) add('influence-unprofessional', '准备不足', { turnoverRisk: 0.4, fatigue: 2 })
  if (current.life.ambition >= 70) add('influence-ambition', '强烈野心', { usage: 0.018, offense: 0.8, fatigue: 1 })
  if (current.life.loyalty >= 70) add('influence-loyalty', '球队归属感', { defense: 0.9, offense: 0.6 })
  if (current.life.family >= 70) add('influence-family', '家庭支持', { fatigue: -1, turnoverRisk: -0.12 })
  if (current.life.risk >= 70) add('influence-risk', '高风险倾向', { usage: 0.012, turnoverRisk: 0.35, injuryRisk: 3 })

  if (coach && coach.trust >= 70 && coach.respect >= 60) add('influence-coach', '教练授权', { minutes: 1, offense: 0.8 })
  if (mentor && mentor.trust >= 70 && mentor.respect >= 60) add('influence-mentor', '大哥默契', { offense: 0.7, defense: 0.7 })
  if (romance && romance.intimacy >= 75 && romance.tension <= 25) add('influence-intimacy', '稳定关系支持', { fatigue: -1 })
  const relationshipTension = Math.max(coach?.tension ?? 0, mentor?.tension ?? 0, romance?.tension ?? 0)
  if (relationshipTension >= 70) add('influence-tension', '关系紧张', { turnoverRisk: 0.3, fatigue: 1 })
  return modifiers
}

export function careerRotationInfluence(current: SaveGame) {
  const coach = current.relationships.find((relationship) => relationship.id === 'coach')
  const mentor = current.relationships.find((relationship) => relationship.id === 'mentor')
  const minutes = clamp(
    (current.life.professionalism - 50) / 24
      + (current.life.ambition - 50) / 35
      + ((coach?.trust ?? 50) - 50) / 25
      + ((coach?.respect ?? 50) - 50) / 36
      - (coach?.tension ?? 0) / 38
      + ((mentor?.respect ?? 50) - 50) / 55,
    -4,
    4,
  )
  return { minutes, reviewScore: minutes * 0.8 }
}

export function careerRecoveryBonus(current: SaveGame) {
  const romance = current.relationships.find((relationship) => relationship.id === 'romance')
  const energy = Math.round(clamp((current.life.family - 50) / 18 + ((romance?.intimacy ?? 50) - 50) / 30 - (romance?.tension ?? 0) / 45, -3, 5))
  const health = (current.money >= 1_000_000 ? 2 : 0) + (current.life.risk <= 30 ? 1 : 0)
  return { energy, health }
}

export function careerStoryInterval(current: SaveGame) {
  return current.media >= 72 || current.life.risk >= 70 ? 4 : current.media <= 25 && current.fans <= 25 ? 6 : 5
}

