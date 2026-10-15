export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C'
export type Era = 'current' | 'historic' | 'generated'

export type AttributeKey =
  | 'closeShot' | 'layup' | 'drivingDunk' | 'standingDunk' | 'postControl'
  | 'midRange' | 'threePoint' | 'freeThrow' | 'shotStability'
  | 'passAccuracy' | 'vision' | 'ballHandle' | 'speedWithBall'
  | 'interiorDefense' | 'perimeterDefense' | 'steal' | 'block' | 'helpDefense'
  | 'offensiveRebound' | 'defensiveRebound'
  | 'speed' | 'acceleration' | 'strength' | 'vertical' | 'stamina' | 'durability'
  | 'clutch' | 'leadership'

export type Attributes = Record<AttributeKey, number>

export interface LibraryPlayer {
  id: string
  name: string
  era: Era
  season: string
  positions: Position[]
  archetype: Archetype
  overall: number
  attributes: Attributes
  signature: AttributeKey[]
}

export type Archetype =
  | 'floorGeneral' | 'scoringGuard' | 'twoWayGuard' | 'sharpshooter'
  | 'wingScorer' | 'twoWayWing' | 'athleticWing' | 'allAround'
  | 'playmakingBig' | 'stretchBig' | 'rimProtector' | 'postScorer'

export interface Badge {
  id: string
  name: string
  category: '终结' | '投射' | '组织' | '防守' | '精神'
  level: 0 | 1 | 2 | 3 | 4
  progress: number
  description: string
}

export interface TalentInheritance {
  sourceId: string
  sourceName: string
  attribute: AttributeKey
  sourceValue: number
  effectiveValue: number
}

export interface CareerPlayer {
  id: string
  name: string
  age: number
  number: number
  /** Visual preset identity. Optional only so legacy simulation fixtures can hydrate. */
  portraitId?: import('./data/playerPresets').PlayerPortraitId
  hometown: string
  position: Position
  secondaryPosition: Position
  height: number
  weight: number
  wingspan: number
  background: string
  archetype: string
  overall: number
  attributes: Attributes
  potential: Attributes
  badges: Badge[]
  inheritances: TalentInheritance[]
  energy: number
  morale: number
  health: number
  coachTrust: number
  role: string
  trainingLoad: number
  stats: SeasonStats
}

export interface SeasonStats {
  games: number
  starts: number
  minutes: number
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  fgMade: number
  fgAttempted: number
  threeMade: number
  threeAttempted: number
}

export interface Team {
  id: string
  nbaId: string
  city: string
  name: string
  englishName: string
  short: string
  conference: '东部' | '西部'
  color: string
  accent: string
  logo: string
  mentor: string
  strength: number
  pace: number
  wins: number
  losses: number
}

export interface Relationship {
  id: string
  name: string
  role: string
  avatar: string
  trust: number
  respect: number
  intimacy: number
  tension: number
  unread: number
  lastMessage: string
  messages: ContactMessage[]
}

export interface ContactMessage {
  id: string
  from: 'contact' | 'player'
  body: string
  time: string
}

export interface FeedItem {
  id: string
  author: string
  handle: string
  body: string
  time: string
  tone: 'positive' | 'neutral' | 'negative'
  likes: number
  comments: number
}

export interface StoryChoice {
  label: string
  hint: string
  effects: StoryEffects
  relationship?: { id: string; trust?: number; respect?: number; intimacy?: number; tension?: number }
  life?: Partial<LifeValues>
  badge?: { id: string; progress: number }
  attributes?: Partial<Record<AttributeKey, number>>
  flags?: string[]
  nextGame?: NextGameModifier
  relationshipUnlock?: Relationship
  risk?: {
    chance: number
    label: string
    result: string
    effects: StoryEffects
    life?: Partial<LifeValues>
    injury?: { name: string; games: number; severity: 1 | 2 | 3 }
  }
}

