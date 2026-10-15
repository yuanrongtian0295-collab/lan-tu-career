import type { CareerPlayer, GameResult, LeaguePlayerState, RotationDecision, RotationStatus, SaveGame, SeasonStats } from '../types'
import { careerRotationInfluence } from './careerInfluenceEngine'

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value))

const ROLE_STATUS: Record<string, RotationStatus> = {
  伤病缺阵: 'development',
  发展名单: 'development',
  轮换新秀: 'deep-bench',
  深度替补: 'deep-bench',
  适应期轮换: 'rotation',
  轮换球员: 'rotation',
  第六人: 'sixth',
  首发: 'starter',
  首发核心: 'core',
}

const STATUS_MINUTES: Record<RotationStatus, [number, number]> = {
  development: [0, 5],
  'deep-bench': [4, 10],
  rotation: [11, 20],
  sixth: [22, 28],
  starter: [29, 34],
  core: [34, 38],
}

function overlapsPosition(player: CareerPlayer, candidate: LeaguePlayerState) {
  return candidate.positions.includes(player.position) || candidate.positions.includes(player.secondaryPosition)
}

function healthyDepth(current: SaveGame) {
  if (!current.player || !current.team || !current.league) return []
  return current.league.players
    .filter((candidate) => candidate.teamId === current.team?.id && !candidate.retired && overlapsPosition(current.player!, candidate))
    .sort((left, right) => (right.overall + right.form * 0.35) - (left.overall + left.form * 0.35))
}

export function isExceptionalRookieBuild(player: CareerPlayer) {
  const eliteInheritance = player.inheritances.filter((item) => item.effectiveValue >= 88).length
  const developedBadges = player.badges.filter((badge) => badge.level >= 1).length
  return player.overall >= 78 || eliteInheritance >= 3 || (player.overall >= 75 && eliteInheritance >= 1 && developedBadges >= 1)
}

function statusFromContext(current: SaveGame, depthRank: number): RotationStatus {
  const player = current.player!
  const stored = ROLE_STATUS[player.role] ?? 'deep-bench'
  const exceptional = current.careerYear === 1 && isExceptionalRookieBuild(player)

  if (current.careerYear === 1 && player.stats.games < 20) {
    if (exceptional) {
      if (player.overall >= 84 && depthRank <= 2 && player.coachTrust >= 60) return 'starter'
      if (player.overall >= 80 || player.coachTrust >= 58) return 'sixth'
      return 'rotation'
    }
    if (player.coachTrust >= 65 && player.overall >= 73) return 'rotation'
    if (player.overall < 65 || depthRank >= 5 || player.coachTrust < 38) return 'development'
    return 'deep-bench'
  }
  return stored
}

function roleLabel(status: RotationStatus) {
  return status === 'core' ? '首发核心' : status === 'starter' ? '首发' : status === 'sixth' ? '第六人' : status === 'rotation' ? '轮换球员' : status === 'deep-bench' ? '深度替补' : '发展名单'
}

export function decideRotation(current: SaveGame, random: () => number = Math.random): RotationDecision {
  if (!current.player) return { status: 'development', projectedMinutes: 0, dnp: true, closingLineup: false, reason: '尚未建立球员档案', temporaryOpportunity: false, depthRank: 99 }
  const player = current.player
  const depth = healthyDepth(current)
  const depthRank = depth.length ? 1 + depth.filter((candidate) => candidate.overall + candidate.form * 0.35 > player.overall).length : Math.max(1, Math.round((82 - player.overall) / 4))
  const injuredAhead = depth.filter((candidate, index) => index < depthRank && candidate.injury).length
  const temporaryOpportunity = injuredAhead > 0
  const status = statusFromContext(current, depthRank)
  const [minimum, maximum] = STATUS_MINUTES[status]
  const exceptional = current.careerYear === 1 && isExceptionalRookieBuild(player)
  const influence = careerRotationInfluence(current)
  const trustAdjustment = clamp((player.coachTrust - 50) / 9, -3, 4)
  const skillAdjustment = clamp((player.overall - 70) / 5, -2, 4)
  const opportunityMinutes = Math.min(6, injuredAhead * 3)
  const playoffAdjustment = current.seasonStage === 'playoffs' ? (status === 'core' || status === 'starter' || status === 'sixth' ? 1.5 : -2.5) : 0
  const variance = (random() - 0.5) * (status === 'development' || status === 'deep-bench' ? 3 : 4)
  const hardCap = current.careerYear === 1 && !exceptional && player.stats.games < 20 ? 14 : maximum + opportunityMinutes
  const projectedMinutes = Math.round(clamp((minimum + maximum) / 2 + trustAdjustment + skillAdjustment + influence.minutes + opportunityMinutes + playoffAdjustment + variance, minimum, hardCap))
  const dnpChance = status === 'development' ? 0.58 : status === 'deep-bench' ? 0.28 : status === 'rotation' && current.seasonStage === 'playoffs' ? 0.12 : 0
  const dnp = projectedMinutes < 3 || random() < Math.max(0, dnpChance - injuredAhead * 0.12)
  const minutes = dnp ? 0 : projectedMinutes
  const reason = dnp
    ? status === 'development' ? '新秀仍在发展名单，教练本场缩短轮换' : '本场轮换压缩，暂未获得出场机会'
    : temporaryOpportunity ? `同位置球员伤缺，临时获得${minutes}分钟机会` : `${roleLabel(status)}计划出场约${minutes}分钟`
  return { status, projectedMinutes: minutes, dnp, closingLineup: !dnp && (status === 'core' || status === 'starter' || (status === 'sixth' && minutes >= 26)), reason, temporaryOpportunity, depthRank }
}

function per36Impact(stats: SeasonStats) {
  if (!stats.minutes) return 0
  return (stats.points + stats.assists * 1.5 + stats.rebounds * 0.8 + stats.steals * 1.8 + stats.blocks * 1.8 - stats.turnovers) / stats.minutes * 36
}

export function reviewCareerRole(current: SaveGame, player: CareerPlayer, result: GameResult, seasonGameNumber: number) {
  if (seasonGameNumber % 5 !== 0) return player.role
  const impact = per36Impact(player.stats)
  const exceptional = isExceptionalRookieBuild(player)
  const influence = careerRotationInfluence(current)
  const availabilityPenalty = result.grade === 'DNP' ? 3 : 0
  const score = player.overall + (player.coachTrust - 50) * 0.15 + clamp(impact - 18, -8, 12) * 0.45 + influence.reviewScore - availabilityPenalty
  let role = score >= 88 ? '首发核心' : score >= 81 ? '首发' : score >= 75 ? '第六人' : score >= 67 ? '轮换球员' : score >= 61 ? '深度替补' : '发展名单'

  if (current.careerYear === 1 && seasonGameNumber <= 20) {
    const cap = exceptional ? ['发展名单', '深度替补', '轮换球员', '第六人', '首发'] : ['发展名单', '深度替补', '轮换球员']
    if (!cap.includes(role)) role = cap[cap.length - 1]
  }
  return role
}
