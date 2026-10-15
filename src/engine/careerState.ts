import { useCallback, useEffect, useState } from 'react'
import { BASE_BADGES, createSchedule, INITIAL_AWARDS, INITIAL_RELATIONSHIPS, MENTEE_RELATIONSHIP, TEAMS } from '../data/league'
import { INITIAL_FEED, STORY_EVENTS } from '../data/stories'
import { createPlayoffGameStories } from '../data/playoffStories'
import { ATTRIBUTE_LABELS } from '../data/playerLibrary'
import { awardCareerRewards, createAwardCeremony } from './awardEngine'
import { addGameToStats, calculateOverall, simulateGame } from './gameEngine'
import { applyPlayThroughLimit, injuryRestrictionLabel, isMedicallyUnavailable, normalizeInjuryMessage, normalizeInjuryName, worsenInjuryName } from './injuryRules'
import { advanceLeagueSeason, getLeagueLeaders, initializeLeague, progressLeagueGameDay, recalculateTeamStrengths } from './leagueSimulation'
import { createPlayoffState, hydratePlayoffState, progressPlayoffBracket } from './playoffBracket'
import { generateRookieClass } from './rookieGenerator'
import { decideRotation, reviewCareerRole } from './rotationEngine'
import { createStoryContext, isStoryEventEligible, validStorySequence } from './storyRules'
import { careerGameModifiers, careerRecoveryBonus, careerStoryInterval } from './careerInfluenceEngine'
import { getPlayerPreset, portraitIdFromLegacyNumber } from '../data/playerPresets'
import type { AttributeKey, AutoSimulationState, CareerPlayer, FeedItem, GameResult, InjuryState, LifeValues, Position, Relationship, SaveGame, ScheduleGame, SimulationReport, StoryChoice, StoryContext, StoryEffects, StoryEvent, Team } from '../types'

const SAVE_KEY = 'lantu-career-v1'
const emptyStats = { games: 0, starts: 0, minutes: 0, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fgMade: 0, fgAttempted: 0, threeMade: 0, threeAttempted: 0 }
const DEFAULT_LIFE: LifeValues = { professionalism: 50, ambition: 50, loyalty: 50, family: 50, nightlife: 20, risk: 35 }
const bound = (value: number) => Math.max(0, Math.min(100, value))

export const EMPTY_GAME: SaveGame = {
  version: 6, phase: 'onboarding', activeTab: 'home', date: '2026年10月18日', seasonYear: 2026, seasonStage: 'regular', playoff: null, day: 0,
  player: null, team: null, teams: TEAMS.map((team) => ({ ...team })), schedule: [], relationships: INITIAL_RELATIONSHIPS.map(cloneRelationship),
  feed: INITIAL_FEED.map((item) => ({ ...item })), pendingStory: null, storyQueue: [], storyHistory: [], storyRecords: [], life: { ...DEFAULT_LIFE }, storyFlags: [],
  mentor: { level: 1, xp: 0, sessions: 0 }, simulationReport: null, autoSimulation: null, fans: 12, media: 50, city: 8, legacy: 0, money: 420000,
  careerYear: 1, generatedRookies: generateRookieClass(2026), awards: INITIAL_AWARDS.map((award) => ({ ...award })), lastGame: null, injury: null,
  awardCeremony: null, awardHistory: [], nextGameModifiers: [], lastRotationDecision: null, league: null, retirementPath: null,
}

function cloneRelationship(relationship: Relationship): Relationship {
  return { ...relationship, messages: (relationship.messages ?? []).map((message) => ({ ...message })) }
}

const teamForId = (id?: string | null) => {
  if (!id) return undefined
  const direct = TEAMS.find((team) => team.id === id)
  if (direct) return direct
  const legacyIndex = /^team-(\d+)$/.exec(id)?.[1]
  return legacyIndex ? TEAMS[Number(legacyIndex) - 1] : undefined
}

const LEGACY_TEAM_NAMES = [
  '江城狼群', '天府公牛', '北境冰刃', '海港领航者', '帝都御林军', '山城猎豹', '岭南风暴', '姑苏锦鲤', '燕赵铁骑', '闽海白鹭', '齐鲁泰山', '中原逐鹿', '长安玄甲', '楚地火凤', '金陵云豹',
  '沪海飞龙', '西域苍鹰', '鹏城疾电', '雪原猛犸', '南湾海盗', '西京金狮', '滨城巨浪', '昆仑雪豹', '河西骆驼', '赣江雷霆', '南海鲸群', '东海鲨鱼', '云岭象群', '瀚海星舰', '蓉城赤熊',
]

const migrateLegacyText = (value: string) => LEGACY_TEAM_NAMES.reduce((text, legacyName, index) => text.replaceAll(legacyName, `${TEAMS[index].city}${TEAMS[index].name}`), value)

const personalizeRelationships = (team: Team, source = INITIAL_RELATIONSHIPS) => source.map((raw) => {
  const fallback = INITIAL_RELATIONSHIPS.find((item) => item.id === raw.id)
  const relationship = cloneRelationship({ ...fallback, ...raw, messages: raw.messages?.length ? raw.messages : fallback?.messages ?? [] } as Relationship)
  return relationship.id === 'mentor' ? { ...relationship, name: team.mentor, role: `${team.city}${team.name}球队大哥 · 核心球员`, avatar: Array.from(team.mentor)[0] } : relationship
})

const personalizeStory = (story: StoryEvent | null, team: Team) => story ? {
  ...story, speaker: story.speaker.replace('陈骁', team.mentor).replace('球队领袖', team.mentor), body: migrateLegacyText(story.body.replaceAll('陈骁', team.mentor)),
  choices: story.choices.map((choice) => ({ ...choice, effects: { ...choice.effects }, life: choice.life ? { ...choice.life } : undefined, nextGame: choice.nextGame ? { ...choice.nextGame } : undefined, risk: choice.risk ? { ...choice.risk, effects: { ...choice.risk.effects } } : undefined })),
} : null

const migrateAwards = (source = INITIAL_AWARDS) => INITIAL_AWARDS.map((template) => {
  const legacyName = template.name === 'MVP' ? '最有价值球员' : template.name === '防守一阵（DPOY）' ? '最佳防守球员' : template.name
  const previous = source.find((award) => award.name === template.name || award.name === legacyName)
  return previous ? { ...template, leader: previous.leader, score: previous.score, playerRank: previous.playerRank } : { ...template }
})

function hydrateSchedule(parsed: SaveGame, currentTeam: Team | null) {
  const calendar = currentTeam && parsed.seasonStage === 'regular' ? createSchedule(currentTeam) : []
  return (parsed.schedule ?? []).map((item, index): ScheduleGame => {
    const base = calendar[index] ?? { gameNumber: item.gameNumber ?? index + 1, month: item.month ?? 10, date: item.date ?? Math.min(28, 2 + index * 2), home: item.home, opponentId: item.opponentId, played: item.played }
    const opponent = teamForId(item.result?.opponent.id)
    return {
      ...base, ...item, opponentId: teamForId(item.opponentId)?.id ?? item.opponentId,
      gameNumber: item.gameNumber ?? base.gameNumber, month: item.month ?? base.month, date: item.date ?? base.date,
      result: item.result && opponent ? { ...item.result, opponent: { ...opponent }, headline: migrateLegacyText(item.result.headline), timeline: item.result.timeline.map(migrateLegacyText) } : item.result,
    }
  })
}

export function migrateGame(parsed: SaveGame): SaveGame {
  const currentTeamTemplate = teamForId(parsed.team?.id)
  const staticTeams = TEAMS.map((template, index) => { const previous = parsed.teams?.find((team) => team.id === template.id) ?? parsed.teams?.[index]; return { ...template, wins: previous?.wins ?? 0, losses: previous?.losses ?? 0 } })
  const seedText = `${parsed.player?.id ?? 'career'}:${parsed.seasonYear}:${parsed.careerYear}`
  const migrationSeed = Array.from(seedText).reduce((seed, character) => Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261)
  const league = parsed.league ?? (parsed.phase === 'career' ? initializeLeague(migrationSeed, parsed.seasonYear) : null)
  const teams = league ? recalculateTeamStrengths(league, staticTeams) : staticTeams
  const currentTeam = currentTeamTemplate ? teams.find((team) => team.id === currentTeamTemplate.id) ?? currentTeamTemplate : null
  const lastOpponent = teamForId(parsed.lastGame?.opponent.id)
  const oldInjury = parsed.injury as InjuryState | null
  const portraitId = parsed.player?.portraitId ?? portraitIdFromLegacyNumber(parsed.player?.number)
  const preset = getPlayerPreset(portraitId)
  const player = parsed.player ? { ...parsed.player, portraitId: preset.id, number: preset.number, trainingLoad: parsed.player.trainingLoad ?? 0 } : null
  const schedule = hydrateSchedule(parsed, currentTeam)
  const migratedInjury: InjuryState | null = oldInjury ? { name: normalizeInjuryName(oldInjury.name), gamesLeft: oldInjury.gamesLeft, severity: oldInjury.severity ?? 1, reinjuryRisk: oldInjury.reinjuryRisk ?? 18, playedThrough: oldInjury.playedThrough ?? 0, restriction: oldInjury.restriction === 'medical-dnp' || oldInjury.restriction === 'season-ending' ? oldInjury.restriction : undefined } : null
  const injury = migratedInjury && player ? applyPlayThroughLimit(migratedInjury, player.health, schedule.filter((item) => !item.played).length) : migratedInjury
  const playoff = currentTeam ? hydratePlayoffState(parsed.playoff, teams, currentTeam.id) : parsed.playoff
  const personalizedRelationships = currentTeam ? personalizeRelationships(currentTeam, parsed.relationships?.length ? parsed.relationships : INITIAL_RELATIONSHIPS) : INITIAL_RELATIONSHIPS.map(cloneRelationship)
  const relationships = parsed.storyFlags?.includes('has-mentee') && !personalizedRelationships.some((relationship) => relationship.id === 'mentee')
    ? [...personalizedRelationships, cloneRelationship(MENTEE_RELATIONSHIP)]
    : personalizedRelationships
  return {
    ...EMPTY_GAME, ...parsed, version: 6, teams, team: currentTeam, league, schedule,
    playoff,
    awards: migrateAwards(parsed.awards),
    player,
    relationships,
    feed: (parsed.feed ?? []).map((item) => ({ ...item, body: normalizeInjuryMessage(migrateLegacyText(item.body)) })),
    pendingStory: currentTeam ? personalizeStory(parsed.pendingStory, currentTeam) : parsed.pendingStory,
    storyQueue: currentTeam ? (parsed.storyQueue ?? []).map((story) => personalizeStory(story, currentTeam)!).filter(Boolean) : parsed.storyQueue ?? [],
    storyRecords: parsed.storyRecords ?? [], life: { ...DEFAULT_LIFE, ...(parsed.life ?? {}) }, storyFlags: parsed.storyFlags ?? [], mentor: parsed.mentor ?? { level: 1, xp: 0, sessions: 0 }, simulationReport: parsed.simulationReport ? { ...parsed.simulationReport, message: normalizeInjuryMessage(parsed.simulationReport.message) } : null, autoSimulation: parsed.autoSimulation ?? null,
    awardCeremony: parsed.awardCeremony ?? null,
    awardHistory: parsed.awardHistory ?? [],
    injury,
    nextGameModifiers: parsed.nextGameModifiers ?? [],
    lastRotationDecision: parsed.lastRotationDecision ?? parsed.lastGame?.rotation ?? null,
    lastGame: parsed.lastGame && lastOpponent ? { ...parsed.lastGame, opponent: { ...lastOpponent }, headline: normalizeInjuryMessage(migrateLegacyText(parsed.lastGame.headline)), timeline: parsed.lastGame.timeline.map((item) => normalizeInjuryMessage(migrateLegacyText(item))) } : parsed.lastGame,
    retirementPath: parsed.retirementPath ?? null,
  }
}

