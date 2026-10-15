import currentPlayerDatabase from '../data/generated/currentPlayers.json'
import type {
  Archetype,
  AttributeKey,
  Attributes,
  LeaguePlayerInjury,
  LeaguePlayerSeasonStats,
  LeaguePlayerState,
  LeagueRole,
  LeagueState,
  LibraryPlayer,
  Position,
  Team,
} from '../types'

type RawPlayer = {
  id: string
  nbaId: number | null
  name: string
  teamId: string | null
  age: number
  positions: Position[]
  archetype: Archetype
  overall: number
  potential: number
  attributes: Attributes
  badges: Record<string, 0 | 1 | 2 | 3 | 4>
  stats: { mpg: number; ppg: number; rpg: number; apg: number; spg: number; bpg: number }
}

const DATABASE = currentPlayerDatabase as unknown as { version: string; players: RawPlayer[] }
const ATTRIBUTE_KEYS = Object.keys(DATABASE.players[0].attributes) as AttributeKey[]
const clamp = (value: number, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, value))
const emptyStats = (): LeaguePlayerSeasonStats => ({ games: 0, minutes: 0, points: 0, threeMade: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 })

function hashSeed(seed: number, text: string) {
  let hash = seed ^ 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function randomSource(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function normal(random: () => number) {
  return (random() + random() + random() + random() - 2) * 1.25
}

function assignRotations(players: LeaguePlayerState[]) {
  const byTeam = new Map<string, LeaguePlayerState[]>()
  players.forEach((player) => {
    if (!player.teamId || player.retired) return
    const roster = byTeam.get(player.teamId) ?? []
    roster.push(player)
    byTeam.set(player.teamId, roster)
  })
  const assignments = new Map<string, { role: LeagueRole; minutesPerGame: number }>()
  byTeam.forEach((roster) => {
    roster.sort((left, right) => (right.overall + right.form * 0.25) - (left.overall + left.form * 0.25))
    roster.forEach((player, index) => {
      const role: LeagueRole = index === 0 ? 'franchise' : index <= 4 ? 'starter' : index === 5 ? 'sixth' : index <= 9 ? 'rotation' : 'reserve'
      const minutes = [35, 33, 32, 30, 29, 27, 23, 20, 17, 14, 7, 4][index] ?? 0
      assignments.set(player.id, { role, minutesPerGame: player.injury ? 0 : minutes })
    })
  })
  return players.map((player) => ({ ...player, ...(assignments.get(player.id) ?? { role: player.retired ? 'retired' as const : 'reserve' as const, minutesPerGame: 0 }) }))
}

export function initializeLeague(seed: number, season: number): LeagueState {
  const players = DATABASE.players.map((raw): LeaguePlayerState => {
    const random = randomSource(hashSeed(seed, raw.id))
    const form = Math.round(normal(random) * 1.6)
    const development = Number((normal(random) * 0.65).toFixed(2))
    const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, clamp(raw.attributes[key] + Math.round(normal(random) * 0.65), 25, 99)])) as Attributes
    return {
      id: raw.id,
      nbaId: raw.nbaId,
      name: raw.name,
      teamId: raw.teamId,
      age: raw.age,
      positions: raw.positions,
      archetype: raw.archetype,
      overall: clamp(raw.overall + Math.round(form * 0.25), 45, 99),
      potential: clamp(raw.potential + Math.round(development), raw.overall, 99),
      attributes,
      badges: { ...raw.badges },
      role: 'reserve',
      minutesPerGame: 0,
      health: 94 + Math.round(random() * 6),
      energy: 92 + Math.round(random() * 8),
      morale: 45 + Math.round(random() * 20),
      form,
      development,
      retired: false,
      injury: null,
      seasonStats: emptyStats(),
      baselineStats: { ...raw.stats },
    }
  })
  return { dataVersion: DATABASE.version, seed: seed >>> 0, season, tick: 0, players: assignRotations(players) }
}

