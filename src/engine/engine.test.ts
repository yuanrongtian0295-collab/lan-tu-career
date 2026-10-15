import { describe, expect, it } from 'vitest'
import { PLAYER_LIBRARY, effectiveInheritance } from '../data/playerLibrary'
import { createSchedule, TEAMS } from '../data/league'
import { STORY_EVENTS } from '../data/stories'
import { createPlayoffGameStories, PLAYOFF_STORY_COUNT } from '../data/playoffStories'
import { generateRookieClass } from './rookieGenerator'
import { createLiveGameSession, prepareGameResult, simulateGame } from './gameEngine'
import { createAwardCeremony, evaluateSeasonAwards } from './awardEngine'
import { initializeLeague } from './leagueSimulation'
import { beginAwardCeremonyState, coachMeetingState, completeAwardCeremonyState, EMPTY_GAME, enterPostseason, getEligibleRegularSeasonStories, menteeSessionState, progressPlayoff } from './careerState'
import { autoSimulateNextState, mentorSessionState, playSingleGameState, resolveStoryChoiceState, simulateRangeState, startPlayoffRoundSimulationState, startRegularSeasonSimulationState, trainAttributeState } from './careerState'
import { createCareerBuild, DEFAULT_ALLOCATION } from './builderEngine'
import { normalizeInjuryMessage, normalizeInjuryName, worsenInjuryName } from './injuryRules'
import { decideRotation, reviewCareerRole } from './rotationEngine'
import { careerGameModifiers, careerRecoveryBonus, careerStoryInterval } from './careerInfluenceEngine'
import { isStoryEventEligible } from './storyRules'
import type { CareerPlayer, GameResult, SaveGame } from '../types'

describe('球员与新秀数据', () => {
  it('包含30支真实NBA球队与唯一官方ID和本地Logo', () => {
    expect(TEAMS).toHaveLength(30)
    expect(new Set(TEAMS.map((team) => team.nbaId)).size).toBe(30)
    expect(TEAMS.every((team) => team.logo === `/logos/${team.short.toLowerCase()}.svg`)).toBe(true)
  })

  it('球星库具有唯一ID与合法评分', () => {
    expect(PLAYER_LIBRARY.length).toBeGreaterThanOrEqual(100)
    expect(new Set(PLAYER_LIBRARY.map((player) => player.id)).size).toBe(PLAYER_LIBRARY.length)
    for (const player of PLAYER_LIBRARY) {
      expect(player.overall).toBeGreaterThanOrEqual(25)
      expect(player.overall).toBeLessThanOrEqual(99)
      expect(Math.min(...Object.values(player.attributes))).toBeGreaterThanOrEqual(25)
      expect(Math.max(...Object.values(player.attributes))).toBeLessThanOrEqual(99)
    }
  })

  it('每年稳定生成80名不同的新秀', () => {
    const first = generateRookieClass(2032)
    const second = generateRookieClass(2032)
    expect(first).toHaveLength(80)
    expect(new Set(first.map((player) => player.id)).size).toBe(80)
    expect(first.map((player) => [player.name, player.overall])).toEqual(second.map((player) => [player.name, player.overall]))
  })

  it('极端跨位继承低于同位置继承', () => {
    const source = PLAYER_LIBRARY.find((player) => player.positions.includes('C'))!
    expect(effectiveInheritance(source, 'C', 211, 'block')).toBeGreaterThan(effectiveInheritance(source, 'PG', 188, 'block'))
  })
})