function loadGame(): SaveGame {
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return EMPTY_GAME; const parsed = JSON.parse(raw) as SaveGame; return [1, 2, 3, 4, 5, 6].includes(parsed.version) ? migrateGame(parsed) : EMPTY_GAME } catch { return EMPTY_GAME }
}

function addBadgeProgress(player: CareerPlayer, badgeId: string, amount: number) {
  const badges = player.badges.map((badge) => {
    if (badge.id !== badgeId) return badge
    let level = badge.level
    let progress = badge.progress + amount
    while (progress >= 100 && level < 4) { progress -= 100; level = Math.min(4, level + 1) as typeof level }
    return { ...badge, level, progress: level === 4 ? 100 : Math.round(progress) }
  })
  return { ...player, badges }
}

function injuryFromFatigue(player: CareerPlayer, random: () => number, extraRisk = 0): InjuryState | null {
  const chance = Math.max(0.008, (100 - player.health + (100 - player.energy) + player.trainingLoad * 0.45) / 1700 + extraRisk / 100)
  if (random() >= chance) return null
  const severity = random() > 0.83 ? 3 : random() > 0.45 ? 2 : 1
  const names = severity === 3 ? ['膝关节扭伤', '小腿拉伤'] : severity === 2 ? ['脚踝扭伤', '腿筋拉伤'] : ['背部紧张', '脚踝炎症']
  return { name: names[Math.floor(random() * names.length)], gamesLeft: severity === 3 ? 9 + Math.floor(random() * 8) : severity === 2 ? 4 + Math.floor(random() * 5) : 2 + Math.floor(random() * 3), severity, reinjuryRisk: 12 + severity * 12, playedThrough: 0 }
}

export function getEligibleRegularSeasonStories(current: SaveGame, context?: StoryContext) {
  if (!current.team || current.seasonStage !== 'regular') return null
  const eligible = STORY_EVENTS.filter((story) => {
    const key = `${current.seasonYear}:${story.id}`
    if (current.storyHistory.includes(key)) return false
    if (story.recurrence === 'career' && current.storyHistory.some((item) => item.endsWith(`:${story.id}`))) return false
    if (!isStoryEventEligible(story, current, context)) return false
    if (story.id === 'trade-rumor' && current.player?.stats.games && current.player.stats.games < 12) return false
    return true
  })
  return eligible
}

function selectStory(current: SaveGame, random: () => number, context?: StoryContext) {
  const eligible = getEligibleRegularSeasonStories(current, context)
  if (!eligible || !current.team) return null
  const selected = eligible.length ? personalizeStory(eligible[Math.floor(random() * eligible.length)], current.team) : null
  return selected && context ? { ...selected, context } : selected
}

export function commitGameState(current: SaveGame, result: GameResult, scheduleIndex: number, random: () => number = Math.random, allowStory = true): SaveGame {
  if (!current.player || !current.team) return current
  const schedule = current.schedule.map((item, index) => index === scheduleIndex ? { ...item, played: true, result } : item)
  let teams = current.teams.map((team) => {
    if (team.id === current.team?.id) return { ...team, wins: team.wins + (result.win ? 1 : 0), losses: team.losses + (result.win ? 0 : 1) }
    if (team.id === result.opponent.id) return { ...team, wins: team.wins + (result.win ? 0 : 1), losses: team.losses + (result.win ? 1 : 0) }
    return random() > 0.5 ? { ...team, wins: team.wins + 1 } : { ...team, losses: team.losses + 1 }
  })
  const leagueProgress = current.league ? progressLeagueGameDay(current.league, teams) : null
  if (leagueProgress) teams = leagueProgress.teams
  const nextStats = result.grade === 'DNP' ? current.player.stats : addGameToStats(current.player.stats, result, random)
  const badgeGain: Record<string, number> = { 'iron-finish': result.points * 0.7, 'air-adjust': result.points * 0.35, 'deep-threat': result.points * 0.25, 'pressure-shot': result.grade.startsWith('A') ? 16 : 5, 'first-step': result.points + result.assists * 0.5, 'surgeon-pass': result.assists * 2.2, 'chain-lock': result.steals * 8, 'help-instinct': (result.blocks + result.steals) * 6, clutch: result.win && Math.abs(result.teamScore - result.opponentScore) <= 6 ? 18 : 3, 'locker-glue': result.win ? 5 : 2 }
  const consumedModifiers = current.nextGameModifiers ?? []
  const activeModifiers = [...consumedModifiers, ...careerGameModifiers(current, result.home)]
  const modifierFatigue = activeModifiers.reduce((sum, modifier) => sum + (modifier.fatigue ?? 0), 0)
  const modifierInjuryRisk = activeModifiers.reduce((sum, modifier) => sum + (modifier.injuryRisk ?? 0), 0)
  let player = { ...current.player, stats: nextStats, badges: current.player.badges.map((badge) => ({ ...badge })), energy: bound(current.player.energy - (result.grade === 'DNP' ? 1 : 7 + Math.round(random() * 5)) - modifierFatigue), morale: bound(current.player.morale + (result.win ? 3 : -2) + (result.grade.startsWith('A') ? 2 : 0)), coachTrust: bound(current.player.coachTrust + (result.grade.startsWith('A') ? 3 : result.grade === 'DNP' ? -1 : result.grade === 'C' ? -2 : 1)), trainingLoad: Math.max(0, current.player.trainingLoad - 3) }
  player.badges = player.badges.map((badge) => { const gain = badgeGain[badge.id] ?? 1; return addBadgeProgress({ ...player, badges: [badge] }, badge.id, gain).badges[0] })
  const avgImpact = nextStats.games ? (nextStats.points + nextStats.assists * 1.5 + nextStats.rebounds * 0.8) / nextStats.games : 0
  player.role = reviewCareerRole(current, player, result, current.day + 1)
  const day = current.day + 1
  const injury = current.injury ?? injuryFromFatigue(player, random, modifierInjuryRisk)
  const storyContext = createStoryContext({ ...current, player, injury }, result)
  const validCurrentStory = current.pendingStory && isStoryEventEligible(current.pendingStory, { ...current, player, injury }, current.pendingStory.context ?? storyContext) ? current.pendingStory : null
  const storyInterval = careerStoryInterval(current)
  const shouldTriggerStory = current.seasonStage === 'regular' && allowStory && !validCurrentStory && day % storyInterval === 0
  const pendingStory = shouldTriggerStory ? selectStory({ ...current, player, injury }, random, storyContext) : validCurrentStory
  const nextGameModifiers = consumedModifiers.map((modifier) => ({ ...modifier, gamesLeft: modifier.gamesLeft - 1 })).filter((modifier) => modifier.gamesLeft > 0)
  const feedItem: FeedItem = { id: crypto.randomUUID(), author: '赛场速递', handle: '@courtside', body: result.headline, time: '刚刚', tone: result.win ? 'positive' : 'neutral', likes: 800 + Math.round(random() * 5200), comments: 80 + Math.round(random() * 500) }
  const rookieRank = Math.max(1, 16 - Math.floor(avgImpact / 2.4)); const mvpRank = Math.max(1, 36 - Math.floor(avgImpact / 1.7) - Math.floor((teams.find((candidate) => candidate.id === current.team?.id)?.wins ?? 0) / 8))
  const leagueForAwards = leagueProgress?.league ?? current.league
  const leagueLeaders = getLeagueLeaders(leagueForAwards)
  const npcMvp = leagueLeaders[0]?.player.name
  const trackedPlayers = (leagueForAwards?.players ?? []).filter((candidate) => candidate.seasonStats.games >= 3 && !candidate.retired)
  const statTable = trackedPlayers.map((candidate) => {
    const games = Math.max(1, candidate.seasonStats.games)
    return { player: candidate, ppg: candidate.seasonStats.points / games, apg: candidate.seasonStats.assists / games, spg: candidate.seasonStats.steals / games, rpg: candidate.seasonStats.rebounds / games, three: (candidate.seasonStats.threeMade ?? 0) / games }
  })
  type TrackedStat = 'ppg' | 'apg' | 'spg' | 'rpg' | 'three'
  const leaderFor = (key: TrackedStat) => [...statTable].sort((left, right) => right[key] - left[key])[0]?.player.name
  const playerStat = { ppg: nextStats.games ? nextStats.points / nextStats.games : 0, apg: nextStats.games ? nextStats.assists / nextStats.games : 0, spg: nextStats.games ? nextStats.steals / nextStats.games : 0, rpg: nextStats.games ? nextStats.rebounds / nextStats.games : 0, three: nextStats.games ? nextStats.threeMade / nextStats.games : 0 }
  const rankFor = (key: TrackedStat) => 1 + statTable.filter((candidate) => candidate[key] > playerStat[key]).length
  const defensiveScore = (candidate: typeof trackedPlayers[number]) => candidate.attributes.interiorDefense + candidate.attributes.perimeterDefense + candidate.attributes.steal + candidate.attributes.block + candidate.attributes.helpDefense
  const defensiveRanking = [...trackedPlayers].sort((left, right) => defensiveScore(right) - defensiveScore(left))
  const npcDefender = defensiveRanking[0]?.name
  const npcRookie = leagueLeaders.find((candidate) => candidate.player.id.startsWith('rookie-'))?.player.name
  const awards = current.awards.map((award) => {
    if (award.name === '最佳新秀') return { ...award, playerRank: rookieRank, leader: rookieRank === 1 ? player.name : npcRookie ?? (award.leader === '等待赛季开始' ? '新秀榜领跑者' : award.leader), score: Math.round(avgImpact * 2.5) }
    if (award.name === 'MVP') return { ...award, playerRank: mvpRank, leader: mvpRank === 1 ? player.name : npcMvp ?? award.leader, score: Math.min(99, Math.round(avgImpact * 1.6)) }
    if (award.name === '进步最快球员' && current.careerYear > 1) return { ...award, playerRank: Math.max(1, 22 - Math.floor(avgImpact / 2)), leader: award.leader === '等待赛季开始' ? trackedPlayers.sort((left, right) => right.form - left.form)[0]?.name ?? '联盟进步之星' : award.leader, score: Math.round(avgImpact) }
    const statKey: Partial<Record<string, TrackedStat>> = { 得分王: 'ppg', 助攻王: 'apg', 抢断王: 'spg', 篮板王: 'rpg', 三分王: 'three' }
    const key = statKey[award.name]
    if (key) { const rank = rankFor(key); return { ...award, playerRank: rank, leader: rank === 1 ? player.name : leaderFor(key) ?? award.leader, score: Math.round(playerStat[key] * 10) } }
    if ((award.name === '防守一阵（DPOY）' || award.name === '防守二阵') && npcDefender) return { ...award, leader: npcDefender }
    if ((award.name === '最佳阵容一阵' || award.name === '最佳阵容二阵') && npcMvp) return { ...award, leader: npcMvp, playerRank: mvpRank }
    return award
  })
  const nextUnplayed = schedule.find((item) => !item.played)
  const nextTeam = teams.find((team) => team.id === current.team?.id) ?? current.team
  const baseNext: SaveGame = { ...current, player, team: nextTeam, teams, league: leagueProgress?.league ?? current.league, schedule, day, date: nextUnplayed ? `${current.seasonYear}年${nextUnplayed.month}月${nextUnplayed.date}日` : current.date, lastGame: result, lastRotationDecision: result.rotation ?? current.lastRotationDecision ?? null, nextGameModifiers, pendingStory, injury, awards, fans: bound(current.fans + (result.win ? 2 : 0) + (result.points >= 25 ? 2 : 0)), city: bound(current.city + (result.win ? 1 : 0)), legacy: current.legacy + Math.max(0, result.points + result.assists + result.rebounds - 15) / 40, feed: [feedItem, ...current.feed].slice(0, 50) }
  if (current.seasonStage !== 'playoffs') return baseNext

  const completedRound = current.playoff?.round ?? 1
  const playoffStories = createPlayoffGameStories(baseNext, result, completedRound, random)
  const progressed = progressPlayoff(baseNext, result)
  const completionStory = progressed.pendingStory
  const storyQueue = validStorySequence(progressed, [...playoffStories, ...(completionStory ? [completionStory] : []), ...(progressed.storyQueue ?? [])])
  return { ...progressed, pendingStory: storyQueue[0] ?? null, storyQueue: storyQueue.slice(1) }
}

