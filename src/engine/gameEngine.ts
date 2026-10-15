import type { CareerPlayer, GameResult, NextGameModifier, RotationDecision, SaveGame, SeasonStats, Team } from '../types'
import { applyPlayThroughLimit, isMedicallyUnavailable } from './injuryRules'
import { decideRotation } from './rotationEngine'
import { careerGameModifiers } from './careerInfluenceEngine'

type RandomSource = () => number

function normal(mean: number, spread: number, random: RandomSource = Math.random) {
  const u = Math.max(random(), 0.0001)
  const v = Math.max(random(), 0.0001)
  return mean + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * spread
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const average = (...values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

interface BadgeGameEffects {
  finishing: number
  shooting: number
  playmaking: number
  creation: number
  ballSecurity: number
  spacing: number
  defense: number
  rimProtection: number
  clutch: number
  chemistry: number
}

const EMPTY_BADGE_EFFECTS: BadgeGameEffects = {
  finishing: 0,
  shooting: 0,
  playmaking: 0,
  creation: 0,
  ballSecurity: 0,
  spacing: 0,
  defense: 0,
  rimProtection: 0,
  clutch: 0,
  chemistry: 0,
}

const BADGE_LEVEL_POWER = [0, 0.75, 1.25, 1.85, 2.6]

const BADGE_GAME_EFFECTS: Record<string, Partial<BadgeGameEffects>> = {
  'iron-finish': { finishing: 1.1 },
  'air-adjust': { finishing: 0.85 },
  'deep-threat': { shooting: 1.15, spacing: 0.55 },
  'pressure-shot': { shooting: 0.45, clutch: 1.1 },
  'first-step': { finishing: 0.5, creation: 1, ballSecurity: 0.25 },
  'surgeon-pass': { playmaking: 1.2, ballSecurity: 0.55 },
  'chain-lock': { defense: 1.25 },
  'help-instinct': { defense: 0.75, rimProtection: 0.9 },
  clutch: { clutch: 1.35 },
  'locker-glue': { chemistry: 1.1 },
}

function badgeGameEffects(player: CareerPlayer): BadgeGameEffects {
  return player.badges.reduce<BadgeGameEffects>((result, badge) => {
    const definition = BADGE_GAME_EFFECTS[badge.id]
    const levelPower = BADGE_LEVEL_POWER[badge.level] ?? 0
    if (!definition || levelPower === 0) return result
    for (const [key, value] of Object.entries(definition) as [keyof BadgeGameEffects, number][]) {
      result[key] += value * levelPower
    }
    return result
  }, { ...EMPTY_BADGE_EFFECTS })
}

interface SkillProfile {
  finishing: number
  shooting: number
  playmaking: number
  rebounding: number
  defense: number
  rimProtection: number
  athleticism: number
  ballSecurity: number
  offense: number
}

function createSkillProfile(player: CareerPlayer, badges: BadgeGameEffects): SkillProfile {
  const a = player.attributes
  const finishing = average(a.closeShot, a.layup, a.drivingDunk, a.standingDunk, a.postControl, a.strength) + badges.finishing
  const shooting = average(a.midRange, a.threePoint, a.freeThrow, a.shotStability) + badges.shooting
  const playmaking = average(a.passAccuracy, a.vision, a.ballHandle, a.speedWithBall) + badges.playmaking
  const rebounding = average(a.offensiveRebound, a.defensiveRebound, a.vertical)
  const rimProtection = average(a.interiorDefense, a.block, a.helpDefense, a.strength) + badges.rimProtection
  const defense = average(a.perimeterDefense, a.interiorDefense, a.steal, a.block, a.helpDefense, a.defensiveRebound) + badges.defense
  const athleticism = average(a.speed, a.acceleration, a.strength, a.vertical, a.stamina)
  const ballSecurity = average(a.ballHandle, a.passAccuracy, a.vision) + badges.ballSecurity
  return {
    finishing,
    shooting,
    playmaking,
    rebounding,
    defense,
    rimProtection,
    athleticism,
    ballSecurity,
    offense: finishing * 0.3 + shooting * 0.34 + playmaking * 0.3 + athleticism * 0.06,
  }
}

function simulatePossessionScore(possessions: number, offensiveRating: number, threePointBias: number, random: RandomSource) {
  const pointsPerPossession = offensiveRating / 100
  const onePointProbability = 0.055
  const threePointProbability = clamp(0.115 + threePointBias + (offensiveRating - 108) * 0.0005, 0.075, 0.17)
  const twoPointProbability = clamp((pointsPerPossession - onePointProbability - threePointProbability * 3) / 2, 0.22, 0.44)
  let score = 0

  for (let possession = 0; possession < possessions; possession += 1) {
    const roll = random()
    if (roll < onePointProbability) score += 1
    else if (roll < onePointProbability + twoPointProbability) score += 2
    else if (roll < onePointProbability + twoPointProbability + threePointProbability) score += 3
  }
  return score
}

export function calculateOverall(player: Pick<CareerPlayer, 'attributes' | 'position'>) {
  const a = player.attributes
  const weights = player.position === 'PG'
    ? [a.ballHandle, a.passAccuracy, a.vision, a.speedWithBall, a.threePoint, a.perimeterDefense]
    : player.position === 'C'
      ? [a.interiorDefense, a.block, a.defensiveRebound, a.closeShot, a.strength, a.postControl]
      : [a.layup, a.threePoint, a.midRange, a.perimeterDefense, a.speed, a.helpDefense]
  return Math.round(weights.reduce((sum, value) => sum + value, 0) / weights.length)
}

export interface GameSimulationOptions {
  rotation?: RotationDecision
  modifiers?: NextGameModifier[]
}

export function simulateGame(player: CareerPlayer, team: Team, opponent: Team, home: boolean, tactic = 'balanced', random: RandomSource = Math.random, options: GameSimulationOptions = {}): GameResult {
  const isUnavailable = player.role === '伤病缺阵'
  const roleMinutes = player.role === '首发核心' ? 35 : player.role === '首发' ? 31 : player.role === '第六人' ? 27 : 20
  const healthFactor = clamp(player.health / 100, 0.35, 1)
  const modifier = (options.modifiers ?? []).reduce((total, item) => ({
    minutes: total.minutes + (item.minutes ?? 0), usage: total.usage + (item.usage ?? 0), offense: total.offense + (item.offense ?? 0), defense: total.defense + (item.defense ?? 0), turnoverRisk: total.turnoverRisk + (item.turnoverRisk ?? 0),
  }), { minutes: 0, usage: 0, offense: 0, defense: 0, turnoverRisk: 0 })
  const baseMinutes = options.rotation ? options.rotation.projectedMinutes + modifier.minutes : normal(roleMinutes + (player.coachTrust - 50) / 12 + (player.attributes.stamina - 70) * 0.035, 3.4, random)
  const projectedMinutes = clamp(baseMinutes, options.rotation?.dnp ? 0 : 4, 44)
  const minutes = isUnavailable || options.rotation?.dnp ? 0 : Math.round(projectedMinutes * healthFactor)
  const minuteImpact = minutes / 32
  const badges = badgeGameEffects(player)
  const skills = createSkillProfile(player, badges)
  const a = player.attributes
  const condition = clamp(0.62 + player.energy * 0.0018 + player.health * 0.0014 + player.morale * 0.0005 + a.stamina * 0.00025 + a.durability * 0.00015, 0.72, 1.06)
  const effectiveOffense = 55 + (skills.offense - 55) * condition
  const effectiveDefense = 55 + (skills.defense - 55) * condition
  const usage = clamp((tactic === 'attack' ? 0.34 : tactic === 'pass' ? 0.22 : 0.27) + modifier.usage, 0.16, 0.42)
  const tacticFit = tactic === 'attack'
    ? (skills.finishing * 0.55 + skills.shooting * 0.45 - 70) * 0.035 + badges.creation * 0.2
    : tactic === 'pass'
      ? (skills.playmaking - 70) * 0.05 + badges.playmaking * 0.24
      : (a.leadership - 70) * 0.015
  const tacticDefenseCost = tactic === 'attack' ? 0.75 : tactic === 'pass' ? 0.1 : 0
  const badgeOffense = badges.finishing * 0.32 + badges.shooting * 0.4 + badges.playmaking * 0.34 + badges.creation * 0.28 + badges.spacing * 0.3
  const badgeDefense = badges.defense * 0.52 + badges.rimProtection * 0.42
  const playerOffenseImpact = ((effectiveOffense - 76) * 0.18 + badgeOffense + modifier.offense) * minuteImpact
  const playerDefenseImpact = ((effectiveDefense - 76) * 0.15 + badgeDefense + modifier.defense) * minuteImpact
  const chemistryImpact = ((a.leadership - 70) * 0.018 + badges.chemistry * 0.42) * minuteImpact
  const conditionImpact = (condition - 0.98) * 9 * minuteImpact
  const teamBaseRating = 108 + (team.strength - 85) * 0.72 - (opponent.strength - 85) * 0.32
  const opponentBaseRating = 108 + (opponent.strength - 85) * 0.72 - (team.strength - 85) * 0.32
  const teamOffensiveRating = clamp(teamBaseRating + playerOffenseImpact + chemistryImpact + conditionImpact + tacticFit * minuteImpact + (home ? 2.2 : 0), 88, 128)
  const opponentOffensiveRating = clamp(opponentBaseRating - playerDefenseImpact + tacticDefenseCost * minuteImpact - (home ? 0.4 : 0), 88, 128)
  const possessions = Math.round(clamp((team.pace + opponent.pace) / 2 + normal(0, 2.6, random), 90, 108))
  const threePointBias = clamp((skills.shooting - 75) * 0.0008 + badges.spacing * 0.002 + (tactic === 'attack' ? 0.006 : tactic === 'pass' ? -0.002 : 0), -0.018, 0.025)
  let teamScore = simulatePossessionScore(possessions, teamOffensiveRating, threePointBias, random)
  let opponentScore = simulatePossessionScore(possessions, opponentOffensiveRating, 0, random)

  if (minutes > 0 && Math.abs(teamScore - opponentScore) <= 8) {
    const clutchSkill = a.clutch * 0.65 + a.leadership * 0.35
    const clutchEdge = ((clutchSkill - 70) * 0.035 + badges.clutch * 0.45) * minuteImpact * condition
    teamScore += Math.round(clamp(normal(clutchEdge, 1.1, random), -2, 4))
  }
  teamScore = Math.max(60, teamScore)
  opponentScore = Math.max(60, opponentScore)
  if (teamScore === opponentScore) {
    if (home) teamScore += 1
    else opponentScore += 1
  }

  const scoringSkill = skills.finishing * 0.44 + skills.shooting * 0.56
  const pointsMean = minutes * usage * (scoringSkill / 45) * (tactic === 'attack' ? 1.06 : tactic === 'pass' ? 0.9 : 1) * condition
  const assistsMean = minutes * (skills.playmaking / 100) * (tactic === 'pass' ? 0.32 : tactic === 'attack' ? 0.17 : 0.22) + badges.playmaking * 0.2
  const reboundsMean = minutes * (skills.rebounding / 100) * 0.17
  const turnoversMean = minutes * usage * (1.48 - clamp(skills.ballSecurity, 40, 105) / 100) * 0.29 + (tactic === 'attack' ? 0.45 : tactic === 'pass' ? -0.12 : 0) + modifier.turnoverRisk
  const points = minutes === 0 ? 0 : Math.round(clamp(normal(pointsMean, 4.2, random), 0, Math.min(55, teamScore * 0.55)))
  const assists = minutes === 0 ? 0 : Math.round(clamp(normal(assistsMean, 1.9, random), 0, 19))
  const rebounds = minutes === 0 ? 0 : Math.round(clamp(normal(reboundsMean, 1.9, random), 0, 20))
  const steals = minutes === 0 ? 0 : Math.round(clamp(normal(minutes * (skills.defense / 100) * 0.035, 0.78, random), 0, 7))
  const blocks = minutes === 0 ? 0 : Math.round(clamp(normal(minutes * (skills.rimProtection / 100) * 0.026, 0.7, random), 0, 8))
  const turnovers = minutes === 0 ? 0 : Math.round(clamp(normal(turnoversMean, 0.9, random), 0, 8))
  const win = teamScore > opponentScore
  const gradeScore = points + assists * 1.6 + rebounds + steals * 2.2 + blocks * 2.2 - turnovers * 2 + (win ? 5 : 0)
  const grade = minutes === 0 ? 'DNP' : gradeScore > 43 ? 'A+' : gradeScore > 34 ? 'A' : gradeScore > 27 ? 'B+' : gradeScore > 20 ? 'B' : gradeScore > 13 ? 'C+' : 'C'
  const timeline = minutes === 0 ? [
    `${player.name}本场未进入轮换，留在场边观察比赛。`,
    '第二节教练组继续沿用当前轮换。',
    '第三节替补席根据比赛走势准备应变。',
    win ? `${team.city}${team.name}完成比赛并拿下胜利。` : `${opponent.city}${opponent.name}掌控末段并赢下比赛。`,
  ] : [
    `首节 ${player.name} 登场，主教练要求优先控制失误。`,
    points > 20 ? `第三节连续得分，个人得分来到 ${Math.max(12, points - 7)} 分。` : '第三节球队通过防守重新进入比赛。',
    assists > 7 ? `末节送出第 ${assists} 次助攻，弱侧空位被准确找到。` : '末节两队进入半场阵地战。',
    win ? `${team.city}${team.name}守住最后一次防守，拿下胜利。` : `${opponent.city}${opponent.name}在最后两分钟拉开分差。`,
  ]

  return {
    id: crypto.randomUUID(), opponent, home, teamScore, opponentScore, win, minutes,
    points, rebounds, assists, steals, blocks, turnovers, grade, timeline,
    headline: minutes === 0 ? `${player.name}本场DNP，球队${win ? '取胜' : '失利'}` : win ? `${player.name}贡献${points}分，${team.city}${team.name}拿下胜利` : `${player.name}得到${points}分，球队遗憾告负`,
    rotation: options.rotation ? { ...options.rotation, projectedMinutes: minutes } : undefined,
  }
}

export type LiveEventTone = 'neutral' | 'player' | 'team' | 'opponent' | 'clutch'

export interface LiveTeamBoxStats {
  fieldGoalsMade: number
  fieldGoalsAttempted: number
  threePointersMade: number
  threePointersAttempted: number
  freeThrowsMade: number
  freeThrowsAttempted: number
  rebounds: number
  assists: number
  turnovers: number
  fastBreakPoints: number
  paintPoints: number
}

export interface LiveGameEvent {
  id: string
  quarter: number
  clock: string
  teamScore: number
  opponentScore: number
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  teamStats: LiveTeamBoxStats
  opponentStats: LiveTeamBoxStats
  text: string
  tone: LiveEventTone
}

export interface LiveGameSession {
  result: GameResult
  events: LiveGameEvent[]
}

const formatClock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

function progressValue(finalValue: number, progress: number, previous: number) {
  return Math.max(previous, Math.min(finalValue, Math.round(finalValue * progress)))
}

function createFinalTeamBox(score: number, strength: number): LiveTeamBoxStats {
  const fieldGoalsAttempted = Math.round(clamp(82 + (score - 100) * .18 + (strength - 85) * .12, 76, 96))
  const threePointersAttempted = Math.round(clamp(fieldGoalsAttempted * .38, 22, 42))
  const freeThrowsAttempted = Math.round(clamp(16 + (score - 95) * .11, 12, 30))
  const threeRate = clamp(.32 + (strength - 80) * .002, .29, .43)
  const freeThrowRate = clamp(.74 + (strength - 80) * .002, .7, .88)
  const threePointersMade = Math.round(threePointersAttempted * threeRate)
  const freeThrowsMade = Math.round(freeThrowsAttempted * freeThrowRate)
  const twoPointersMade = Math.max(0, Math.round((score - threePointersMade * 3 - freeThrowsMade) / 2))
  const fieldGoalsMade = Math.min(fieldGoalsAttempted, twoPointersMade + threePointersMade)
  return {
    fieldGoalsMade,
    fieldGoalsAttempted,
    threePointersMade,
    threePointersAttempted,
    freeThrowsMade,
    freeThrowsAttempted,
    rebounds: Math.round(clamp(41 + (strength - 85) * .16 + (105 - score) * .035, 32, 54)),
    assists: Math.round(clamp(fieldGoalsMade * (.54 + (strength - 80) * .003), 16, 34)),
    turnovers: Math.round(clamp(14 - (strength - 82) * .08, 8, 17)),
    fastBreakPoints: Math.round(clamp(10 + (score - 95) * .12, 7, 24)),
    paintPoints: Math.round(clamp(score * .43, 28, 62)),
  }
}

function createTeamBoxSnapshot(finalStats: LiveTeamBoxStats, progress: number): LiveTeamBoxStats {
  return {
    fieldGoalsMade: Math.round(finalStats.fieldGoalsMade * progress),
    fieldGoalsAttempted: Math.round(finalStats.fieldGoalsAttempted * progress),
    threePointersMade: Math.round(finalStats.threePointersMade * progress),
    threePointersAttempted: Math.round(finalStats.threePointersAttempted * progress),
    freeThrowsMade: Math.round(finalStats.freeThrowsMade * progress),
    freeThrowsAttempted: Math.round(finalStats.freeThrowsAttempted * progress),
    rebounds: Math.round(finalStats.rebounds * progress),
    assists: Math.round(finalStats.assists * progress),
    turnovers: Math.round(finalStats.turnovers * progress),
    fastBreakPoints: Math.round(finalStats.fastBreakPoints * progress),
    paintPoints: Math.round(finalStats.paintPoints * progress),
  }
}

function createScoringProgress(finalPoints: number, totalSteps: number) {
  const increments: number[] = []
  let remaining = finalPoints
  if (remaining >= 3 && remaining % 2 === 1) {
    increments.push(3)
    remaining -= 3
  }
  while (remaining >= 2) {
    increments.push(2)
    remaining -= 2
  }
  if (remaining === 1) increments.push(1)

  const pointsAtStep = Array.from({ length: totalSteps }, () => 0)
  increments.forEach((increment, index) => {
    const slot = Math.min(totalSteps - 2, Math.max(1, Math.round(((index + 1) / (increments.length + 1)) * (totalSteps - 1))))
    pointsAtStep[slot] += increment
  })
  let total = 0
  return pointsAtStep.map((increment) => {
    total += increment
    return total
  })
}

export function prepareGameResult(current: SaveGame, tactic = 'balanced', playThrough = false): GameResult | null {
  if (!current.player || !current.team) return null
  const scheduleItem = current.schedule.find((item) => !item.played)
  if (!scheduleItem) return null
  const opponent = current.teams.find((team) => team.id === scheduleItem.opponentId)
  if (!opponent) return null
  const remainingSeasonGames = Math.max(0, current.schedule.filter((game) => !game.played).length - 1)
  const injury = current.injury ? applyPlayThroughLimit(current.injury, current.player.health, remainingSeasonGames) : null

  if (injury && (!playThrough || isMedicallyUnavailable(injury))) {
    const medicalRotation: RotationDecision = { status: 'development', projectedMinutes: 0, dnp: true, closingLineup: false, reason: `医疗组因${injury.name}禁止出场`, temporaryOpportunity: false, depthRank: 99 }
    const result = simulateGame({ ...current.player, role: '伤病缺阵', health: 20 }, current.team, opponent, scheduleItem.home, tactic, Math.random, { rotation: medicalRotation })
    return {
      ...result,
      minutes: 0,
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      grade: 'DNP',
      headline: `${current.player.name}因${injury.name}缺席，球队${result.win ? '取胜' : '失利'}`,
    }
  }

  const activePlayer = injury
    ? { ...current.player, health: Math.max(25, current.player.health - injury.severity * 12), energy: Math.max(20, current.player.energy - 12) }
    : current.player
  const rotation = decideRotation(current)
  const modifiers = [...(current.nextGameModifiers ?? []), ...careerGameModifiers(current, scheduleItem.home)]
  return simulateGame(activePlayer, current.team, opponent, scheduleItem.home, tactic, Math.random, { rotation, modifiers })
}

export function createLiveGameSession(result: GameResult, player: CareerPlayer, team: Team): LiveGameSession {
  const events: LiveGameEvent[] = []
  const stepsPerQuarter = 9
  const totalSteps = stepsPerQuarter * 4
  let teamScore = 0
  let opponentScore = 0
  let points = 0
  let rebounds = 0
  let assists = 0
  let steals = 0
  let blocks = 0
  let turnovers = 0
  const scoringProgress = createScoringProgress(result.points, totalSteps)
  const finalTeamStats = createFinalTeamBox(result.teamScore, team.strength)
  const finalOpponentStats = createFinalTeamBox(result.opponentScore, result.opponent.strength)
  const activeBadges = new Map(player.badges.filter((badge) => badge.level > 0).map((badge) => [badge.id, badge]))
  const triggeredBadges = new Set<string>()
  const badgeActivation = (...badgeIds: string[]) => {
    const badge = badgeIds.map((id) => activeBadges.get(id)).find((candidate) => candidate && !triggeredBadges.has(candidate.id))
    if (!badge) return ''
    triggeredBadges.add(badge.id)
    return `，「${badge.name}」徽章生效`
  }

  for (let index = 0; index < totalSteps; index += 1) {
    const quarter = Math.floor(index / stepsPerQuarter) + 1
    const step = index % stepsPerQuarter
    const progress = (index + 1) / totalSteps
    const clockSeconds = Math.max(0, 720 - Math.round(((step + 1) / stepsPerQuarter) * 720))
    const previous = { teamScore, opponentScore, points, rebounds, assists, steals, blocks, turnovers }

    teamScore = progressValue(result.teamScore, progress, teamScore)
    opponentScore = progressValue(result.opponentScore, progress, opponentScore)
    points = scoringProgress[index]
    rebounds = progressValue(result.rebounds, progress, rebounds)
    assists = progressValue(result.assists, progress, assists)
    steals = progressValue(result.steals, progress, steals)
    blocks = progressValue(result.blocks, progress, blocks)
    turnovers = progressValue(result.turnovers, progress, turnovers)

    if (index === totalSteps - 1) {
      teamScore = result.teamScore
      opponentScore = result.opponentScore
      points = result.points
      rebounds = result.rebounds
      assists = result.assists
      steals = result.steals
      blocks = result.blocks
      turnovers = result.turnovers
    }

    const scoreText = `${team.short} ${teamScore}-${opponentScore} ${result.opponent.short}`
    const playerPointDelta = points - previous.points
    const assistDelta = assists - previous.assists
    const reboundDelta = rebounds - previous.rebounds
    const defenseDelta = steals + blocks - previous.steals - previous.blocks
    const turnoverDelta = turnovers - previous.turnovers
    const teamDelta = teamScore - previous.teamScore
    const opponentDelta = opponentScore - previous.opponentScore
    let text = `双方交换进攻，比分来到 ${scoreText}。`
    let tone: LiveEventTone = 'neutral'

    if (index === 0) {
      text = result.grade === 'DNP'
        ? `比赛开球，${team.city}${team.name}率先落位。${player.name}${result.rotation?.reason ? `因“${result.rotation.reason}”` : ''}留在场边观察。`
        : `比赛开球，${team.city}${team.name}率先落位，${player.name}开始组织第一次进攻。`
      tone = 'team'
    } else if (index === totalSteps - 1) {
      text = result.grade === 'DNP'
        ? `终场哨响，${team.city}${team.name}以 ${result.teamScore}-${result.opponentScore} ${result.win ? '取胜' : '失利'}，${player.name}本场未出场。`
        : result.win
          ? `终场哨响！${team.city}${team.name}以 ${result.teamScore}-${result.opponentScore} 拿下比赛，${player.name}得到${result.points}分。`
          : `比赛结束，${team.city}${team.name}以 ${result.teamScore}-${result.opponentScore} 惜败，${player.name}得到${result.points}分。`
      tone = 'clutch'
    } else if (step === stepsPerQuarter - 1) {
      text = `${quarter === 2 ? '半场' : `第${quarter}节`}结束，${scoreText}，双方进入节间调整。`
      tone = 'neutral'
    } else if (step === 4) {
      text = `官方暂停，双方教练重新布置轮换与防守对位，当前 ${scoreText}。`
      tone = 'neutral'
    } else if (quarter === 4 && step >= 6 && Math.abs(teamScore - opponentScore) <= 7) {
      text = `${formatClock(clockSeconds)} 进入关键时刻${badgeActivation('clutch', 'pressure-shot')}，双方每个回合都在针对弱侧防守，当前 ${scoreText}。`
      tone = 'clutch'
    } else if (playerPointDelta > 0) {
      const isDrive = playerPointDelta === 2 && step % 2 === 0
      const finish = playerPointDelta >= 3 ? '借掩护命中三分球' : playerPointDelta === 2 ? isDrive ? '强硬突破完成终结' : '急停跳投稳稳命中' : '制造犯规后罚球得分'
      const activation = playerPointDelta >= 3
        ? badgeActivation('deep-threat', 'pressure-shot')
        : isDrive || playerPointDelta === 1
          ? badgeActivation('iron-finish', 'air-adjust', 'first-step')
          : badgeActivation('pressure-shot', 'deep-threat')
      text = `${player.name}${finish}${activation}，个人得分来到 ${points} 分，${scoreText}。`
      tone = 'player'
    } else if (assistDelta > 0) {
      text = `${player.name}吸引协防后找到空位队友${badgeActivation('surgeon-pass')}，送出第 ${assists} 次助攻，${scoreText}。`
      tone = 'player'
    } else if (defenseDelta > 0) {
      text = `${player.name}完成一次关键防守${badgeActivation('chain-lock', 'help-instinct')}，球队立刻推起转换进攻，${scoreText}。`
      tone = 'player'
    } else if (reboundDelta > 0) {
      text = `${player.name}保护下第 ${rebounds} 个篮板，${team.city}${team.name}重新控制比赛节奏。`
      tone = 'team'
    } else if (turnoverDelta > 0) {
      text = `${player.name}在夹击中出现失误，${result.opponent.city}${result.opponent.name}抓住机会追分，${scoreText}。`
      tone = 'opponent'
    } else if (opponentDelta > teamDelta + 2) {
      text = `${result.opponent.city}${result.opponent.name}打出一波攻势，主教练示意全队稳住阵脚，${scoreText}。`
      tone = 'opponent'
    }

    events.push({
      id: `${result.id}-${index}`,
      quarter,
      clock: formatClock(clockSeconds),
      teamScore,
      opponentScore,
      points,
      rebounds,
      assists,
      steals,
      blocks,
      turnovers,
      teamStats: createTeamBoxSnapshot(finalTeamStats, progress),
      opponentStats: createTeamBoxSnapshot(finalOpponentStats, progress),
      text,
      tone,
    })
  }

  return {
    result: { ...result, timeline: events.map((event) => `第${event.quarter}节 ${event.clock} · ${event.text}`) },
    events,
  }
}

export function addGameToStats(stats: SeasonStats, game: GameResult, random: RandomSource = Math.random): SeasonStats {
  const attempts = Math.max(1, Math.round(game.points * 0.76 + random() * 5))
  const made = Math.min(attempts, Math.round(attempts * (0.42 + random() * 0.14)))
  const threesMade = Math.min(made, Math.round(game.points / 7))
  const threesAttempted = Math.max(threesMade, Math.round(threesMade * 2.4))
  return {
    games: stats.games + 1,
    starts: stats.starts + (game.minutes >= 29 ? 1 : 0),
    minutes: stats.minutes + game.minutes,
    points: stats.points + game.points,
    rebounds: stats.rebounds + game.rebounds,
    assists: stats.assists + game.assists,
    steals: stats.steals + game.steals,
    blocks: stats.blocks + game.blocks,
    turnovers: stats.turnovers + game.turnovers,
    fgMade: stats.fgMade + made,
    fgAttempted: stats.fgAttempted + attempts,
    threeMade: stats.threeMade + threesMade,
    threeAttempted: stats.threeAttempted + threesAttempted,
  }
}