describe('完整建模与生涯系统', () => {
  const makePlayer = () => createCareerBuild({ name: '测试新秀', hometown: '上海', age: 19, portraitId: 'guard-11', position: 'PG', secondaryPosition: 'SG', height: 188, weight: 82, wingspan: 198, background: '大学明星', focus: 'creator', allocation: { ...DEFAULT_ALLOCATION } }, [])
  const makeCareer = (): SaveGame => {
    const player = makePlayer()
    return { ...EMPTY_GAME, phase: 'career', player, team: TEAMS[0], teams: TEAMS.map((team) => ({ ...team })), schedule: createSchedule(TEAMS[0]), pendingStory: null }
  }

  it('身体与位置建模产生合法28项属性和潜力', () => {
    const player = makePlayer()
    expect(Object.keys(player.attributes)).toHaveLength(28)
    expect(player.position).toBe('PG')
    expect(player.secondaryPosition).toBe('SG')
    expect(player.attributes.ballHandle).toBeGreaterThan(player.attributes.interiorDefense)
    expect(Object.keys(player.attributes).every((key) => player.potential[key as keyof typeof player.potential] >= player.attributes[key as keyof typeof player.attributes])).toBe(true)
  })

  it('批量模拟在剧情事件前暂停且日历格变为已完成', () => {
    const state = simulateRangeState(makeCareer(), 82, () => 0.5)
    expect(state.simulationReport?.stoppedBy).toBe('event')
    expect(state.simulationReport?.simulated).toBe(5)
    expect(state.schedule.filter((item) => item.played)).toHaveLength(5)
    expect(state.pendingStory).not.toBeNull()
  })

  it('一键常规赛以单场节奏推进并保留连续模拟状态', () => {
    const started = startRegularSeasonSimulationState(makeCareer())
    expect(started.autoSimulation?.active).toBe(true)
    expect(started.simulationReport?.stoppedBy).toBe('running')
    const advanced = autoSimulateNextState(started, () => 0.99)
    expect(advanced.schedule.filter((item) => item.played)).toHaveLength(1)
    expect(advanced.autoSimulation?.simulated).toBe(1)
    expect(advanced.autoSimulation?.active).toBe(true)
    expect(advanced.autoSimulation?.currentGameNumber).toBe(2)
  })

  it('连续模拟中的伤病使用剧情选择并按休战方案继续推进', () => {
    const injured = { ...makeCareer(), injury: { name: '脚踝扭伤', gamesLeft: 3, severity: 1 as const, reinjuryRisk: 24, playedThrough: 0 } }
    const started = startRegularSeasonSimulationState(injured)
    expect(started.pendingStory?.category).toBe('伤病抉择')
    const resolved = resolveStoryChoiceState(started, started.pendingStory!.choices[0], () => 0.99)
    expect(resolved.pendingStory).toBeNull()
    expect(resolved.autoSimulation?.injuryPolicy).toBe('rest')
    expect(resolved.autoSimulation?.active).toBe(true)
    const advanced = autoSimulateNextState(resolved, () => 0.99)
    expect(advanced.lastGame?.grade).toBe('DNP')
    expect(advanced.injury?.gamesLeft).toBe(2)
    expect(advanced.autoSimulation?.active).toBe(true)
  })

  it('普通剧情选择结束后连续模拟会自动恢复', () => {
    let state = startRegularSeasonSimulationState(makeCareer())
    for (let index = 0; index < 5; index += 1) state = autoSimulateNextState(state, () => 0.99)
    expect(state.pendingStory).not.toBeNull()
    expect(state.autoSimulation?.active).toBe(true)
    const resolved = resolveStoryChoiceState(state, state.pendingStory!.choices[0], () => 0.99)
    const resumed = autoSimulateNextState(resolved, () => 0.99)
    expect(resumed.schedule.filter((item) => item.played)).toHaveLength(6)
    expect(resumed.autoSimulation?.active).toBe(true)
  })

  it('高强度训练提升属性并可能造成训练伤病', () => {
    const current = makeCareer(); const before = current.player!.attributes.threePoint
    const safe = trainAttributeState(current, 'threePoint', 'intense', () => 0.99)
    expect(safe.player!.attributes.threePoint).toBeGreaterThan(before)
    const injured = trainAttributeState(current, 'threePoint', 'intense', () => 0)
    expect(injured.injury?.name).toContain('训练')
  })

  it('大哥共同训练提升属性、徽章和默契经验', () => {
    const current = { ...makeCareer(), player: { ...makePlayer(), badges: [{ id: 'surgeon-pass', name: '手术刀传球', category: '组织' as const, level: 0 as const, progress: 0, description: '测试' }] } }
    const next = mentorSessionState(current, 'playmaking')
    expect(next.mentor.xp).toBeGreaterThan(current.mentor.xp)
    expect(next.player!.attributes.vision).toBeGreaterThan(current.player!.attributes.vision)
    expect(next.player!.badges[0].progress).toBeGreaterThan(0)
  })

  it('常规赛剧情池覆盖更多类别且不再出现正式拜师文案', () => {
    expect(STORY_EVENTS.length).toBeGreaterThanOrEqual(24)
    expect(new Set(STORY_EVENTS.map((story) => story.category)).size).toBeGreaterThanOrEqual(14)
    expect(STORY_EVENTS.flatMap((story) => story.choices).some((choice) => choice.label.includes('正式拜师'))).toBe(false)
  })

  it('大哥初始互动全生涯只出现一次', () => {
    const current = { ...makeCareer(), seasonYear: 2028, careerYear: 3, storyHistory: ['2026:mentor-film-room'] }
    expect(getEligibleRegularSeasonStories(current)?.some((story) => story.id === 'mentor-film-room')).toBe(false)
  })

  it('拥有小弟后不再重复认小弟并改为持续互动', () => {
    const current = { ...makeCareer(), careerYear: 4, storyFlags: ['has-mentee'], player: { ...makePlayer(), stats: { ...makePlayer().stats, games: 30 } } }
    const eligible = getEligibleRegularSeasonStories(current) ?? []
    expect(eligible.some((story) => story.id === 'rookie-mentee')).toBe(false)
    expect(eligible.some((story) => story.category === '小弟互动')).toBe(true)
  })

  it('首次带新人会解锁小弟联系人和长期关系', () => {
    const story = STORY_EVENTS.find((item) => item.id === 'rookie-mentee')!
    const current = { ...makeCareer(), careerYear: 3, pendingStory: story }
    const next = resolveStoryChoiceState(current, story.choices[0], () => .99)
    expect(next.storyFlags).toContain('has-mentee')
    expect(next.relationships.find((relationship) => relationship.id === 'mentee')?.name).toBe('周辰')
  })

  it('教练剧情与主动沟通同时影响人物关系和轮换信任', () => {
    const story = STORY_EVENTS.find((item) => item.id === 'coach-rotation-meeting')!
    const current = { ...makeCareer(), pendingStory: story }
    const resolved = resolveStoryChoiceState(current, story.choices[0], () => .99)
    expect(resolved.player!.coachTrust).toBeGreaterThan(current.player!.coachTrust)
    expect(resolved.relationships.find((relationship) => relationship.id === 'coach')!.trust).toBeGreaterThan(current.relationships.find((relationship) => relationship.id === 'coach')!.trust)
    const met = coachMeetingState(current, 'film')
    expect(met.player!.attributes.helpDefense).toBeGreaterThan(current.player!.attributes.helpDefense)
    expect(met.relationships.find((relationship) => relationship.id === 'coach')!.respect).toBeGreaterThan(current.relationships.find((relationship) => relationship.id === 'coach')!.respect)
  })

  it('小弟训练会形成可持续传承收益', () => {
    const unlockedStory = STORY_EVENTS.find((item) => item.id === 'rookie-mentee')!
    const unlocked = resolveStoryChoiceState({ ...makeCareer(), careerYear: 3, pendingStory: unlockedStory }, unlockedStory.choices[0], () => .99)
    const beforeLegacy = unlocked.legacy
    const trained = menteeSessionState(unlocked, 'film')
    expect(trained.legacy).toBeGreaterThan(beforeLegacy)
    expect(trained.relationships.find((relationship) => relationship.id === 'mentee')!.trust).toBeGreaterThan(unlocked.relationships.find((relationship) => relationship.id === 'mentee')!.trust)
  })

  it('剧情风险会改变人生倾向并留下永久记录', () => {
    const story = STORY_EVENTS.find((item) => item.id === 'nightclub-invite')!
    const current = { ...makeCareer(), pendingStory: story }
    const next = resolveStoryChoiceState(current, story.choices[0], () => 0)
    expect(next.storyRecords[0].riskTriggered).toBe(true)
    expect(next.life.nightlife).toBeGreaterThan(current.life.nightlife)
    expect(next.media).toBeLessThan(current.media)
  })

  it('带伤出场存在伤势加重路径', () => {
    const current = { ...makeCareer(), injury: { name: '脚踝扭伤', gamesLeft: 3, severity: 1 as const, reinjuryRisk: 30, playedThrough: 0 } }
    const next = playSingleGameState(current, 'balanced', true, () => 0)
    expect(next.injury?.severity).toBe(2)
    expect(next.injury?.gamesLeft).toBeGreaterThan(current.injury.gamesLeft)
  })

  it('伤势恶化名称只保留一次加重标记', () => {
    expect(worsenInjuryName('脚踝炎症加重加重')).toBe('脚踝炎症加重')
    expect(normalizeInjuryName('脚踝炎症加重加重（赛季报销）')).toBe('脚踝炎症加重（赛季报销）')
    expect(normalizeInjuryMessage('模拟因脚踝炎症加重加重加重暂停')).toBe('模拟因脚踝炎症加重暂停')
  })

  it('连续三次带伤出场后强制进入DNP且不能继续绕过', () => {
    let state: SaveGame = { ...makeCareer(), injury: { name: '脚踝炎症', gamesLeft: 8, severity: 1 as const, reinjuryRisk: 18, playedThrough: 0 } }
    for (let index = 0; index < 3; index += 1) state = playSingleGameState(state, 'balanced', true, () => 0.99)
    expect(state.injury?.playedThrough).toBe(3)
    expect(state.injury?.restriction).toBe('medical-dnp')

    const forced = playSingleGameState(state, 'balanced', true, () => 0.99)
    expect(forced.lastGame?.grade).toBe('DNP')
    expect(forced.injury?.playedThrough).toBe(3)
    expect(forced.injury?.gamesLeft).toBeLessThan(state.injury!.gamesLeft)
  })

  it('重伤或高复发风险在第三次带伤出场后赛季报销', () => {
    const current = { ...makeCareer(), injury: { name: '膝关节扭伤', gamesLeft: 10, severity: 3 as const, reinjuryRisk: 72, playedThrough: 2 } }
    const next = playSingleGameState(current, 'balanced', true, () => 0.99)
    expect(next.injury?.restriction).toBe('season-ending')
    expect(next.injury?.name).toContain('赛季报销')
    expect(next.injury?.gamesLeft).toBeGreaterThan(next.schedule.filter((item) => !item.played).length)
    expect(prepareGameResult(next, 'balanced', true)?.grade).toBe('DNP')
  })

  it('文字直播锁定的终场结果会原样写入生涯', () => {
    const current = makeCareer()
    const scheduleItem = current.schedule[0]
    const opponent = current.teams.find((team) => team.id === scheduleItem.opponentId)!
    const prepared = simulateGame(current.player!, current.team!, opponent, scheduleItem.home, 'balanced')
    const next = playSingleGameState(current, 'balanced', false, () => 0.99, prepared)
    expect(next.lastGame?.id).toBe(prepared.id)
    expect(next.lastGame?.teamScore).toBe(prepared.teamScore)
    expect(next.lastGame?.points).toBe(prepared.points)
    expect(next.schedule[0].played).toBe(true)
  })

  it('普通新秀前期处于短轮换并会出现教练DNP', () => {
    const player = { ...makePlayer(), overall: 66, coachTrust: 42, role: '轮换新秀' }
    const current = { ...makeCareer(), player, league: initializeLeague(20260816, 2026) }
    let seed = 19
    const random = () => { seed = Math.imul(seed, 1664525) + 1013904223; return (seed >>> 0) / 4294967296 }
    const decisions = Array.from({ length: 12 }, () => decideRotation(current, random))
    expect(decisions.some((decision) => decision.dnp)).toBe(true)
    expect(decisions.reduce((sum, decision) => sum + decision.projectedMinutes, 0) / decisions.length).toBeLessThanOrEqual(12)
    expect(Math.max(...decisions.map((decision) => decision.projectedMinutes))).toBeLessThanOrEqual(14)
  })

  it('顶级新秀建模可提前进入主要轮换但不会直接成为核心', () => {
    const player = { ...makePlayer(), overall: 82, coachTrust: 58, role: '轮换新秀' }
    const current = { ...makeCareer(), player, league: initializeLeague(82, 2026) }
    const decision = decideRotation(current, () => 0.9)
    expect(decision.projectedMinutes).toBeGreaterThanOrEqual(18)
    expect(decision.projectedMinutes).toBeLessThanOrEqual(34)
    expect(decision.status).not.toBe('core')
  })

  it('五场轮换复核同时支持晋升和降级', () => {
    const player = makePlayer()
    const result: GameResult = { id: 'review', opponent: TEAMS[1], home: true, teamScore: 90, opponentScore: 108, win: false, minutes: 8, points: 1, rebounds: 1, assists: 0, steals: 0, blocks: 0, turnovers: 3, grade: 'C', timeline: [], headline: '测试' }
    const struggling = { ...player, overall: 66, coachTrust: 32, role: '首发', stats: { ...player.stats, games: 5, minutes: 55, points: 8, rebounds: 5, assists: 4, turnovers: 9 } }
    expect(reviewCareerRole(makeCareer(), struggling, result, 5)).not.toBe('首发')
    const rising = { ...player, overall: 79, coachTrust: 72, role: '深度替补', stats: { ...player.stats, games: 25, minutes: 520, points: 390, rebounds: 90, assists: 145, steals: 28, turnovers: 42 } }
    expect(['第六人', '首发', '首发核心']).toContain(reviewCareerRole({ ...makeCareer(), careerYear: 2 }, rising, { ...result, grade: 'A' }, 25))
  })

  it('公共声望、人生倾向和人物关系会进入比赛、轮换与恢复计算', () => {
    const base = makeCareer()
    const relationships = base.relationships.map((relationship) => relationship.id === 'coach' ? { ...relationship, trust: 85, respect: 80, tension: 5 } : relationship.id === 'mentor' ? { ...relationship, trust: 84, respect: 78 } : relationship.id === 'romance' ? { ...relationship, intimacy: 82, tension: 8 } : relationship)
    const high = { ...base, fans: 82, media: 78, city: 76, money: 1_500_000, life: { ...base.life, professionalism: 82, ambition: 78, loyalty: 76, family: 80, risk: 20 }, relationships }
    const low = { ...base, fans: 18, media: 18, city: 12, money: 20_000, life: { ...base.life, professionalism: 24, ambition: 35, loyalty: 28, family: 25, risk: 82 }, relationships: base.relationships.map((relationship) => ({ ...relationship, trust: 25, respect: 25, intimacy: 20, tension: 78 })) }
    expect(careerGameModifiers(high, true).some((modifier) => modifier.id === 'influence-fans')).toBe(true)
    expect(careerGameModifiers(low, true).some((modifier) => modifier.id === 'influence-risk')).toBe(true)
    expect(decideRotation(high, () => 0.9).projectedMinutes).toBeGreaterThan(decideRotation(low, () => 0.9).projectedMinutes)
    expect(careerRecoveryBonus(high).health).toBeGreaterThan(careerRecoveryBonus(low).health)
    expect(careerStoryInterval({ ...high, media: 80 })).toBe(4)
  })

  it('剧情资格可以由声望、人生倾向和关系阈值真实锁定', () => {
    const current = makeCareer()
    const event = { id: 'threshold-story', category: '媒体', title: '顶级代言', speaker: '经纪人', body: '只有达到条件才会出现。', requirements: { publicValues: { minFans: 70, minMoney: 1_000_000 }, lifeValues: { ambition: { min: 70 } }, relationship: { id: 'agent', minTrust: 70 } }, choices: [{ label: '签约', hint: '测试', effects: { money: 1 } }] }
    expect(isStoryEventEligible(event, current)).toBe(false)
    const unlocked = { ...current, fans: 80, money: 1_500_000, life: { ...current.life, ambition: 80 }, relationships: current.relationships.map((relationship) => relationship.id === 'agent' ? { ...relationship, trust: 80 } : relationship) }
    expect(isStoryEventEligible(event, unlocked)).toBe(true)
  })
})