function dnpResult(current: SaveGame, opponent: Team, home: boolean, tactic: string, random: () => number): GameResult {
  const medicalRotation = { status: 'development' as const, projectedMinutes: 0, dnp: true, closingLineup: false, reason: `医疗组因${current.injury?.name ?? '伤病'}禁止出场`, temporaryOpportunity: false, depthRank: 99 }
  const result = simulateGame({ ...current.player!, role: '伤病缺阵', health: 20 }, current.team!, opponent, home, tactic, random, { rotation: medicalRotation })
  Object.assign(result, { minutes: 0, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, grade: 'DNP', headline: `${current.player!.name}因${current.injury!.name}缺席，球队${result.win ? '取胜' : '失利'}` })
  return result
}

export function playSingleGameState(current: SaveGame, tactic = 'balanced', playThrough = false, random: () => number = Math.random, preparedResult?: GameResult): SaveGame {
  if (!current.player || !current.team) return current
  const scheduleIndex = current.schedule.findIndex((item) => !item.played)
  if (scheduleIndex < 0) return current.seasonStage === 'regular' ? beginAwardCeremonyState(current) : current.seasonStage === 'offseason' ? advanceSeason(current) : current
  const item = current.schedule[scheduleIndex]
  const opponent = current.teams.find((team) => team.id === item.opponentId)!
  const gamesRemainingAfterThis = Math.max(0, current.schedule.filter((game) => !game.played).length - 1)
  const normalizedInjury = current.injury ? applyPlayThroughLimit(current.injury, current.player.health, gamesRemainingAfterThis) : null
  const restrictionStarted = Boolean(normalizedInjury?.restriction && !current.injury?.restriction)
  const medicalState = normalizedInjury && normalizedInjury !== current.injury
    ? {
        ...current,
        injury: normalizedInjury,
        feed: restrictionStarted ? [{ id: crypto.randomUUID(), author: '球队医疗组', handle: '@medical', body: normalizedInjury.restriction === 'season-ending' ? `${current.player.name}因反复带伤出场导致伤势恶化，本赛季剩余比赛全部缺阵。` : `${current.player.name}已达到连续带伤出场上限，医疗组强制安排DNP恢复。`, time: '刚刚', tone: 'negative' as const, likes: 9200, comments: 1400 }, ...current.feed] : current.feed,
      }
    : current
  if (medicalState.injury && (!playThrough || isMedicallyUnavailable(medicalState.injury))) {
    const dnp = preparedResult?.grade === 'DNP' ? preparedResult : dnpResult(medicalState, opponent, item.home, tactic, random)
    const updated = commitGameState(medicalState, dnp, scheduleIndex, random, false)
    return { ...updated, injury: medicalState.injury.gamesLeft <= 1 ? null : { ...medicalState.injury, gamesLeft: medicalState.injury.gamesLeft - 1 }, simulationReport: null }
  }
  const activePlayer = medicalState.injury ? { ...medicalState.player!, health: Math.max(25, medicalState.player!.health - medicalState.injury.severity * 12), energy: Math.max(20, medicalState.player!.energy - 12) } : medicalState.player!
  const rotation = preparedResult?.rotation ?? decideRotation(medicalState, random)
  const activeModifiers = [...(medicalState.nextGameModifiers ?? []), ...careerGameModifiers(medicalState, item.home)]
  const simulatedResult = preparedResult ?? simulateGame(activePlayer, medicalState.team!, opponent, item.home, tactic, random, { rotation, modifiers: activeModifiers })
  let updated = commitGameState(medicalState, simulatedResult, scheduleIndex, random)
  if (current.injury && playThrough) {
    const riskChance = bound(current.injury.reinjuryRisk + (100 - current.player.energy) * 0.25 + current.injury.playedThrough * 8)
    if (random() * 100 < riskChance) {
      const severity = Math.min(3, current.injury.severity + 1) as 1 | 2 | 3
      const player = updated.player ? { ...updated.player, health: bound(updated.player.health - 14 - severity * 4), morale: bound(updated.player.morale - 5) } : null
      const worsened = applyPlayThroughLimit({ name: worsenInjuryName(current.injury.name), gamesLeft: current.injury.gamesLeft + 5 + severity * 3, severity, reinjuryRisk: Math.min(78, current.injury.reinjuryRisk + 18), playedThrough: current.injury.playedThrough + 1 }, player?.health ?? 0, gamesRemainingAfterThis)
      const medicalBody = worsened.restriction === 'season-ending' ? `${current.player.name}第三次带伤出场后伤势严重恶化，医疗组宣布赛季报销。` : worsened.restriction === 'medical-dnp' ? `${current.player.name}已连续三次带伤出场，医疗组强制安排后续DNP。` : `${current.player.name}带伤出场后伤势加重，预计缺席时间延长。`
      updated = { ...updated, player, injury: worsened, feed: [{ id: crypto.randomUUID(), author: '医疗报告', handle: '@medical', body: medicalBody, time: '刚刚', tone: 'negative', likes: 6300, comments: 980 }, ...updated.feed] }
    } else {
      const continued = applyPlayThroughLimit({ ...current.injury, gamesLeft: Math.max(1, current.injury.gamesLeft - 1), reinjuryRisk: Math.min(80, current.injury.reinjuryRisk + 5), playedThrough: current.injury.playedThrough + 1 }, updated.player?.health ?? 0, gamesRemainingAfterThis)
      const injury = continued.restriction || current.injury.gamesLeft > 1 ? continued : null
      const medicalFeed = continued.restriction && !current.injury.restriction ? [{ id: crypto.randomUUID(), author: '球队医疗组', handle: '@medical', body: continued.restriction === 'season-ending' ? `${current.player.name}完成第三次带伤出场后未通过医疗复检，确认赛季报销。` : `${current.player.name}已连续三次带伤出场，医疗组强制安排后续DNP。`, time: '刚刚', tone: 'negative' as const, likes: 7600, comments: 1100 }, ...updated.feed] : updated.feed
      updated = { ...updated, legacy: updated.legacy + 2, fans: bound(updated.fans + 4), injury, feed: medicalFeed }
    }
  }
  const validStories = validStorySequence(updated, [updated.pendingStory, ...(updated.storyQueue ?? [])].filter((story): story is StoryEvent => Boolean(story)))
  return { ...updated, pendingStory: validStories[0] ?? null, storyQueue: validStories.slice(1), simulationReport: null }
}