const injuryCatalog: Array<{ bodyPart: LeaguePlayerInjury['bodyPart']; names: [string, string, string] }> = [
  { bodyPart: 'ankle', names: ['脚踝炎症', '脚踝扭伤', '高位脚踝扭伤'] },
  { bodyPart: 'knee', names: ['膝盖酸痛', '膝关节扭伤', '膝韧带损伤'] },
  { bodyPart: 'leg', names: ['小腿紧张', '腿筋拉伤', '小腿肌肉撕裂'] },
  { bodyPart: 'back', names: ['背部紧张', '腰背挫伤', '椎间盘损伤'] },
  { bodyPart: 'shoulder', names: ['肩部酸痛', '肩关节扭伤', '肩袖损伤'] },
  { bodyPart: 'hand', names: ['手指挫伤', '手腕扭伤', '掌骨骨折'] },
  { bodyPart: 'foot', names: ['足底酸痛', '足部扭伤', '足部应力性骨折'] },
]

function createInjury(player: LeaguePlayerState, random: () => number): LeaguePlayerInjury {
  const roll = random()
  const severity: 1 | 2 | 3 = roll > 0.94 ? 3 : roll > 0.68 ? 2 : 1
  const item = injuryCatalog[Math.floor(random() * injuryCatalog.length)]
  const gamesLeft = severity === 3 ? 18 + Math.floor(random() * 34) : severity === 2 ? 6 + Math.floor(random() * 13) : 1 + Math.floor(random() * 5)
  return { name: item.names[severity - 1], bodyPart: item.bodyPart, severity, gamesLeft, reinjuryRisk: Math.round(8 + severity * 12 + (100 - player.attributes.durability) * 0.22) }
}

function simulatePlayerGame(player: LeaguePlayerState, random: () => number): LeaguePlayerState {
  if (player.retired || !player.teamId) return player
  if (player.injury) {
    const gamesLeft = player.injury.gamesLeft - 1
    return {
      ...player,
      injury: gamesLeft <= 0 ? null : { ...player.injury, gamesLeft, reinjuryRisk: Math.max(5, player.injury.reinjuryRisk - 1) },
      health: clamp(player.health + (player.injury.severity === 3 ? 1 : 2)),
      energy: clamp(player.energy + 9),
      minutesPerGame: 0,
    }
  }
  if (player.minutesPerGame <= 0) return { ...player, energy: clamp(player.energy + 5), form: Math.round(clamp(player.form * 0.75 + normal(random) * 0.25, -8, 8)) }

  const minutes = clamp(player.minutesPerGame + normal(random) * 2.2, 5, 40)
  const performance = clamp(0.82 + (player.overall - 70) * 0.006 + player.form * 0.012 + normal(random) * 0.035, 0.65, 1.25)
  const minuteRatio = minutes / Math.max(8, player.baselineStats.mpg || player.minutesPerGame)
  const generated = {
    points: Math.max(0, player.baselineStats.ppg * minuteRatio * performance + normal(random) * 1.8),
    rebounds: Math.max(0, player.baselineStats.rpg * minuteRatio * performance + normal(random) * 0.75),
    assists: Math.max(0, player.baselineStats.apg * minuteRatio * performance + normal(random) * 0.7),
    steals: Math.max(0, player.baselineStats.spg * minuteRatio * performance + normal(random) * 0.22),
    blocks: Math.max(0, player.baselineStats.bpg * minuteRatio * performance + normal(random) * 0.2),
  }
  const threePointShare = clamp(.025 + (player.attributes.threePoint - 52) * .0031, .015, .18)
  const threeMade = Math.max(0, generated.points * threePointShare + normal(random) * .22)
  const seasonStats = {
    games: player.seasonStats.games + 1,
    minutes: player.seasonStats.minutes + minutes,
    points: player.seasonStats.points + generated.points,
    threeMade: (player.seasonStats.threeMade ?? 0) + threeMade,
    rebounds: player.seasonStats.rebounds + generated.rebounds,
    assists: player.seasonStats.assists + generated.assists,
    steals: player.seasonStats.steals + generated.steals,
    blocks: player.seasonStats.blocks + generated.blocks,
  }
  const energy = clamp(player.energy + 7 - minutes * 0.18)
  const injuryChance = 0.0035 + minutes * 0.00014 + Math.max(0, player.age - 30) * 0.00065 + (100 - player.attributes.durability) * 0.00012 + Math.max(0, 68 - energy) * 0.00035
  const injury = random() < injuryChance ? createInjury(player, random) : null
  return {
    ...player,
    seasonStats,
    energy,
    health: injury ? clamp(player.health - injury.severity * 7) : clamp(player.health + 1),
    form: Math.round(clamp(player.form * 0.72 + normal(random) * 0.7 + (performance - 1) * 5, -8, 8)),
    injury,
  }
}