describe('比赛模拟', () => {
  const seededRandom = (seed: number) => {
    let value = seed >>> 0
    return () => {
      value += 0x6d2b79f5
      let mixed = value
      mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
    }
  }

  const makeSimulationPlayer = (attributeValue = 78): CareerPlayer => {
    const attributes = Object.fromEntries(Object.keys(PLAYER_LIBRARY[0].attributes).map((key) => [key, attributeValue])) as CareerPlayer['attributes']
    return {
      id: 'simulation-player', name: '模拟球员', age: 22, number: 12, hometown: '上海', position: 'PG', secondaryPosition: 'SG', height: 191, weight: 86, wingspan: 201,
      background: '大学明星', archetype: '双向核心', overall: attributeValue, attributes, potential: { ...attributes }, badges: [], inheritances: [], energy: 92, morale: 80, health: 100, coachTrust: 72, role: '首发核心', trainingLoad: 0,
      stats: { games: 0, starts: 0, minutes: 0, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fgMade: 0, fgAttempted: 0, threeMade: 0, threeAttempted: 0 },
    }
  }

  const simulationTeam = { ...TEAMS[0], strength: 85, pace: 99 }
  const simulationOpponent = { ...TEAMS[1], strength: 85, pace: 99 }

  const runSeries = (player: CareerPlayer, seed: number, tactic = 'balanced', games = 1800) => {
    const random = seededRandom(seed)
    const totals = { wins: 0, points: 0, assists: 0, turnovers: 0, teamScore: 0, opponentScore: 0 }
    for (let index = 0; index < games; index += 1) {
      const result = simulateGame(player, simulationTeam, simulationOpponent, index % 2 === 0, tactic, random)
      totals.wins += result.win ? 1 : 0
      totals.points += result.points
      totals.assists += result.assists
      totals.turnovers += result.turnovers
      totals.teamScore += result.teamScore
      totals.opponentScore += result.opponentScore
    }
    return {
      winRate: totals.wins / games,
      points: totals.points / games,
      assists: totals.assists / games,
      turnovers: totals.turnovers / games,
      teamScore: totals.teamScore / games,
      opponentScore: totals.opponentScore / games,
    }
  }

  it('输出合法比赛与球员统计', () => {
    const source = PLAYER_LIBRARY[0]
    const player: CareerPlayer = {
      id: 'test', name: '测试球员', age: 20, number: 9, hometown: '江城', position: 'C', secondaryPosition: 'PF', height: 211, weight: 112, wingspan: 225,
      background: '大学明星', archetype: '组织中锋', overall: 85, attributes: source.attributes, potential: source.attributes, badges: [], inheritances: [], energy: 90, morale: 75, health: 100, coachTrust: 60, role: '首发', trainingLoad: 0,
      stats: { games: 0, starts: 0, minutes: 0, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fgMade: 0, fgAttempted: 0, threeMade: 0, threeAttempted: 0 },
    }
    const result = simulateGame(player, TEAMS[0], TEAMS[1], true)
    expect(result.minutes).toBeGreaterThanOrEqual(8)
    expect(result.minutes).toBeLessThanOrEqual(44)
    expect(result.teamScore).toBeGreaterThan(50)
    expect(result.timeline).toHaveLength(4)

    const live = createLiveGameSession(result, player, TEAMS[0])
    const last = live.events[live.events.length - 1]
    expect(live.events).toHaveLength(36)
    expect(new Set(live.events.map((event) => event.quarter))).toEqual(new Set([1, 2, 3, 4]))
    expect(last.teamScore).toBe(result.teamScore)
    expect(last.opponentScore).toBe(result.opponentScore)
    expect(last.points).toBe(result.points)
    expect(last.assists).toBe(result.assists)
    expect(live.result.timeline).toHaveLength(36)
    expect(live.events.every((event, index) => index === 0 || event.teamScore >= live.events[index - 1].teamScore)).toBe(true)
  })

  it('属性成长会同时改变个人产出和长期胜率', () => {
    const developing = runSeries(makeSimulationPlayer(64), 20260810)
    const superstar = runSeries(makeSimulationPlayer(92), 20260810)
    expect(superstar.winRate).toBeGreaterThan(developing.winRate + 0.12)
    expect(superstar.points).toBeGreaterThan(developing.points + 5)
    expect(superstar.opponentScore).toBeLessThan(developing.opponentScore - 2)
  })

  it('比赛型徽章能产生独立于属性的攻防优势', () => {
    const base = makeSimulationPlayer(78)
    const enhanced: CareerPlayer = {
      ...base,
      badges: [
        { id: 'iron-finish', name: '强硬终结', category: '终结', level: 4, progress: 100, description: '' },
        { id: 'deep-threat', name: '超远威胁', category: '投射', level: 4, progress: 100, description: '' },
        { id: 'surgeon-pass', name: '手术刀传球', category: '组织', level: 4, progress: 100, description: '' },
        { id: 'chain-lock', name: '外线锁链', category: '防守', level: 4, progress: 100, description: '' },
        { id: 'help-instinct', name: '协防直觉', category: '防守', level: 4, progress: 100, description: '' },
        { id: 'clutch', name: '大场面球员', category: '精神', level: 4, progress: 100, description: '' },
      ],
    }
    const withoutBadges = runSeries(base, 42)
    const withBadges = runSeries(enhanced, 42)
    expect(withBadges.winRate).toBeGreaterThan(withoutBadges.winRate + 0.04)
    expect(withBadges.teamScore).toBeGreaterThan(withoutBadges.teamScore + 1)
    expect(withBadges.opponentScore).toBeLessThan(withoutBadges.opponentScore - 1)
  })

  it('体能、健康和士气下降会真实削弱胜率', () => {
    const fresh = makeSimulationPlayer(82)
    const depleted = { ...fresh, energy: 18, health: 62, morale: 42 }
    const freshSeries = runSeries(fresh, 9090)
    const depletedSeries = runSeries(depleted, 9090)
    expect(freshSeries.winRate).toBeGreaterThan(depletedSeries.winRate + 0.05)
    expect(freshSeries.points).toBeGreaterThan(depletedSeries.points + 3)
  })

  it('战术选择形成得分、助攻和失误之间的取舍', () => {
    const player = makeSimulationPlayer(82)
    const attack = runSeries(player, 777, 'attack')
    const passing = runSeries(player, 777, 'pass')
    expect(attack.points).toBeGreaterThan(passing.points + 5)
    expect(passing.assists).toBeGreaterThan(attack.assists + 2)
    expect(attack.turnovers).toBeGreaterThan(passing.turnovers)
  })

  it('固定随机种子会重放出相同比赛结果', () => {
    const player = makeSimulationPlayer(84)
    const first = simulateGame(player, simulationTeam, simulationOpponent, true, 'balanced', seededRandom(99))
    const replay = simulateGame(player, simulationTeam, simulationOpponent, true, 'balanced', seededRandom(99))
    expect({ ...first, id: 'stable' }).toEqual({ ...replay, id: 'stable' })
  })

  it('文字直播会在对应回合反馈实际生效的徽章', () => {
    const player: CareerPlayer = {
      ...makeSimulationPlayer(82),
      badges: [{ id: 'surgeon-pass', name: '手术刀传球', category: '组织', level: 2, progress: 40, description: '' }],
    }
    const result = { ...simulateGame(player, simulationTeam, simulationOpponent, true, 'pass', seededRandom(16)), points: 0, assists: 8 }
    const live = createLiveGameSession(result, player, simulationTeam)
    expect(live.result.timeline.some((line) => line.includes('「手术刀传球」徽章生效'))).toBe(true)
  })
})