export interface NextGameModifier {
  id: string
  label: string
  gamesLeft: number
  minutes?: number
  usage?: number
  offense?: number
  defense?: number
  turnoverRisk?: number
  fatigue?: number
  injuryRisk?: number
}

export interface StoryEffects {
  fans?: number
  media?: number
  city?: number
  legacy?: number
  morale?: number
  coachTrust?: number
  energy?: number
  health?: number
  money?: number
  mentorXp?: number
}

export interface LifeValues {
  professionalism: number
  ambition: number
  loyalty: number
  family: number
  nightlife: number
  risk: number
}

export interface StoryRecord {
  id: string
  title: string
  choice: string
  result: string
  riskTriggered: boolean
  seasonYear: number
  gameNumber: number
  effects: string[]
}

export type StoryAvailability = 'healthy' | 'limited' | 'medical-dnp' | 'season-ending'
export type StoryPhase = 'pregame' | 'postgame' | 'between-games' | 'off-court'

export interface StoryContext {
  stage: 'regular' | 'playoffs' | 'offseason'
  phase: StoryPhase
  availability: StoryAvailability
  participated: boolean
  minutes: number
  scoreMargin: number
  home: boolean
  playoffRound?: number
  seriesWins?: number
  seriesLosses?: number
  closeoutGame?: boolean
  eliminationGame?: boolean
}

export interface StoryRequirements {
  minCareerYear?: number
  maxCareerYear?: number
  minGames?: number
  maxGames?: number
  requireFlags?: string[]
  excludeFlags?: string[]
  stages?: Array<'regular' | 'playoffs' | 'offseason'>
  phases?: StoryPhase[]
  availability?: StoryAvailability[]
  requiresParticipation?: boolean
  minMinutes?: number
  maxInjurySeverity?: number
  maxScoreMargin?: number
  playoffRounds?: number[]
  requireCloseoutGame?: boolean
  requireEliminationGame?: boolean
  publicValues?: { minFans?: number; maxFans?: number; minMedia?: number; maxMedia?: number; minCity?: number; maxCity?: number; minMoney?: number }
  lifeValues?: Partial<Record<keyof LifeValues, { min?: number; max?: number }>>
  relationship?: { id: string; minTrust?: number; maxTrust?: number; minRespect?: number; minIntimacy?: number; minTension?: number; maxTension?: number }
}

export interface StoryEvent {
  id: string
  category: string
  title: string
  body: string
  speaker: string
  choices: StoryChoice[]
  recurrence?: 'season' | 'career'
  requirements?: StoryRequirements
  context?: StoryContext
}

export type RotationStatus = 'development' | 'deep-bench' | 'rotation' | 'sixth' | 'starter' | 'core'

export interface RotationDecision {
  status: RotationStatus
  projectedMinutes: number
  dnp: boolean
  closingLineup: boolean
  reason: string
  temporaryOpportunity: boolean
  depthRank: number
}

export interface GameResult {
  id: string
  opponent: Team
  home: boolean
  teamScore: number
  opponentScore: number
  win: boolean
  minutes: number
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  grade: string
  timeline: string[]
  headline: string
  rotation?: RotationDecision
}

export interface AwardRace {
  name: string
  leader: string
  score: number
  playerRank: number
}

export type AwardName =
  | 'MVP' | '得分王' | '助攻王' | '抢断王' | '篮板王' | '三分王'
  | '防守一阵（DPOY）' | '防守二阵' | '最佳阵容一阵' | '最佳阵容二阵'
  | '最佳新秀' | '进步最快球员'

export interface AwardFinalist {
  id: string
  name: string
  teamId: string | null
  teamShort: string
  score: number
  votes: number
  rank: number
  isPlayer: boolean
}

export interface AwardResult {
  name: AwardName
  winner: AwardFinalist
  finalists: AwardFinalist[]
  recipients: AwardFinalist[]
  isLineup: boolean
  playerRank: number
  playerVotes: number
  playerWon: boolean
}

export interface AwardCeremonyState {
  seasonYear: number
  results: AwardResult[]
}