export function recalculateTeamStrengths(league: LeagueState, teams: Team[]): Team[] {
  return teams.map((team) => {
    const roster = league.players
      .filter((player) => player.teamId === team.id && !player.retired)
      .sort((left, right) => (right.injury ? -15 : right.overall + right.form * 0.25) - (left.injury ? -15 : left.overall + left.form * 0.25))
      .slice(0, 10)
    if (!roster.length) return team
    let quality = 0
    let weight = 0
    roster.forEach((player, index) => {
      const minutesWeight = [35, 33, 31, 29, 27, 24, 21, 18, 14, 8][index]
      const availability = player.injury ? 0.18 : clamp(player.health / 100, 0.7, 1)
      quality += (player.overall + player.form * 0.22) * minutesWeight * availability
      weight += minutesWeight
    })
    const guardPace = roster.filter((player) => player.positions.some((position) => position === 'PG' || position === 'SG')).slice(0, 4)
    const speed = guardPace.length ? guardPace.reduce((sum, player) => sum + player.attributes.speedWithBall, 0) / guardPace.length : 72
    return {
      ...team,
      strength: Math.round(clamp((quality / weight) * 1.04 - 1, 68, 98)),
      pace: Math.round(clamp(team.pace * 0.72 + (91 + (speed - 70) * 0.28) * 0.28, 92, 106)),
    }
  })
}

export function progressLeagueGameDay(league: LeagueState, teams: Team[]) {
  const tick = league.tick + 1
  const players = league.players.map((player) => simulatePlayerGame(player, randomSource(hashSeed(league.seed + tick * 7919, player.id))))
  const nextLeague = { ...league, tick, players: assignRotations(players) }
  return { league: nextLeague, teams: recalculateTeamStrengths(nextLeague, teams) }
}

function rookieState(rookie: LibraryPlayer, teamId: string, seed: number): LeaguePlayerState {
  const random = randomSource(hashSeed(seed, rookie.id))
  const stats = {
    mpg: rookie.overall >= 78 ? 27 : rookie.overall >= 72 ? 20 : 11,
    ppg: Math.max(3, (rookie.attributes.closeShot + rookie.attributes.threePoint + rookie.attributes.layup - 165) * 0.12),
    rpg: Math.max(1.5, (rookie.attributes.defensiveRebound + rookie.attributes.offensiveRebound - 95) * 0.055),
    apg: Math.max(1, (rookie.attributes.vision + rookie.attributes.passAccuracy - 105) * 0.045),
    spg: Math.max(0.3, (rookie.attributes.steal - 45) * 0.018),
    bpg: Math.max(0.2, (rookie.attributes.block - 45) * 0.018),
  }
  return {
    id: rookie.id,
    nbaId: null,
    name: rookie.name,
    teamId,
    age: 19 + Math.floor(random() * 4),
    positions: rookie.positions,
    archetype: rookie.archetype,
    overall: rookie.overall,
    potential: clamp(rookie.overall + 7 + Math.floor(random() * 10), rookie.overall, 99),
    attributes: { ...rookie.attributes },
    badges: {},
    role: 'reserve',
    minutesPerGame: 0,
    health: 96,
    energy: 100,
    morale: 58,
    form: 0,
    development: Number((0.2 + random() * 1.4).toFixed(2)),
    retired: false,
    injury: null,
    seasonStats: emptyStats(),
    baselineStats: stats,
  }
}