describe('常规赛奖项评选', () => {
  const makeAwardsCareer = () => {
    const player = createCareerBuild({ name: '奖项测试球员', hometown: '上海', age: 20, portraitId: 'guard-11', position: 'PG', secondaryPosition: 'SG', height: 191, weight: 86, wingspan: 202, background: '大学明星', focus: 'creator', allocation: { ...DEFAULT_ALLOCATION } }, [])
    player.stats = { games: 82, starts: 82, minutes: 2952, points: 3690, rebounds: 574, assists: 902, steals: 164, blocks: 49, turnovers: 238, fgMade: 1180, fgAttempted: 2220, threeMade: 330, threeAttempted: 790 }
    player.overall = 91
    player.morale = 94
    player.coachTrust = 96
    const teams = TEAMS.map((team, index) => ({ ...team, wins: index === 0 ? 64 : Math.max(20, 56 - index), losses: index === 0 ? 18 : 26 + index }))
    const league = initializeLeague(20260811, 2026)
    league.players = league.players.map((candidate) => ({
      ...candidate,
      seasonStats: {
        games: 82,
        minutes: candidate.baselineStats.mpg * 82,
        points: candidate.baselineStats.ppg * 82,
        threeMade: candidate.baselineStats.ppg * Math.max(.025, (candidate.attributes.threePoint - 42) / 420) * 82,
        rebounds: candidate.baselineStats.rpg * 82,
        assists: candidate.baselineStats.apg * 82,
        steals: candidate.baselineStats.spg * 82,
        blocks: candidate.baselineStats.bpg * 82,
      },
    }))
    return { ...EMPTY_GAME, phase: 'career' as const, player, team: teams[0], teams, league, schedule: createSchedule(teams[0]).map((game) => ({ ...game, played: true })), seasonStage: 'regular' as const, pendingStory: null }
  }

  it('生成12项奖项、个人候选与四套五人阵容', () => {
    const results = evaluateSeasonAwards(makeAwardsCareer())
    expect(results).toHaveLength(12)
    expect(results.map((result) => result.name)).toEqual(['MVP', '得分王', '助攻王', '抢断王', '篮板王', '三分王', '防守一阵（DPOY）', '防守二阵', '最佳阵容一阵', '最佳阵容二阵', '最佳新秀', '进步最快球员'])
    expect(results.filter((result) => !result.isLineup).every((result) => result.finalists.length === 3)).toBe(true)
    expect(results.filter((result) => result.isLineup).every((result) => result.recipients.length === 5)).toBe(true)
    expect(results.every((result) => result.finalists.reduce((sum, finalist) => sum + finalist.votes, 0) === 100)).toBe(true)
    expect(results[0].winner.name).toBe('奖项测试球员')
    expect(new Set([...results[6].recipients, ...results[7].recipients].map((candidate) => candidate.id)).size).toBe(10)
    expect(new Set([...results[8].recipients, ...results[9].recipients].map((candidate) => candidate.id)).size).toBe(10)
    expect(createAwardCeremony(makeAwardsCareer()).seasonYear).toBe(2026)
  })

  it('三分王按赛季真实三分命中数评选', () => {
    const game = makeAwardsCareer()
    const target = game.league.players.find((candidate) => candidate.teamId && !candidate.retired)!
    game.league.players = game.league.players.map((candidate) => ({
      ...candidate,
      seasonStats: { ...candidate.seasonStats, threeMade: candidate.id === target.id ? 500 : 0 },
    }))
    expect(evaluateSeasonAwards(game).find((award) => award.name === '三分王')?.winner.id).toBe(target.id)
  })

  it('第82场后先进入奖项盛典，完成后才生成季后赛并记录生涯奖励', () => {
    const career = makeAwardsCareer()
    const ceremony = beginAwardCeremonyState(career)
    expect(ceremony.awardCeremony?.results).toHaveLength(12)
    expect(ceremony.seasonStage).toBe('regular')
    const completed = completeAwardCeremonyState(ceremony)
    expect(completed.awardCeremony).toBeNull()
    expect(completed.awardHistory?.[0].seasonYear).toBe(2026)
    expect(completed.seasonStage).toBe('playoffs')
    expect(completed.legacy).toBeGreaterThan(career.legacy)
    expect(completed.feed[0].author).toBe('联盟奖项中心')
  })
})