export function simulateRangeState(current: SaveGame, count: number, random: () => number = Math.random): SaveGame {
  let state = current
  let simulated = 0; let wins = 0; let losses = 0
  let stoppedBy: SimulationReport['stoppedBy'] = 'completed'
  if (state.pendingStory) stoppedBy = 'event'
  else if (state.injury) stoppedBy = 'injury'
  else while (simulated < count && state.schedule.some((item) => !item.played)) {
    const beforeDay = state.day
    const next = playSingleGameState(state, 'balanced', false, random)
    const result = next.lastGame
    if (next.day <= beforeDay) break
    state = next; simulated += 1; if (result?.win) wins += 1; else losses += 1
    if (state.pendingStory) { stoppedBy = 'event'; break }
    if (state.injury) { stoppedBy = 'injury'; break }
  }
  if (!state.schedule.some((item) => !item.played) && state.seasonStage === 'regular') { state = beginAwardCeremonyState(state); stoppedBy = 'season-end' }
  const message = stoppedBy === 'event' ? `模拟在第${state.day}场后的剧情事件前暂停` : stoppedBy === 'injury' ? `模拟因${state.injury?.name ?? '伤病'}暂停，需要决定休战或带伤出场` : stoppedBy === 'season-end' ? '82场常规赛模拟完成，等待赛季奖项揭晓' : `完成${simulated}场模拟`
  return { ...state, simulationReport: { requested: count, simulated, wins, losses, stoppedBy, message } }
}

const injuryDecisionKey = (injury: InjuryState) => `${normalizeInjuryName(injury.name)}:${injury.severity}:${injury.restriction ?? 'playable'}`

export function createInjuryDecisionStory(current: SaveGame, injury: InjuryState): StoryEvent {
  const playerName = current.player?.name ?? '球员'
  const injuryName = normalizeInjuryName(injury.name)
  const restriction = injuryRestrictionLabel(injury)
  if (restriction) {
    return {
      id: `auto-injury-${current.seasonYear}-${current.day}-${injury.severity}-${injury.restriction}`,
      category: '伤病抉择',
      title: restriction === '赛季报销' ? `${injuryName}：赛季提前结束` : `${injuryName}：医疗组强制DNP`,
      speaker: '球队医疗组',
      body: restriction === '赛季报销' ? `${playerName}反复带伤出场后未通过医疗复检，本赛季剩余比赛无法登场。` : `${playerName}已经连续三次带伤出场，医疗组收回出场许可，必须连续缺阵直至恢复。`,
      choices: [
        { label: restriction === '赛季报销' ? '接受治疗，着眼下赛季' : '接受强制DNP安排', hint: '连续模拟会继续，缺阵比赛记为DNP', effects: { health: 3, coachTrust: 1 }, life: { professionalism: 4 }, flags: ['auto-injury-rest'] },
      ],
    }
  }
  return {
    id: `auto-injury-${current.seasonYear}-${current.day}-${injury.severity}`,
    category: '伤病抉择',
    title: `${injuryName}：继续，还是停下？`,
    speaker: '球队医疗组',
    body: `${playerName}预计缺席${injury.gamesLeft}场，当前复发风险为${injury.reinjuryRisk}%。连续模拟不会结束，但你必须先决定接下来的比赛采用休战恢复还是带伤出场。`,
    choices: [
      { label: '接受队医方案，连续休战', hint: '模拟会继续；伤病期间自动记录为缺阵，直到恢复', effects: { health: 4, coachTrust: 1 }, life: { professionalism: 3 }, flags: ['auto-injury-rest'] },
      { label: '带伤出场，继续冲击胜利', hint: `模拟会继续；每场都承担至少${injury.reinjuryRisk}%的复发风险`, effects: { fans: 3, media: 2, energy: -5 }, life: { ambition: 3, risk: 6 }, flags: ['auto-injury-play-through'] },
    ],
  }
}

export function startRegularSeasonSimulationState(current: SaveGame): SaveGame {
  if (!current.player || !current.team || current.seasonStage !== 'regular') return current
  const unplayed = current.schedule.filter((item) => !item.played)
  if (!unplayed.length) return current
  const autoSimulation: AutoSimulationState = {
    active: true,
    mode: 'regular-season',
    targetPlayoffRound: null,
    requested: unplayed.length,
    simulated: 0,
    wins: 0,
    losses: 0,
    currentGameNumber: unplayed[0].gameNumber,
    injuryPolicy: 'rest',
    handledInjuryKey: current.injury ? injuryDecisionKey(current.injury) : null,
  }
  const validPendingStory = current.pendingStory && isStoryEventEligible(current.pendingStory, current) ? current.pendingStory : null
  const injuryStory = current.injury && !validPendingStory ? createInjuryDecisionStory(current, current.injury) : validPendingStory
  return {
    ...current,
    activeTab: 'career',
    autoSimulation,
    pendingStory: injuryStory,
    simulationReport: {
      requested: unplayed.length,
      simulated: 0,
      wins: 0,
      losses: 0,
      stoppedBy: injuryStory ? current.injury ? 'injury' : 'event' : 'running',
      message: injuryStory ? '连续模拟已启动，等待你处理当前事件' : `正在模拟第${unplayed[0].gameNumber}场`,
    },
  }
}

export function startPlayoffRoundSimulationState(current: SaveGame): SaveGame {
  if (!current.player || !current.team || current.seasonStage !== 'playoffs' || !current.playoff) return current
  const nextScheduled = current.schedule.find((item) => !item.played)
  if (!nextScheduled) return current
  const maximumRemainingGames = Math.max(1, 7 - current.playoff.teamWins - current.playoff.opponentWins)
  const autoSimulation: AutoSimulationState = {
    active: true,
    mode: 'playoff-round',
    targetPlayoffRound: current.playoff.round,
    requested: maximumRemainingGames,
    simulated: 0,
    wins: 0,
    losses: 0,
    currentGameNumber: nextScheduled.gameNumber,
    injuryPolicy: 'rest',
    handledInjuryKey: current.injury ? injuryDecisionKey(current.injury) : null,
  }
  const validPendingStory = current.pendingStory && isStoryEventEligible(current.pendingStory, current) ? current.pendingStory : null
  const injuryStory = current.injury && !validPendingStory ? createInjuryDecisionStory(current, current.injury) : validPendingStory
  return {
    ...current,
    activeTab: 'career',
    autoSimulation,
    pendingStory: injuryStory,
    simulationReport: {
      requested: maximumRemainingGames,
      simulated: 0,
      wins: 0,
      losses: 0,
      stoppedBy: injuryStory ? current.injury ? 'injury' : 'event' : 'running',
      message: injuryStory ? '本轮系列赛模拟已启动，等待你处理当前事件' : `正在模拟本轮第${nextScheduled.gameNumber}场`,
    },
  }
}

export function stopRegularSeasonSimulationState(current: SaveGame): SaveGame {
  if (!current.autoSimulation) return current
  const autoSimulation = { ...current.autoSimulation, active: false, currentGameNumber: null }
  return {
    ...current,
    autoSimulation,
    simulationReport: {
      requested: autoSimulation.requested,
      simulated: autoSimulation.simulated,
      wins: autoSimulation.wins,
      losses: autoSimulation.losses,
      stoppedBy: 'completed',
      message: autoSimulation.mode === 'playoff-round' ? `已暂停本轮系列赛模拟，完成${autoSimulation.simulated}场` : `已手动暂停，完成${autoSimulation.simulated}场模拟`,
    },
  }
}