export interface AwardSeasonRecord {
  seasonYear: number
  results: AwardResult[]
}

export interface ScheduleGame {
  opponentId: string
  home: boolean
  played: boolean
  gameNumber: number
  month: number
  date: number
  result?: GameResult
}

export interface InjuryState {
  name: string
  gamesLeft: number
  severity: 1 | 2 | 3
  reinjuryRisk: number
  playedThrough: number
  restriction?: 'medical-dnp' | 'season-ending'
}

export type LeagueRole = 'franchise' | 'starter' | 'sixth' | 'rotation' | 'reserve' | 'retired'

export interface LeaguePlayerInjury {
  name: string
  bodyPart: 'head' | 'back' | 'shoulder' | 'arm' | 'hand' | 'hip' | 'knee' | 'leg' | 'ankle' | 'foot'
  severity: 1 | 2 | 3
  gamesLeft: number
  reinjuryRisk: number
}

export interface LeaguePlayerSeasonStats {
  games: number
  minutes: number
  points: number
  threeMade: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
}

export interface LeaguePlayerState {
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
  role: LeagueRole
  minutesPerGame: number
  health: number
  energy: number
  morale: number
  form: number
  development: number
  retired: boolean
  injury: LeaguePlayerInjury | null
  seasonStats: LeaguePlayerSeasonStats
  baselineStats: { mpg: number; ppg: number; rpg: number; apg: number; spg: number; bpg: number }
}

export interface LeagueState {
  dataVersion: string
  seed: number
  season: number
  tick: number
  players: LeaguePlayerState[]
}

export interface SimulationReport {
  requested: number
  simulated: number
  wins: number
  losses: number
  stoppedBy: 'running' | 'event' | 'injury' | 'season-end' | 'completed'
  message: string
}

export type PlayoffConference = '东部' | '西部' | '总决赛'

export interface PlayoffSeries {
  id: string
  conference: PlayoffConference
  round: number
  slot: number
  teamAId: string | null
  teamBId: string | null
  seedA: number | null
  seedB: number | null
  teamAWins: number
  teamBWins: number
  winnerId: string | null
}

export interface PlayoffState {
  round: number
  opponentId: string
  teamWins: number
  opponentWins: number
  seed?: number
  currentSeriesId?: string
  bracket?: PlayoffSeries[]
}

export interface AutoSimulationState {
  active: boolean
  requested: number
  simulated: number
  wins: number
  losses: number
  currentGameNumber: number | null
  injuryPolicy: 'rest' | 'play-through'
  handledInjuryKey: string | null
  mode?: 'regular-season' | 'playoff-round'
  targetPlayoffRound?: number | null
}

export interface SaveGame {
  version: number
  phase: 'onboarding' | 'career' | 'retired'
  activeTab: string
  date: string
  seasonYear: number
  seasonStage: 'regular' | 'playoffs' | 'offseason'
  playoff: PlayoffState | null
  day: number
  player: CareerPlayer | null
  team: Team | null
  teams: Team[]
  schedule: ScheduleGame[]
  relationships: Relationship[]
  feed: FeedItem[]
  pendingStory: StoryEvent | null
  storyQueue?: StoryEvent[]
  storyHistory: string[]
  storyRecords: StoryRecord[]
  life: LifeValues
  storyFlags: string[]
  mentor: { level: number; xp: number; sessions: number }
  simulationReport: SimulationReport | null
  autoSimulation: AutoSimulationState | null
  fans: number
  media: number
  city: number
  legacy: number
  money: number
  careerYear: number
  generatedRookies: LibraryPlayer[]
  awards: AwardRace[]
  awardCeremony?: AwardCeremonyState | null
  awardHistory?: AwardSeasonRecord[]
  lastGame: GameResult | null
  injury: InjuryState | null
  nextGameModifiers?: NextGameModifier[]
  lastRotationDecision?: RotationDecision | null
  league: LeagueState | null
  retirementPath: string | null
}