describe('季后赛阶段', () => {
  const makePlayoffCareer = () => {
    const player = createCareerBuild({ name: '季后赛测试球员', hometown: '上海', age: 23, portraitId: 'guard-23', position: 'PG', secondaryPosition: 'SG', height: 190, weight: 84, wingspan: 201, background: '大学明星', focus: 'creator', allocation: { ...DEFAULT_ALLOCATION } }, [])
    const teams = TEAMS.map((team, index) => ({ ...team, wins: index === 0 ? 60 : Math.max(20, 55 - index), losses: index === 0 ? 22 : 27 + index }))
    return enterPostseason({ ...EMPTY_GAME, phase: 'career' as const, player, team: teams[0], teams, schedule: [], seasonStage: 'regular' as const })
  }

  it('季后赛剧情池足以让单轮七场每场两次且不重复', () => {
    expect(PLAYOFF_STORY_COUNT).toBeGreaterThanOrEqual(14)
    const current = { ...makePlayoffCareer(), pendingStory: null, storyQueue: [] }
    const opponent = current.teams.find((team) => team.id === current.playoff?.opponentId)!
    const result: GameResult = { id: 'story-game', opponent, home: true, teamScore: 108, opponentScore: 101, win: true, minutes: 36, points: 24, rebounds: 6, assists: 9, steals: 1, blocks: 0, turnovers: 2, grade: 'A', timeline: [], headline: '胜利' }
    const events = createPlayoffGameStories({ ...current, schedule: [{ ...current.schedule[0], played: true, result }] }, result, 1, () => 0)
    expect(events).toHaveLength(2)
    expect(new Set(events.map((event) => event.id)).size).toBe(2)
    const beforeTrust = current.player!.coachTrust
    const resolved = resolveStoryChoiceState({ ...current, pendingStory: events[0], storyQueue: events.slice(1) }, events[0].choices[0], () => 0.99)
    expect(resolved.pendingStory?.id).toBe(events[1].id)
    expect(resolved.player!.coachTrust).not.toBe(beforeTrust)
    expect(resolved.storyRecords[0].effects.length).toBeGreaterThan(0)
  })

  it('未出场时只生成场边、医疗或球队事件，不提供关键球选择', () => {
    const current = { ...makePlayoffCareer(), pendingStory: null, storyQueue: [] }
    const opponent = current.teams.find((team) => team.id === current.playoff?.opponentId)!
    const result: GameResult = { id: 'dnp-story', opponent, home: true, teamScore: 99, opponentScore: 103, win: false, minutes: 0, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, grade: 'DNP', timeline: [], headline: 'DNP' }
    const events = createPlayoffGameStories({ ...current, schedule: [{ ...current.schedule[0], played: true, result }] }, result, 1, () => 0)
    expect(events).toHaveLength(2)
    expect(events.every((event) => !event.requirements?.requiresParticipation)).toBe(true)
    expect(events.flatMap((event) => event.choices).every((choice) => !choice.label.includes('关键回合') && !choice.label.includes('打满'))).toBe(true)
  })

  it('排队中的球场事件在球员受伤后会在选择前自动作废', () => {
    const current = { ...makePlayoffCareer(), pendingStory: null, storyQueue: [] }
    const opponent = current.teams.find((team) => team.id === current.playoff?.opponentId)!
    const result: GameResult = { id: 'court-story', opponent, home: true, teamScore: 108, opponentScore: 105, win: true, minutes: 32, points: 22, rebounds: 5, assists: 8, steals: 1, blocks: 0, turnovers: 2, grade: 'A', timeline: [], headline: '胜利' }
    const events = createPlayoffGameStories({ ...current, schedule: [{ ...current.schedule[0], played: true, result }] }, result, 1, () => 0)
    const courtEvent = events.find((event) => event.requirements?.requiresParticipation)!
    const safeEvent = { id: 'medical-safe', category: '健康', title: '复检', speaker: '医疗组', body: '先完成复检。', choices: [{ label: '接受复检', hint: '安全', effects: { health: 2 } }] }
    const injured = { ...current, injury: { name: '脚踝扭伤', gamesLeft: 8, severity: 3 as const, reinjuryRisk: 70, playedThrough: 3, restriction: 'season-ending' as const }, pendingStory: courtEvent, storyQueue: [safeEvent] }
    const beforeTrust = injured.player!.coachTrust
    const resolved = resolveStoryChoiceState(injured, courtEvent.choices[0], () => 0.99)
    expect(resolved.player!.coachTrust).toBe(beforeTrust)
    expect(resolved.pendingStory?.id).toBe('medical-safe')
  })

  it('一键模拟本轮系列赛会逐场触发剧情并在晋级或淘汰后停止', () => {
    let state = startPlayoffRoundSimulationState({ ...makePlayoffCareer(), pendingStory: null, storyQueue: [] })
    const targetRound = state.playoff!.round
    let safety = 0
    while (state.autoSimulation?.active && safety < 80) {
      state = state.pendingStory
        ? resolveStoryChoiceState(state, state.pendingStory.choices[0], () => 0.99)
        : autoSimulateNextState(state, () => 0.5)
      safety += 1
    }
    const playoffHistory = state.storyHistory.filter((key) => key.includes(`:playoff-r${targetRound}-`))
    expect(safety).toBeLessThan(80)
    expect(state.autoSimulation?.active).toBe(false)
    expect(state.autoSimulation?.simulated).toBeGreaterThanOrEqual(4)
    expect(state.autoSimulation?.simulated).toBeLessThanOrEqual(7)
    expect(playoffHistory.length).toBeGreaterThanOrEqual(state.autoSimulation!.simulated)
    expect(playoffHistory.length).toBeLessThanOrEqual(state.autoSimulation!.simulated * 2)
    expect(new Set(playoffHistory).size).toBe(playoffHistory.length)
  })

  it('常规赛结算后进入七战四胜系列赛并可晋级', () => {
    const source = PLAYER_LIBRARY[0]
    const player: CareerPlayer = {
      id: 'playoff-player', name: '季后赛球员', age: 24, number: 12, hometown: '江城', position: 'C', secondaryPosition: 'PF', height: 211, weight: 112, wingspan: 225,
      background: '大学明星', archetype: '组织中锋', overall: 90, attributes: source.attributes, potential: source.attributes, badges: [], inheritances: [], energy: 95, morale: 88, health: 100, coachTrust: 82, role: '首发核心', trainingLoad: 0,
      stats: { games: 82, starts: 82, minutes: 2800, points: 2000, rebounds: 850, assists: 720, steals: 100, blocks: 90, turnovers: 210, fgMade: 700, fgAttempted: 1400, threeMade: 110, threeAttempted: 300 },
    }
    const teams = TEAMS.map((team, index) => ({ ...team, wins: index === 0 ? 58 : Math.max(18, 54 - index), losses: index === 0 ? 24 : 28 + index }))
    const regular: SaveGame = { ...EMPTY_GAME, phase: 'career', player, team: teams[0], teams, schedule: [], seasonStage: 'regular' }
    let state = enterPostseason(regular)
    expect(state.seasonStage).toBe('playoffs')
    expect(state.playoff?.round).toBe(1)
    expect(state.playoff?.bracket).toHaveLength(15)
    expect(state.playoff?.bracket?.filter((series) => series.round === 1)).toHaveLength(8)
    expect(state.playoff?.bracket?.filter((series) => series.round === 4)).toHaveLength(1)
    expect(state.schedule).toHaveLength(1)
    const opponent = state.teams.find((team) => team.id === state.playoff?.opponentId)!
    const win: GameResult = { id: 'w', opponent, home: true, teamScore: 112, opponentScore: 101, win: true, minutes: 36, points: 28, rebounds: 9, assists: 8, steals: 2, blocks: 1, turnovers: 2, grade: 'A', timeline: [], headline: '胜利' }
    for (let index = 0; index < 4; index += 1) state = progressPlayoff(state, win)
    expect(state.playoff?.round).toBe(2)
    expect(state.playoff?.teamWins).toBe(0)
    expect(state.playoff?.bracket?.find((series) => series.id === state.playoff?.currentSeriesId)?.teamAId === state.team?.id || state.playoff?.bracket?.find((series) => series.id === state.playoff?.currentSeriesId)?.teamBId === state.team?.id).toBe(true)
  })
})