export function autoSimulateNextState(current: SaveGame, random: () => number = Math.random): SaveGame {
  const auto = current.autoSimulation
  if (!auto?.active || current.pendingStory || !current.player || !current.team) return current
  const playoffAuto = auto.mode === 'playoff-round'
  const targetRound = auto.targetPlayoffRound ?? current.playoff?.round ?? null
  if (playoffAuto && (current.seasonStage !== 'playoffs' || !current.playoff || current.playoff.round !== targetRound)) {
    const finishedAuto = { ...auto, active: false, currentGameNumber: null }
    return { ...current, autoSimulation: finishedAuto, simulationReport: { requested: auto.requested, simulated: auto.simulated, wins: auto.wins, losses: auto.losses, stoppedBy: 'completed', message: `本轮系列赛模拟完成：${auto.wins}胜${auto.losses}负` } }
  }
  if (!playoffAuto && current.seasonStage !== 'regular') return current
  const nextScheduled = current.schedule.find((item) => !item.played)
  if (!nextScheduled) {
    const finishedAuto = { ...auto, active: false, currentGameNumber: null }
    if (playoffAuto) return { ...current, autoSimulation: finishedAuto, simulationReport: { requested: auto.requested, simulated: auto.simulated, wins: auto.wins, losses: auto.losses, stoppedBy: 'completed', message: `本轮系列赛模拟完成：${auto.wins}胜${auto.losses}负` } }
    const ceremony = beginAwardCeremonyState({ ...current, autoSimulation: finishedAuto })
    return { ...ceremony, autoSimulation: finishedAuto, simulationReport: { requested: auto.requested, simulated: auto.simulated, wins: auto.wins, losses: auto.losses, stoppedBy: 'season-end', message: '82场常规赛模拟完成，等待赛季奖项揭晓' } }
  }
  if (current.injury && auto.handledInjuryKey !== injuryDecisionKey(current.injury)) {
    const handledInjuryKey = injuryDecisionKey(current.injury)
    return { ...current, pendingStory: createInjuryDecisionStory(current, current.injury), autoSimulation: { ...auto, handledInjuryKey }, simulationReport: { requested: auto.requested, simulated: auto.simulated, wins: auto.wins, losses: auto.losses, stoppedBy: 'injury', message: `模拟因${normalizeInjuryName(current.injury.name)}等待你的选择` } }
  }

  const beforeDay = current.day
  let next = playSingleGameState(current, 'balanced', Boolean(current.injury && auto.injuryPolicy === 'play-through'), random)
  if (next.day <= beforeDay) return stopRegularSeasonSimulationState(current)

  const result = next.lastGame
  let nextAuto: AutoSimulationState = {
    ...auto,
    simulated: auto.simulated + 1,
    wins: auto.wins + (result?.win ? 1 : 0),
    losses: auto.losses + (result?.win ? 0 : 1),
    currentGameNumber: next.schedule.find((item) => !item.played)?.gameNumber ?? null,
  }
  if (!next.injury) nextAuto = { ...nextAuto, injuryPolicy: 'rest', handledInjuryKey: null }
  const newInjuryKey = next.injury ? injuryDecisionKey(next.injury) : null
  if (next.injury && newInjuryKey !== nextAuto.handledInjuryKey && !next.pendingStory) {
    nextAuto = { ...nextAuto, handledInjuryKey: newInjuryKey }
    next = { ...next, pendingStory: createInjuryDecisionStory(next, next.injury) }
  }

  const pausedByInjury = Boolean(next.pendingStory?.id.startsWith('auto-injury-'))
  if (next.pendingStory) {
    const queuedStories = 1 + (next.storyQueue?.length ?? 0)
    return { ...next, autoSimulation: nextAuto, simulationReport: { requested: nextAuto.requested, simulated: nextAuto.simulated, wins: nextAuto.wins, losses: nextAuto.losses, stoppedBy: pausedByInjury ? 'injury' : 'event', message: pausedByInjury ? `模拟因${next.injury ? normalizeInjuryName(next.injury.name) : '伤病'}等待你的选择` : playoffAuto ? `本轮第${nextScheduled.gameNumber}场后触发${queuedStories}个剧情事件，选择后自动继续` : `第${nextScheduled.gameNumber}场后触发剧情，选择后将自动继续` } }
  }
  if (playoffAuto) {
    const roundComplete = next.seasonStage !== 'playoffs' || !next.playoff || next.playoff.round !== targetRound
    if (roundComplete) {
      const finishedAuto = { ...nextAuto, active: false, currentGameNumber: null }
      return { ...next, autoSimulation: finishedAuto, simulationReport: { requested: nextAuto.requested, simulated: nextAuto.simulated, wins: nextAuto.wins, losses: nextAuto.losses, stoppedBy: 'completed', message: `本轮系列赛模拟完成：${nextAuto.wins}胜${nextAuto.losses}负` } }
    }
    return { ...next, autoSimulation: nextAuto, simulationReport: { requested: nextAuto.requested, simulated: nextAuto.simulated, wins: nextAuto.wins, losses: nextAuto.losses, stoppedBy: 'running', message: `正在模拟本轮第${nextAuto.currentGameNumber}场` } }
  }
  if (!next.schedule.some((item) => !item.played)) {
    const finishedAuto = { ...nextAuto, active: false, currentGameNumber: null }
    const ceremony = beginAwardCeremonyState({ ...next, autoSimulation: finishedAuto })
    return { ...ceremony, autoSimulation: finishedAuto, simulationReport: { requested: nextAuto.requested, simulated: nextAuto.simulated, wins: nextAuto.wins, losses: nextAuto.losses, stoppedBy: 'season-end', message: '82场常规赛模拟完成，等待赛季奖项揭晓' } }
  }
  return { ...next, autoSimulation: nextAuto, simulationReport: { requested: nextAuto.requested, simulated: nextAuto.simulated, wins: nextAuto.wins, losses: nextAuto.losses, stoppedBy: 'running', message: `正在模拟第${nextAuto.currentGameNumber}场` } }
}

function mergeEffects(base: StoryEffects, extra?: StoryEffects): StoryEffects {
  const keys: Array<keyof StoryEffects> = ['fans', 'media', 'city', 'legacy', 'morale', 'coachTrust', 'energy', 'health', 'money', 'mentorXp']
  return Object.fromEntries(keys.map((key) => [key, (base[key] ?? 0) + (extra?.[key] ?? 0)])) as StoryEffects
}

const EFFECT_NAMES: Record<keyof StoryEffects, string> = { fans: '球迷', media: '媒体', city: '城市', legacy: '传承', morale: '士气', coachTrust: '教练信任', energy: '体能', health: '健康', money: '资产', mentorXp: '师徒经验' }

export function resolveStoryChoiceState(current: SaveGame, choice: StoryChoice, random: () => number = Math.random): SaveGame {
  if (!current.pendingStory || !current.player) return current
  if ((current.pendingStory.context || current.injury) && !isStoryEventEligible(current.pendingStory, current)) {
    const validQueue = validStorySequence(current, current.storyQueue ?? [])
    return { ...current, pendingStory: validQueue[0] ?? null, storyQueue: validQueue.slice(1) }
  }
  const story = current.pendingStory
  const riskTriggered = Boolean(choice.risk && random() * 100 < choice.risk.chance)
  const effects = mergeEffects(choice.effects, riskTriggered ? choice.risk?.effects : undefined)
  let player: CareerPlayer = { ...current.player, attributes: { ...current.player.attributes }, badges: current.player.badges.map((badge) => ({ ...badge })), energy: bound(current.player.energy + (effects.energy ?? 0)), morale: bound(current.player.morale + (effects.morale ?? 0)), health: bound(current.player.health + (effects.health ?? 0)), coachTrust: bound(current.player.coachTrust + (effects.coachTrust ?? 0)) }
  for (const [key, amount] of Object.entries(choice.attributes ?? {}) as Array<[AttributeKey, number]>) player.attributes[key] = Math.min(player.potential[key], bound(player.attributes[key] + amount))
  if (choice.badge) player = addBadgeProgress(player, choice.badge.id, choice.badge.progress)
  player.overall = calculateOverall(player)
  const life = { ...current.life }
  for (const [key, amount] of Object.entries(choice.life ?? {}) as Array<[keyof LifeValues, number]>) life[key] = bound(life[key] + amount)
  if (riskTriggered) for (const [key, amount] of Object.entries(choice.risk?.life ?? {}) as Array<[keyof LifeValues, number]>) life[key] = bound(life[key] + amount)
  const mentorXp = current.mentor.xp + (effects.mentorXp ?? 0)
  const relationshipTarget = choice.relationship?.id ?? (story.category === '兄弟情' ? 'mentor' : story.category === '感情' ? 'romance' : story.category === '教练' ? 'coach' : null)
  const relationshipPool = choice.relationshipUnlock && !current.relationships.some((relationship) => relationship.id === choice.relationshipUnlock?.id)
    ? [...current.relationships, cloneRelationship(choice.relationshipUnlock)]
    : current.relationships
  const coachTrustDelta = effects.coachTrust ?? 0
  const relationships = relationshipPool.map((relationship) => {
    const direct = relationship.id === relationshipTarget
    const coachSync = relationship.id === 'coach' && !direct && coachTrustDelta !== 0
    if (!direct && !coachSync) return relationship
    const trustDelta = direct ? (choice.relationship?.trust ?? 4) : Math.round(coachTrustDelta * .65)
    const respectDelta = direct ? (choice.relationship?.respect ?? 2) : Math.round(Math.max(0, coachTrustDelta) * .35)
    const intimacyDelta = direct ? (choice.relationship?.intimacy ?? 2) : 0
    const tensionDelta = direct ? (choice.relationship?.tension ?? 0) : Math.round(Math.min(0, coachTrustDelta) * -.45)
    const message = riskTriggered ? choice.risk!.result : `我记得你的选择：“${choice.label}”。`
    return { ...relationship, trust: bound(relationship.trust + trustDelta), respect: bound(relationship.respect + respectDelta), intimacy: bound(relationship.intimacy + intimacyDelta), tension: bound(relationship.tension + tensionDelta), unread: relationship.unread + 1, lastMessage: message, messages: [...relationship.messages, { id: crypto.randomUUID(), from: 'contact' as const, body: message, time: '刚刚' }] }
  })
  const injury = riskTriggered && choice.risk?.injury ? { name: choice.risk.injury.name, gamesLeft: choice.risk.injury.games, severity: choice.risk.injury.severity, reinjuryRisk: 12 + choice.risk.injury.severity * 12, playedThrough: 0 } : current.injury
  const effectLabels = (Object.entries(effects) as Array<[keyof StoryEffects, number]>).filter(([, value]) => value !== 0).map(([key, value]) => `${EFFECT_NAMES[key]} ${value > 0 ? '+' : ''}${key === 'money' ? Math.round(value / 10000) + '万' : value}`)
  const resultText = riskTriggered ? choice.risk!.result : `${choice.label}改变了你在球队和生活中的位置。`
  const record = { id: `${current.seasonYear}-${story.id}-${current.day}`, title: story.title, choice: choice.label, result: resultText, riskTriggered, seasonYear: current.seasonYear, gameNumber: current.day, effects: effectLabels }
  const feedItem: FeedItem = { id: crypto.randomUUID(), author: riskTriggered ? '场外速递' : '生涯动态', handle: '@career', body: resultText, time: '刚刚', tone: riskTriggered ? 'negative' : 'neutral', likes: 500 + Math.round(random() * 3500), comments: 40 + Math.round(random() * 420) }
  const injuryPolicy = choice.flags?.includes('auto-injury-play-through') ? 'play-through' : choice.flags?.includes('auto-injury-rest') ? 'rest' : current.autoSimulation?.injuryPolicy
  const autoSimulation = current.autoSimulation ? { ...current.autoSimulation, injuryPolicy: injuryPolicy ?? current.autoSimulation.injuryPolicy } : null
  const existingModifiers = current.nextGameModifiers ?? []
  const nextGameModifiers = choice.nextGame
    ? [...existingModifiers.filter((modifier) => modifier.id !== choice.nextGame?.id), { ...choice.nextGame, gamesLeft: Math.max(1, choice.nextGame.gamesLeft) }]
    : existingModifiers
  const provisional: SaveGame = { ...current, player, fans: bound(current.fans + (effects.fans ?? 0)), media: bound(current.media + (effects.media ?? 0)), city: bound(current.city + (effects.city ?? 0)), legacy: Math.max(0, current.legacy + (effects.legacy ?? 0)), money: Math.max(0, current.money + (effects.money ?? 0)), mentor: { ...current.mentor, xp: mentorXp, level: Math.min(5, 1 + Math.floor(mentorXp / 100)) }, relationships, life, storyFlags: [...new Set([...current.storyFlags, ...(choice.flags ?? [])])], storyHistory: [...current.storyHistory, `${current.seasonYear}:${story.id}`], storyRecords: [record, ...current.storyRecords].slice(0, 80), injury, feed: [feedItem, ...current.feed].slice(0, 50), autoSimulation, nextGameModifiers }
  const validQueue = validStorySequence(provisional, current.storyQueue ?? [])
  const nextPendingStory = validQueue[0] ?? null
  const storyQueue = validQueue.slice(1)
  const simulationReport = autoSimulation?.active
    ? nextPendingStory
      ? { requested: autoSimulation.requested, simulated: autoSimulation.simulated, wins: autoSimulation.wins, losses: autoSimulation.losses, stoppedBy: 'event' as const, message: `剧情选择已记录，本场还有${1 + storyQueue.length}个事件` }
      : { requested: autoSimulation.requested, simulated: autoSimulation.simulated, wins: autoSimulation.wins, losses: autoSimulation.losses, stoppedBy: 'running' as const, message: `选择已确认，即将继续模拟第${autoSimulation.currentGameNumber ?? current.day + 1}场` }
    : null
  return { ...provisional, pendingStory: nextPendingStory, storyQueue, simulationReport }
}

