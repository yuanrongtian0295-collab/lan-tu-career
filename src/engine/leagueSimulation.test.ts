import { describe, expect, it } from 'vitest'
import { TEAMS } from '../data/league'
import { createSchedule } from '../data/league'
import { DEFAULT_ALLOCATION, createCareerBuild } from './builderEngine'
import { EMPTY_GAME, playSingleGameState } from './careerState'
import { generateRookieClass } from './rookieGenerator'
import {
  advanceLeagueSeason,
  getLeagueLeaders,
  initializeLeague,
  progressLeagueGameDay,
  recalculateTeamStrengths,
} from './leagueSimulation'

describe('完整联盟球员数据库', () => {
  it('加载现役完整名单、30队和28项能力', () => {
    const league = initializeLeague(20260810, 2026)
    expect(league.players.length).toBeGreaterThanOrEqual(550)
    expect(new Set(league.players.map((player) => player.id)).size).toBe(league.players.length)
    expect(new Set(league.players.map((player) => player.teamId).filter(Boolean)).size).toBe(30)
    expect(Object.keys(league.players[0].attributes)).toHaveLength(28)
    expect(league.players.every((player) => player.overall >= 45 && player.overall <= 99)).toBe(true)
  })

  it('同一存档种子完全可复现，不同存档产生独立波动', () => {
    const first = initializeLeague(1107, 2026)
    const replay = initializeLeague(1107, 2026)
    const otherSave = initializeLeague(1108, 2026)
    expect(replay.players.slice(0, 20)).toEqual(first.players.slice(0, 20))
    expect(otherSave.players.slice(0, 20).map((player) => [player.form, player.development, player.overall]))
      .not.toEqual(first.players.slice(0, 20).map((player) => [player.form, player.development, player.overall]))
  })
})

describe('联盟成长、伤病与实力联动', () => {
  it('主角比赛完成时同步推进全联盟存档', () => {
    const league = initializeLeague(90210, 2026)
    const teams = recalculateTeamStrengths(league, TEAMS.map((team) => ({ ...team })))
    const team = teams[0]
    const player = createCareerBuild({ name: '联动测试', hometown: '上海', age: 19, portraitId: 'guard-11', position: 'PG', secondaryPosition: 'SG', height: 188, weight: 82, wingspan: 198, background: '大学明星', focus: 'creator', allocation: { ...DEFAULT_ALLOCATION } }, [])
    const save = { ...EMPTY_GAME, phase: 'career' as const, player, team, teams, league, schedule: createSchedule(team), pendingStory: null }
    const next = playSingleGameState(save, 'balanced', false, () => 0.53)
    expect(next.league?.tick).toBe(1)
    expect(next.league?.players.some((candidate) => candidate.seasonStats.games === 1)).toBe(true)
    const nextTeam = next.teams.find((candidate) => candidate.id === team.id)!
    expect(nextTeam.wins + nextTeam.losses).toBe(1)
  })

  it('核心轮换伤停会真实降低球队实力', () => {
    const league = initializeLeague(77, 2026)
    const healthyTeams = recalculateTeamStrengths(league, TEAMS)
    const strongest = [...healthyTeams].sort((left, right) => right.strength - left.strength)[0]
    const stars = league.players.filter((player) => player.teamId === strongest.id).sort((left, right) => right.overall - left.overall).slice(0, 4)
    const injured = {
      ...league,
      players: league.players.map((player) => stars.some((star) => star.id === player.id)
        ? { ...player, injury: { name: '长期伤停', bodyPart: 'knee' as const, severity: 3 as const, gamesLeft: 40, reinjuryRisk: 60 } }
        : player),
    }
    const injuredTeam = recalculateTeamStrengths(injured, healthyTeams).find((team) => team.id === strongest.id)!
    expect(injuredTeam.strength).toBeLessThan(strongest.strength - 4)
  })

  it('82轮会生成真实出场数据和多队伤病', () => {
    let league = initializeLeague(314159, 2026)
    let teams = TEAMS.map((team) => ({ ...team }))
    const injuredPlayers = new Set<string>()
    for (let game = 0; game < 82; game += 1) {
      const progressed = progressLeagueGameDay(league, teams)
      league = progressed.league
      teams = progressed.teams
      league.players.forEach((player) => { if (player.injury) injuredPlayers.add(player.id) })
    }
    expect(league.tick).toBe(82)
    expect(injuredPlayers.size).toBeGreaterThan(25)
    expect(league.players.filter((player) => player.seasonStats.games > 0).length).toBeGreaterThan(300)
    expect(getLeagueLeaders(league)[0].ppg).toBeGreaterThan(10)
    expect(league.players.every((player) => player.seasonStats.games <= 82)).toBe(true)
  })

  it('十年推进会成长、衰退、退役并补入自动新秀', () => {
    let league = initializeLeague(8888, 2026)
    let teams = TEAMS.map((team) => ({ ...team, wins: 41, losses: 41 }))
    const initialCount = league.players.length
    const initialVeteran = league.players.find((player) => player.age >= 34 && player.overall >= 80)!
    for (let year = 2027; year <= 2036; year += 1) {
      const progressed = advanceLeagueSeason(league, teams, generateRookieClass(year), year)
      league = progressed.league
      teams = progressed.teams.map((team, index) => ({ ...team, wins: 25 + index % 35, losses: 57 - index % 35 }))
    }
    expect(league.players.length).toBe(initialCount + 600)
    expect(league.players.filter((player) => player.id.startsWith('rookie-')).length).toBe(600)
    expect(league.players.filter((player) => player.retired).length).toBeGreaterThan(5)
    const veteranAfterTenYears = league.players.find((player) => player.id === initialVeteran.id)!
    expect(veteranAfterTenYears.age).toBeGreaterThan(initialVeteran.age)
    expect(veteranAfterTenYears.retired || veteranAfterTenYears.age === initialVeteran.age + 10).toBe(true)
    expect(league.players.every((player) => player.overall >= 45 && player.overall <= 99)).toBe(true)
    expect(league.players.every((player) => Object.values(player.attributes).every((value) => value >= 25 && value <= 99))).toBe(true)
  })
})
