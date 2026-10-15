import type { GameResult, SaveGame, StoryAvailability, StoryContext, StoryEvent } from '../types'
import { isMedicallyUnavailable } from './injuryRules'

const NON_PLAYING_CATEGORIES = new Set(['伤病抉择', '健康', '恢复', '战术', '教练', '更衣室', '媒体', '季后赛', '冠军', '休赛期'])
const ON_COURT_CATEGORIES = new Set(['关键球', '出场时间', '比赛计划', '轮换', '对抗', '训练'])
const ON_COURT_PHRASES = ['最后一攻', '关键回合', '打满关键', '留在场上', '主动领防', '个人单打', '承担防守任务']

export function storyAvailability(current: SaveGame): StoryAvailability {
  if (current.injury?.restriction === 'season-ending') return 'season-ending'
  if (current.injury && isMedicallyUnavailable(current.injury)) return 'medical-dnp'
  if (current.injury) return 'limited'
  return 'healthy'
}

export function createStoryContext(current: SaveGame, result: GameResult, phase: StoryContext['phase'] = 'postgame'): StoryContext {
  const teamWins = (current.playoff?.teamWins ?? 0) + (result.win ? 1 : 0)
  const seriesLosses = (current.playoff?.opponentWins ?? 0) + (result.win ? 0 : 1)
  return {
    stage: current.seasonStage,
    phase,
    availability: storyAvailability(current),
    participated: result.grade !== 'DNP' && result.minutes > 0,
    minutes: result.minutes,
    scoreMargin: Math.abs(result.teamScore - result.opponentScore),
    home: result.home,
    playoffRound: current.playoff?.round,
    seriesWins: teamWins,
    seriesLosses,
    closeoutGame: teamWins === 3,
    eliminationGame: seriesLosses === 3,
  }
}

export function isStoryEventEligible(story: StoryEvent, current: SaveGame, context = story.context) {
  const requirements = story.requirements
  const games = current.player?.stats.games ?? 0
  if (requirements?.minCareerYear !== undefined && current.careerYear < requirements.minCareerYear) return false
  if (requirements?.maxCareerYear !== undefined && current.careerYear > requirements.maxCareerYear) return false
  if (requirements?.minGames !== undefined && games < requirements.minGames) return false
  if (requirements?.maxGames !== undefined && games > requirements.maxGames) return false
  if (requirements?.requireFlags?.some((flag) => !current.storyFlags.includes(flag))) return false
  if (requirements?.excludeFlags?.some((flag) => current.storyFlags.includes(flag))) return false
  if (requirements?.stages && (!context || !requirements.stages.includes(context.stage))) return false
  if (requirements?.phases && (!context || !requirements.phases.includes(context.phase))) return false

  const availability = storyAvailability(current)
  if (requirements?.availability && !requirements.availability.includes(availability)) return false
  if (requirements?.requiresParticipation && !context?.participated) return false
  if (requirements?.minMinutes !== undefined && (context?.minutes ?? 0) < requirements.minMinutes) return false
  if (requirements?.maxInjurySeverity !== undefined && (current.injury?.severity ?? 0) > requirements.maxInjurySeverity) return false
  if (requirements?.maxScoreMargin !== undefined && (context?.scoreMargin ?? Number.POSITIVE_INFINITY) > requirements.maxScoreMargin) return false
  if (requirements?.playoffRounds && (!context?.playoffRound || !requirements.playoffRounds.includes(context.playoffRound))) return false
  if (requirements?.requireCloseoutGame && !context?.closeoutGame) return false
  if (requirements?.requireEliminationGame && !context?.eliminationGame) return false
  if (requirements?.publicValues) {
    const values = requirements.publicValues
    if (values.minFans !== undefined && current.fans < values.minFans) return false
    if (values.maxFans !== undefined && current.fans > values.maxFans) return false
    if (values.minMedia !== undefined && current.media < values.minMedia) return false
    if (values.maxMedia !== undefined && current.media > values.maxMedia) return false
    if (values.minCity !== undefined && current.city < values.minCity) return false
    if (values.maxCity !== undefined && current.city > values.maxCity) return false
    if (values.minMoney !== undefined && current.money < values.minMoney) return false
  }
  if (requirements?.lifeValues) {
    for (const [key, range] of Object.entries(requirements.lifeValues) as Array<[keyof SaveGame['life'], { min?: number; max?: number }]>) {
      if (range.min !== undefined && current.life[key] < range.min) return false
      if (range.max !== undefined && current.life[key] > range.max) return false
    }
  }
  if (requirements?.relationship) {
    const relationship = current.relationships.find((item) => item.id === requirements.relationship?.id)
    if (!relationship) return false
    if (requirements.relationship.minTrust !== undefined && relationship.trust < requirements.relationship.minTrust) return false
    if (requirements.relationship.maxTrust !== undefined && relationship.trust > requirements.relationship.maxTrust) return false
    if (requirements.relationship.minRespect !== undefined && relationship.respect < requirements.relationship.minRespect) return false
    if (requirements.relationship.minIntimacy !== undefined && relationship.intimacy < requirements.relationship.minIntimacy) return false
    if (requirements.relationship.minTension !== undefined && relationship.tension < requirements.relationship.minTension) return false
    if (requirements.relationship.maxTension !== undefined && relationship.tension > requirements.relationship.maxTension) return false
  }

  const combinedText = `${story.title} ${story.body} ${story.choices.map((choice) => `${choice.label} ${choice.hint}`).join(' ')}`
  if ((availability === 'medical-dnp' || availability === 'season-ending') && (!NON_PLAYING_CATEGORIES.has(story.category) || ON_COURT_PHRASES.some((phrase) => combinedText.includes(phrase)))) return false
  if (availability === 'limited' && (story.category === '关键球' || story.category === '出场时间') && !requirements?.availability?.includes('limited')) return false
  if (context && !context.participated && ON_COURT_CATEGORIES.has(story.category) && requirements?.requiresParticipation !== false) return false
  return true
}

export function validStorySequence(current: SaveGame, stories: StoryEvent[]) {
  return stories.filter((story) => isStoryEventEligible(story, current))
}