export function trainAttributeState(current: SaveGame, attribute: AttributeKey, mode: 'normal' | 'intense', random: () => number = Math.random): SaveGame {
  if (!current.player) return current
  const cost = mode === 'intense' ? 18 : 8
  if (current.player.energy < cost || current.injury) return current
  const currentValue = current.player.attributes[attribute]; const cap = current.player.potential[attribute]
  const gain = currentValue >= cap ? 0 : mode === 'intense' ? Math.min(3, 2 + (random() > 0.65 ? 1 : 0)) : 1
  const overloadChance = mode === 'intense' ? 0.08 + current.player.trainingLoad / 400 : 0.008 + current.player.trainingLoad / 1600
  const injured = random() < overloadChance
  const player = { ...current.player, energy: bound(current.player.energy - cost), health: bound(current.player.health - (mode === 'intense' ? 3 : 0)), trainingLoad: Math.min(100, current.player.trainingLoad + (mode === 'intense' ? 20 : 8)), attributes: { ...current.player.attributes, [attribute]: Math.min(cap, currentValue + gain) } }
  player.overall = calculateOverall(player)
  return { ...current, player, injury: injured ? { name: '训练过载拉伤', gamesLeft: mode === 'intense' ? 4 : 2, severity: mode === 'intense' ? 2 : 1, reinjuryRisk: mode === 'intense' ? 34 : 20, playedThrough: 0 } : current.injury, feed: injured ? [{ id: crypto.randomUUID(), author: '训练馆消息', handle: '@practice', body: `${current.player.name}在${mode === 'intense' ? '高强度' : '常规'}训练中出现过载反应。`, time: '刚刚', tone: 'negative', likes: 1200, comments: 180 }, ...current.feed] : current.feed }
}

export type MentorTrack = 'shooting' | 'playmaking' | 'defense' | 'leadership'
export function mentorSessionState(current: SaveGame, track: MentorTrack): SaveGame {
  if (!current.player || current.player.energy < 12 || current.injury) return current
  const map: Record<MentorTrack, { keys: AttributeKey[]; badge: string; title: string }> = { shooting: { keys: ['shotStability', 'threePoint'], badge: 'pressure-shot', title: '投篮脚步课' }, playmaking: { keys: ['vision', 'passAccuracy'], badge: 'surgeon-pass', title: '挡拆阅读课' }, defense: { keys: ['helpDefense', 'perimeterDefense'], badge: 'help-instinct', title: '协防站位课' }, leadership: { keys: ['leadership', 'clutch'], badge: 'locker-glue', title: '更衣室领导课' } }
  const lesson = map[track]; let player = { ...current.player, attributes: { ...current.player.attributes }, energy: bound(current.player.energy - 12), trainingLoad: Math.min(100, current.player.trainingLoad + 9) }
  lesson.keys.forEach((key) => { player.attributes[key] = Math.min(player.potential[key], player.attributes[key] + 1) })
  player = addBadgeProgress(player, lesson.badge, 22 + current.mentor.level * 4); player.overall = calculateOverall(player)
  const xp = current.mentor.xp + 22
  const message = `${lesson.title}结束。下一场先把动作做对，数据自然会来。`
  return { ...current, player, mentor: { level: Math.min(5, 1 + Math.floor(xp / 100)), xp, sessions: current.mentor.sessions + 1 }, relationships: current.relationships.map((relationship) => relationship.id === 'mentor' ? { ...relationship, trust: bound(relationship.trust + 3), respect: bound(relationship.respect + 2), lastMessage: message, messages: [...relationship.messages, { id: crypto.randomUUID(), from: 'contact', body: message, time: '刚刚' }] } : relationship), feed: [{ id: crypto.randomUUID(), author: '训练馆', handle: '@practice', body: `${current.team?.mentor ?? '球队大哥'}带领${current.player.name}完成了${lesson.title}。`, time: '刚刚', tone: 'positive', likes: 1900, comments: 120 }, ...current.feed] }
}

export type CoachTrack = 'film' | 'role' | 'recovery'
export function coachMeetingState(current: SaveGame, track: CoachTrack): SaveGame {
  if (!current.player) return current
  const plans: Record<CoachTrack, { cost: number; trust: number; respect: number; tension: number; morale: number; health: number; energy: number; keys: AttributeKey[]; message: string }> = {
    film: { cost: 6, trust: 5, respect: 4, tension: -2, morale: 1, health: 0, energy: 0, keys: ['helpDefense', 'vision'], message: '录像会已经结束。下一场我会观察你能不能提前读到第二选择。' },
    role: { cost: 3, trust: 3, respect: 5, tension: -1, morale: 5, health: 0, energy: 0, keys: ['leadership'], message: '角色已经说清楚了。把承诺兑现，你的回合数自然会增加。' },
    recovery: { cost: 0, trust: -2, respect: 2, tension: 2, morale: 2, health: 5, energy: 14, keys: [], message: '我批准你降低一天负荷，但复出后必须重新赢得决胜阵容的位置。' },
  }
  const plan = plans[track]
  if (current.player.energy < plan.cost || (current.injury && track !== 'recovery')) return current
  const player = { ...current.player, attributes: { ...current.player.attributes }, energy: bound(current.player.energy - plan.cost + plan.energy), health: bound(current.player.health + plan.health), morale: bound(current.player.morale + plan.morale), coachTrust: bound(current.player.coachTrust + plan.trust) }
  plan.keys.forEach((key) => { player.attributes[key] = Math.min(player.potential[key], player.attributes[key] + 1) })
  player.overall = calculateOverall(player)
  const relationships = current.relationships.map((relationship) => relationship.id === 'coach' ? { ...relationship, trust: bound(relationship.trust + plan.trust), respect: bound(relationship.respect + plan.respect), tension: bound(relationship.tension + plan.tension), unread: relationship.unread + 1, lastMessage: plan.message, messages: [...relationship.messages, { id: crypto.randomUUID(), from: 'contact' as const, body: plan.message, time: '刚刚' }] } : relationship)
  return { ...current, player, relationships, feed: [{ id: crypto.randomUUID(), author: '教练组', handle: '@coachingstaff', body: `${current.player.name}与主教练完成了${track === 'film' ? '战术录像会' : track === 'role' ? '轮换角色沟通' : '负荷管理沟通'}。`, time: '刚刚', tone: 'neutral' as const, likes: 920, comments: 74 }, ...current.feed].slice(0, 50) }
}

export type MenteeTrack = 'shooting' | 'film' | 'leadership'
export function menteeSessionState(current: SaveGame, track: MenteeTrack): SaveGame {
  if (!current.player || current.player.energy < 8 || !current.storyFlags.includes('has-mentee') || !current.relationships.some((relationship) => relationship.id === 'mentee')) return current
  const lessons: Record<MenteeTrack, { key: AttributeKey; message: string; badge: string }> = {
    shooting: { key: 'leadership', badge: 'locker-glue', message: '今天的脚步我记住了。下次我会先把动作做完整，再看命中率。' },
    film: { key: 'vision', badge: 'surgeon-pass', message: '原来那个回合要先看弱侧。哥，我回去把整场重新剪一遍。' },
    leadership: { key: 'clutch', badge: 'locker-glue', message: '我明白了，承担责任不是抢着说话，而是先把标准做出来。' },
  }
  const lesson = lessons[track]
  let player = { ...current.player, energy: bound(current.player.energy - 8), attributes: { ...current.player.attributes } }
  player.attributes[lesson.key] = Math.min(player.potential[lesson.key], player.attributes[lesson.key] + 1)
  player = addBadgeProgress(player, lesson.badge, 14)
  player.overall = calculateOverall(player)
  const relationships = current.relationships.map((relationship) => relationship.id === 'mentee' ? { ...relationship, trust: bound(relationship.trust + 4), respect: bound(relationship.respect + 5), intimacy: bound(relationship.intimacy + 3), tension: bound(relationship.tension - 2), unread: relationship.unread + 1, lastMessage: lesson.message, messages: [...relationship.messages, { id: crypto.randomUUID(), from: 'contact' as const, body: lesson.message, time: '刚刚' }] } : relationship)
  return { ...current, player, relationships, legacy: current.legacy + 1, feed: [{ id: crypto.randomUUID(), author: '更衣室动态', handle: '@lockerroom', body: `${current.player.name}在训练后留下来指导周辰，球队内部的传承关系继续成长。`, time: '刚刚', tone: 'positive' as const, likes: 1600, comments: 105 }, ...current.feed].slice(0, 50) }
}