export function advanceLeagueSeason(league: LeagueState, teams: Team[], rookies: LibraryPlayer[], nextSeason: number) {
  const random = randomSource(hashSeed(league.seed, `offseason-${nextSeason}`))
  const teamOrder = [...teams].sort((left, right) => left.wins - right.wins).map((team) => team.id)
  const availableTeams = teams.map((team) => team.id)
  const progressed = league.players.map((player): LeaguePlayerState => {
    if (player.retired) return player
    const age = player.age + 1
    const retireChance = age < 35 ? 0 : age === 35 ? 0.03 : Math.min(0.92, 0.08 + (age - 36) * 0.14 + Math.max(0, 72 - player.overall) * 0.012)
    if (random() < retireChance) return { ...player, age, teamId: null, retired: true, role: 'retired', minutesPerGame: 0, injury: null, seasonStats: emptyStats() }

    const ageCurve = age <= 22 ? 1.75 : age <= 25 ? 1.1 : age <= 28 ? 0.45 : age <= 31 ? 0 : age <= 33 ? -0.65 : age <= 35 ? -1.25 : -2.1
    const room = Math.max(0, player.potential - player.overall)
    const targetDelta = ageCurve + player.development * 0.7 + room * 0.08 + normal(random) * 0.35
    const attributes = { ...player.attributes }
    ATTRIBUTE_KEYS.forEach((key) => {
      const athleticDecline = age >= 32 && ['speed', 'acceleration', 'vertical', 'stamina', 'durability'].includes(key) ? -0.7 : 0
      const skillProtection = age >= 32 && ['leadership', 'clutch', 'postControl', 'shotStability'].includes(key) ? 0.55 : 0
      const delta = targetDelta + athleticDecline + skillProtection + normal(random) * 0.45
      if (Math.abs(delta) >= 0.45 && random() < Math.min(0.82, 0.34 + Math.abs(delta) * 0.12)) attributes[key] = Math.round(clamp(attributes[key] + Math.sign(delta), 25, 99))
    })
    const rawOverallDelta = targetDelta > 0.65 ? 1 : targetDelta < -0.55 ? -1 : 0
    const overall = Math.round(clamp(player.overall + rawOverallDelta, 45, 99))
    const tradeEligible = player.role !== 'franchise' && age < 36 && random() < 0.045
    const teamId = tradeEligible ? availableTeams[Math.floor(random() * availableTeams.length)] : player.teamId
    const lingering = player.injury?.severity === 3 && player.injury.gamesLeft > 20 ? { ...player.injury, gamesLeft: Math.min(12, Math.ceil(player.injury.gamesLeft * 0.2)) } : null
    return {
      ...player,
      teamId,
      age,
      overall,
      attributes,
      potential: Math.max(overall, age <= 25 ? player.potential : Math.max(overall, player.potential - (age >= 32 ? 1 : 0))),
      energy: 100,
      health: lingering ? clamp(player.health + 18) : 100,
      morale: Math.round(clamp(player.morale + normal(random) * 4, 25, 90)),
      form: 0,
      injury: lingering,
      seasonStats: emptyStats(),
    }
  })
  const incoming = rookies.slice(0, Math.min(60, rookies.length)).map((rookie, index) => rookieState(rookie, teamOrder[index % teamOrder.length], league.seed + nextSeason))
  const nextLeague: LeagueState = { ...league, season: nextSeason, tick: 0, players: assignRotations([...progressed, ...incoming]) }
  return { league: nextLeague, teams: recalculateTeamStrengths(nextLeague, teams.map((team) => ({ ...team, wins: 0, losses: 0 }))) }
}

export function getTeamRoster(league: LeagueState | null, teamId: string) {
  if (!league) return []
  return league.players.filter((player) => player.teamId === teamId && !player.retired).sort((left, right) => right.overall - left.overall)
}

export function getLeagueLeaders(league: LeagueState | null) {
  if (!league) return []
  return league.players
    .filter((player) => player.seasonStats.games >= 3 && !player.retired)
    .map((player) => {
      const games = player.seasonStats.games
      return { player, ppg: player.seasonStats.points / games, rpg: player.seasonStats.rebounds / games, apg: player.seasonStats.assists / games }
    })
    .sort((left, right) => (right.ppg + right.rpg * 0.55 + right.apg * 0.75 + right.player.overall * 0.12) - (left.ppg + left.rpg * 0.55 + left.apg * 0.75 + left.player.overall * 0.12))
}