export function useCareerGame() {
  const [game, setGame] = useState<SaveGame>(() => loadGame())
  useEffect(() => { localStorage.setItem(SAVE_KEY, JSON.stringify(game)) }, [game])
  useEffect(() => {
    if (!game.autoSimulation?.active || game.pendingStory || game.phase !== 'career') return
    const timer = window.setTimeout(() => setGame((current) => autoSimulateNextState(current)), 520)
    return () => window.clearTimeout(timer)
  }, [game.autoSimulation?.active, game.autoSimulation?.currentGameNumber, game.pendingStory, game.phase, game.seasonStage, game.playoff?.round])
  const setTab = useCallback((activeTab: string) => setGame((current) => ({ ...current, activeTab })), [])
  const startCareer = useCallback((player: CareerPlayer, selectedTeam?: Team) => {
    const selectedTemplate = selectedTeam ?? TEAMS[Math.floor(Math.random() * TEAMS.length)]
    const seedArray = new Uint32Array(1); crypto.getRandomValues(seedArray)
    const league = initializeLeague(seedArray[0], EMPTY_GAME.seasonYear)
    const teams = recalculateTeamStrengths(league, TEAMS.map((team) => ({ ...team })))
    const team = teams.find((candidate) => candidate.id === selectedTemplate.id) ?? selectedTemplate
    const adjustedPlayer = { ...player, stats: { ...emptyStats }, badges: BASE_BADGES.map((badge) => ({ ...badge })), trainingLoad: 0 }; adjustedPlayer.overall = calculateOverall(adjustedPlayer)
    setGame({ ...EMPTY_GAME, phase: 'career', player: adjustedPlayer, team: { ...team }, teams, league, relationships: personalizeRelationships(team), schedule: createSchedule(team), pendingStory: personalizeStory(STORY_EVENTS[0], team), feed: [{ id: crypto.randomUUID(), author: '联盟选秀台', handle: '@draftroom', body: `${team.city}${team.name}选择了来自${player.hometown || '未知城市'}的${player.position} ${player.name}。`, time: '刚刚', tone: 'positive', likes: 4208, comments: 603 }, ...INITIAL_FEED] })
  }, [])
  const playNextGame = useCallback((tactic = 'balanced', playThrough = false, preparedResult?: GameResult) => setGame((current) => playSingleGameState({ ...current, autoSimulation: current.autoSimulation ? { ...current.autoSimulation, active: false, currentGameNumber: null } : null }, tactic, playThrough, Math.random, preparedResult)), [])
  const simulateGames = useCallback((count: number) => setGame((current) => simulateRangeState({ ...current, autoSimulation: null }, count)), [])
  const startRegularSeasonSimulation = useCallback(() => setGame((current) => startRegularSeasonSimulationState(current)), [])
  const startPlayoffRoundSimulation = useCallback(() => setGame((current) => startPlayoffRoundSimulationState(current)), [])
  const stopRegularSeasonSimulation = useCallback(() => setGame((current) => stopRegularSeasonSimulationState(current)), [])
  const resolveStory = useCallback((choice: StoryChoice) => setGame((current) => resolveStoryChoiceState(current, choice)), [])
  const dismissStory = useCallback(() => undefined, [])
  const publishPost = useCallback((body: string, tone: 'positive' | 'neutral' | 'negative') => setGame((current) => {
    if (!current.player || !body.trim()) return current
    const fanDelta = tone === 'negative' ? 6 : tone === 'positive' ? 3 : 1; const mediaDelta = tone === 'negative' ? -5 : tone === 'positive' ? 4 : 0
    const item: FeedItem = { id: crypto.randomUUID(), author: current.player.name, handle: `@${current.player.name.toLowerCase().replaceAll(' ', '')}`, body: body.trim(), time: '刚刚', tone, likes: Math.round(300 + current.fans * 95), comments: Math.round(30 + Math.abs(mediaDelta) * 55) }
    const reaction: FeedItem = { id: crypto.randomUUID(), author: tone === 'negative' ? '联盟热评' : '主场球迷会', handle: tone === 'negative' ? '@hotdesk' : '@homefans', body: tone === 'negative' ? '这条动态迅速引发争议，评论员要求球队回应。' : '球迷正在转发这条动态，认为这是一次成熟的公开表达。', time: '刚刚', tone: tone === 'negative' ? 'negative' : 'positive', likes: 900 + current.fans * 40, comments: 120 + Math.abs(mediaDelta) * 40 }
    return { ...current, feed: [reaction, item, ...current.feed].slice(0, 50), fans: bound(current.fans + fanDelta), media: bound(current.media + mediaDelta), life: { ...current.life, professionalism: bound(current.life.professionalism + (tone === 'positive' ? 2 : tone === 'negative' ? -3 : 0)), risk: bound(current.life.risk + (tone === 'negative' ? 3 : 0)) } }
  }), [])
  const sendContactReply = useCallback((relationshipId: string, body: string) => setGame((current) => ({ ...current, player: current.player && relationshipId === 'coach' ? { ...current.player, coachTrust: bound(current.player.coachTrust + 1) } : current.player, relationships: current.relationships.map((relationship) => relationship.id === relationshipId ? { ...relationship, unread: 0, trust: bound(relationship.trust + 1), lastMessage: body, messages: [...relationship.messages, { id: crypto.randomUUID(), from: 'player', body, time: '刚刚' }] } : relationship) })), [])
  const trainAttribute = useCallback((attribute: AttributeKey, mode: 'normal' | 'intense' = 'normal') => setGame((current) => trainAttributeState(current, attribute, mode)), [])
  const mentorSession = useCallback((track: MentorTrack) => setGame((current) => mentorSessionState(current, track)), [])
  const coachMeeting = useCallback((track: CoachTrack) => setGame((current) => coachMeetingState(current, track)), [])
  const menteeSession = useCallback((track: MenteeTrack) => setGame((current) => menteeSessionState(current, track)), [])
  const recover = useCallback(() => setGame((current) => {
    if (!current.player) return current
    const bonus = careerRecoveryBonus(current)
    return { ...current, player: { ...current.player, energy: bound(current.player.energy + 22 + bonus.energy), health: bound(current.player.health + 6 + bonus.health), trainingLoad: Math.max(0, current.player.trainingLoad - 18) }, day: current.day + 1, injury: current.injury && current.injury.gamesLeft <= 1 ? null : current.injury ? { ...current.injury, gamesLeft: current.injury.gamesLeft - 1, reinjuryRisk: Math.max(8, current.injury.reinjuryRisk - 5 - bonus.health) } : null }
  }), [])
  const changePosition = useCallback((position: Position) => setGame((current) => { if (!current.player || current.player.position === position) return current; const player = { ...current.player, secondaryPosition: current.player.position, position, coachTrust: bound(current.player.coachTrust - 6), role: '适应期轮换' }; player.overall = calculateOverall(player); return { ...current, player } }), [])
  const requestTrade = useCallback(() => setGame((current) => {
    if (!current.player || !current.team) return current
    const candidates = current.teams.filter((team) => team.id !== current.team?.id).sort((a, b) => b.strength - a.strength); const team = candidates[Math.floor(Math.random() * Math.min(8, candidates.length))]
    return { ...current, team: { ...team }, schedule: createSchedule(team), autoSimulation: null, relationships: personalizeRelationships(team, current.relationships), city: Math.max(0, current.city - 15), media: bound(current.media + 8), life: { ...current.life, loyalty: bound(current.life.loyalty - 8), ambition: bound(current.life.ambition + 5) }, feed: [{ id: crypto.randomUUID(), author: '交易中心', handle: '@tradecenter', body: `${current.player.name}被交易至${team.city}${team.name}，联盟格局出现变化。`, time: '刚刚', tone: 'neutral', likes: 8200, comments: 1400 }, ...current.feed] }
  }), [])
  const retire = useCallback(() => setGame((current) => ({ ...current, phase: 'retired', autoSimulation: null })), [])
  const chooseRetirement = useCallback((path: string) => setGame((current) => ({ ...current, retirementPath: path })), [])
  const completeOffseason = useCallback((focus: 'training' | 'business' | 'family' | 'city') => setGame((current) => {
    if (!current.player || current.seasonStage !== 'offseason') return current
    let player = { ...current.player, attributes: { ...current.player.attributes }, potential: { ...current.player.potential } }; let fans = current.fans; let media = current.media; let city = current.city; let money = current.money; const life = { ...current.life }
    if (focus === 'training') { (['threePoint', 'ballHandle', 'perimeterDefense', 'stamina'] as AttributeKey[]).forEach((key) => { player.potential[key] = Math.min(99, player.potential[key] + 2); player.attributes[key] = Math.min(player.potential[key], player.attributes[key] + 1) }); life.ambition = bound(life.ambition + 4) }
    if (focus === 'business') { money += 280000; media = bound(media + 6); player.morale = bound(player.morale + 3); life.risk = bound(life.risk + 3) }
    if (focus === 'family') { player.morale = bound(player.morale + 15); player.health = bound(player.health + 8); life.family = bound(life.family + 8) }
    if (focus === 'city') { city = bound(city + 12); fans = bound(fans + 8); money = Math.max(0, money - 50000); life.loyalty = bound(life.loyalty + 6) }
    player.overall = calculateOverall(player); return advanceSeason({ ...current, player, fans, media, city, money, life })
  }), [])
  const completeAwards = useCallback(() => setGame((current) => completeAwardCeremonyState(current)), [])
  const resetGame = useCallback(() => { localStorage.removeItem(SAVE_KEY); setGame({ ...EMPTY_GAME }) }, [])
  return { game, setTab, startCareer, playNextGame, simulateGames, startRegularSeasonSimulation, startPlayoffRoundSimulation, stopRegularSeasonSimulation, resolveStory, dismissStory, publishPost, sendContactReply, trainAttribute, mentorSession, coachMeeting, menteeSession, recover, changePosition, requestTrade, completeOffseason, completeAwards, retire, chooseRetirement, resetGame }
}

export function beginAwardCeremonyState(current: SaveGame): SaveGame {
  if (!current.player || !current.team || current.seasonStage !== 'regular' || current.schedule.some((item) => !item.played)) return current
  if (current.awardCeremony) return current
  if (current.awardHistory?.some((record) => record.seasonYear === current.seasonYear)) return enterPostseason(current)
  const autoSimulation = current.autoSimulation ? { ...current.autoSimulation, active: false, currentGameNumber: null } : null
  return {
    ...current,
    activeTab: 'career',
    awardCeremony: createAwardCeremony(current),
    autoSimulation,
    simulationReport: current.simulationReport ? { ...current.simulationReport, stoppedBy: 'season-end', message: '82场常规赛结束，赛季奖项即将揭晓' } : null,
  }
}

export function completeAwardCeremonyState(current: SaveGame): SaveGame {
  const ceremony = current.awardCeremony
  if (!ceremony || !current.player) return current
  const rewards = awardCareerRewards(ceremony.results)
  const won = ceremony.results.filter((result) => result.playerWon)
  const summary = won.length
    ? `${current.player.name}获得${won.map((result) => result.name).join('、')}，这将成为生涯履历的重要一页。`
    : `${current.player.name}完成了本赛季奖项评选，联盟已经公布全部获奖名单。`
  const awards = current.awards.map((race) => {
    const result = ceremony.results.find((candidate) => candidate.name === race.name)
    return result ? { ...race, leader: result.winner.name, score: result.winner.votes, playerRank: result.playerRank } : race
  })
  const awardHistory = [
    { seasonYear: ceremony.seasonYear, results: ceremony.results },
    ...(current.awardHistory ?? []).filter((record) => record.seasonYear !== ceremony.seasonYear),
  ].slice(0, 20)
  const settled: SaveGame = {
    ...current,
    awardCeremony: null,
    awardHistory,
    awards,
    legacy: current.legacy + rewards.legacy,
    fans: bound(current.fans + rewards.fans),
    media: bound(current.media + rewards.media),
    feed: [{ id: crypto.randomUUID(), author: '联盟奖项中心', handle: '@leagueawards', body: summary, time: '刚刚', tone: (won.length ? 'positive' : 'neutral') as FeedItem['tone'], likes: 3400 + won.length * 7200, comments: 380 + won.length * 940 }, ...current.feed].slice(0, 50),
  }
  return enterPostseason(settled)
}

export function enterPostseason(current: SaveGame): SaveGame {
  if (!current.team || !current.player) return current
  const conference = current.teams.filter((team) => team.conference === current.team?.conference).sort((a, b) => b.wins - a.wins); const rank = conference.findIndex((team) => team.id === current.team?.id) + 1
  if (rank > 8 || rank === 0) return { ...current, seasonStage: 'offseason', playoff: null, schedule: [], pendingStory: { id: `season-end-${current.seasonYear}`, category: '休赛期', title: '赛季止步', speaker: `球队大哥${current.team.mentor}`, body: `球队以联盟第${rank || 15}名结束赛季。更衣室已经安静下来，现在要决定如何利用这个夏天。`, choices: [{ label: '记住这种感觉', hint: '把遗憾变成下赛季的动力', effects: { morale: 5, legacy: 1 }, life: { ambition: 4 } }, { label: '先让身体休息', hint: '接受漫长赛季带来的疲惫', effects: { energy: 15, morale: 2, health: 4 }, life: { family: 2 } }] } }
  const playoff = createPlayoffState(current.teams, current.team.id)
  if (!playoff) return { ...current, seasonStage: 'offseason', playoff: null, schedule: [] }
  const opponent = current.teams.find((team) => team.id === playoff.opponentId)!
  const playoffState = { ...current, seasonStage: 'playoffs' as const, playoff, schedule: [{ opponentId: opponent.id, home: rank <= 4, played: false, gameNumber: 1, month: 4, date: 16 }] }
  const rotation = decideRotation(playoffState, () => 0.5)
  const choices: StoryChoice[] = current.injury
    ? [
        { label: '先通过医疗复检', hint: '优先恢复出场资格，不承诺超出身体许可的角色', effects: { health: 6, coachTrust: 3, energy: 5 }, life: { professionalism: 5 } },
        { label: '在场边参与战术准备', hint: '无法登场时仍帮助球队完成比赛计划', effects: { coachTrust: 5, morale: 3 }, attributes: { vision: 1 }, life: { loyalty: 4 } },
      ]
    : rotation.closingLineup
      ? [
          { label: '主动承担关键回合', hint: '收官阵容职责提高，同时消耗更多体能', effects: { coachTrust: 5, media: 3, energy: -3 }, life: { ambition: 4 }, nextGame: { id: 'playoff-opening-creator', label: '首轮持球责任', gamesLeft: 1, usage: 0.03, offense: 2, fatigue: 2 } },
          { label: '强调团队执行', hint: '稳定更衣室与比赛节奏', effects: { morale: 5, fans: 2 }, life: { loyalty: 3 }, nextGame: { id: 'playoff-opening-team', label: '首轮团队执行', gamesLeft: 1, defense: 1.5, turnoverRisk: -0.35 } },
        ]
      : [
          { label: '从防守和无球争取轮换', hint: `${rotation.reason}；先赢得稳定出场时间`, effects: { coachTrust: 5, morale: 3 }, life: { professionalism: 4 }, nextGame: { id: 'playoff-opening-minutes', label: '争取季后赛轮换', gamesLeft: 1, minutes: 2, defense: 1.5 } },
          { label: '接受角色并帮助第二阵容', hint: '稳定团队关系，不越过当前轮换层级', effects: { morale: 5, mentorXp: 4 }, life: { loyalty: 4 }, nextGame: { id: 'playoff-opening-bench', label: '第二阵容执行', gamesLeft: 1, turnoverRisk: -0.3 } },
        ]
  return { ...playoffState, pendingStory: { id: `playoffs-${current.seasonYear}`, category: '季后赛', title: '灯光变得更亮', speaker: '球队主教练', body: `常规赛已经结束。首轮对手是${opponent.city}${opponent.name}。教练明确了你当前的轮换定位：${rotation.reason}。`, choices } }
}

export function progressPlayoff(current: SaveGame, result: GameResult): SaveGame {
  if (!current.playoff || !current.team) return current
  const previousRound = current.playoff.round
  const progressed = progressPlayoffBracket(current.playoff, current.team.id, current.teams, result.win)
  const schedule = current.schedule
  if (!progressed.seriesComplete) return { ...current, playoff: progressed.state, schedule: [...schedule, { opponentId: progressed.state.opponentId, home: schedule.length % 4 < 2, played: false, gameNumber: schedule.length + 1, month: 4 + Math.floor(schedule.length / 7), date: 16 + (schedule.length * 2) % 13 }] }
  if (progressed.eliminated) return { ...current, seasonStage: 'offseason', playoff: null, schedule: [], legacy: current.legacy + (previousRound - 1) * 6, pendingStory: { id: `eliminated-${current.seasonYear}`, category: '季后赛', title: '最后一声哨响', speaker: '更衣室', body: `系列赛以${progressed.state.teamWins}-4结束。失败会跟随球员很久，你必须决定它会把你带向哪里。`, choices: [{ label: '向队友承诺明年再来', hint: '强化领袖形象', effects: { legacy: 4, morale: 4 }, life: { loyalty: 4 } }, { label: '独自回到球场加练', hint: '牺牲恢复，积累执念', effects: { energy: -8, media: 4 }, life: { ambition: 6, family: -2 } }] } }
  if (progressed.champion) return { ...current, seasonStage: 'offseason', playoff: null, schedule: [], legacy: current.legacy + 35, city: bound(current.city + 18), fans: bound(current.fans + 20), pendingStory: { id: `champion-${current.seasonYear}`, category: '冠军', title: '金色雨落下', speaker: '总决赛现场', body: `${current.player?.name}和${current.team.city}${current.team.name}完成了最后四场胜利。你已经成为这座城市历史的一部分。`, choices: [{ label: '把奖杯交给球队大哥', hint: '完成传承与兄弟情时刻', effects: { legacy: 10, city: 5, mentorXp: 20 }, life: { loyalty: 7 } }, { label: '对镜头承诺建立王朝', hint: '巨星感与压力同时上升', effects: { media: 10, fans: 8 }, life: { ambition: 8, risk: 3 } }] } }
  return { ...current, playoff: progressed.state, schedule: [{ opponentId: progressed.state.opponentId, home: true, played: false, gameNumber: 1, month: 4 + progressed.state.round, date: 2 }], legacy: current.legacy + 6 }
}

function advanceSeason(current: SaveGame): SaveGame {
  if (!current.player || !current.team) return current
  const teamRecord = current.teams.find((team) => team.id === current.team?.id) ?? current.team; const nextYear = current.seasonYear + 1; const attributes = { ...current.player.attributes }
  ;(Object.keys(ATTRIBUTE_LABELS) as AttributeKey[]).forEach((key) => { if (attributes[key] < current.player!.potential[key] && Math.random() < 0.3) attributes[key] += 1; if (current.player!.age >= 33 && Math.random() < 0.25) attributes[key] = Math.max(40, attributes[key] - 1) })
  const player = { ...current.player, age: current.player.age + 1, attributes, stats: { ...emptyStats }, energy: 100, trainingLoad: 0, health: Math.max(62, current.player.health - (current.player.age > 31 ? 2 : 0)), role: current.player.role }; player.overall = calculateOverall(player)
  player.role = player.overall >= 88 ? '首发核心' : player.overall >= 81 ? '首发' : player.overall >= 75 ? '第六人' : player.overall >= 67 ? '轮换球员' : '深度替补'
  const templateTeam = TEAMS.find((team) => team.id === current.team?.id) ?? current.team
  const sourceLeague = current.league ?? initializeLeague(nextYear ^ 0x9e3779b9, current.seasonYear)
  const offseason = advanceLeagueSeason(sourceLeague, current.teams, current.generatedRookies, nextYear)
  const teams = offseason.teams
  const team = teams.find((item) => item.id === templateTeam.id) ?? templateTeam
  return { ...current, seasonYear: nextYear, careerYear: current.careerYear + 1, day: 0, date: `${nextYear}年10月2日`, seasonStage: 'regular', playoff: null, player, team, league: offseason.league, schedule: createSchedule(team), teams, generatedRookies: generateRookieClass(nextYear), pendingStory: null, injury: null, nextGameModifiers: [], lastRotationDecision: null, lastGame: null, simulationReport: null, autoSimulation: null, legacy: current.legacy + Math.max(0, teamRecord.wins - 30) / 2 }
}
