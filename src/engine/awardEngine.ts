import type { AwardCeremonyState, AwardFinalist, AwardName, AwardResult, LeaguePlayerState, Position, SaveGame } from '../types'

type PositionGroup = 'G' | 'F' | 'C'
type Candidate = Omit<AwardFinalist, 'votes' | 'rank'> & { positionGroup: PositionGroup }

const AWARD_NAMES: AwardName[] = [
  'MVP', '得分王', '助攻王', '抢断王', '篮板王', '三分王',
  '防守一阵（DPOY）', '防守二阵', '最佳阵容一阵', '最佳阵容二阵',
  '最佳新秀', '进步最快球员',
]
const average = (total: number, games: number) => games > 0 ? total / games : 0
const clampScore = (value: number) => Math.max(0, Number(value.toFixed(2)))
const groupForPositions = (positions: Position[]): PositionGroup => positions.includes('C') ? 'C' : positions.some((position) => position === 'PF' || position === 'SF') ? 'F' : 'G'

function playerTeamShort(game: SaveGame, teamId: string | null) {
  return game.teams.find((team) => team.id === teamId)?.short ?? 'FA'
}

function npcScore(player: LeaguePlayerState, award: AwardName, game: SaveGame) {
  const stats = player.seasonStats
  const games = Math.max(1, stats.games)
  const ppg = stats.points / games
  const rpg = stats.rebounds / games
  const apg = stats.assists / games
  const spg = stats.steals / games
  const bpg = stats.blocks / games
  const threeMade = (stats.threeMade ?? 0) / games
  const teamWins = game.teams.find((team) => team.id === player.teamId)?.wins ?? 0
  const mvp = ppg * 1.55 + rpg * .62 + apg * .92 + player.overall * .28 + teamWins * .2 + player.form * .35
  const defense = (player.attributes.interiorDefense + player.attributes.perimeterDefense + player.attributes.steal + player.attributes.block + player.attributes.helpDefense) * .16 + spg * 8 + bpg * 8.5 + rpg * .45 + teamWins * .1
  if (award === 'MVP' || award === '最佳阵容一阵' || award === '最佳阵容二阵') return mvp
  if (award === '得分王') return ppg
  if (award === '助攻王') return apg
  if (award === '抢断王') return spg
  if (award === '篮板王') return rpg
  if (award === '三分王') return threeMade
  if (award === '防守一阵（DPOY）' || award === '防守二阵') return defense
  if (award === '最佳新秀') return ppg * 1.45 + rpg * .55 + apg * .8 + player.overall * .3 + player.minutesPerGame * .16
  return Math.max(-3, player.development) * 9 + player.form * 1.7 + ppg * .45 + apg * .35 + rpg * .2 + Math.max(0, 34 - player.age) * .08
}

function careerScore(game: SaveGame, award: AwardName) {
  const player = game.player!
  const stats = player.stats
  const games = Math.max(1, stats.games)
  const ppg = average(stats.points, games)
  const rpg = average(stats.rebounds, games)
  const apg = average(stats.assists, games)
  const spg = average(stats.steals, games)
  const bpg = average(stats.blocks, games)
  const teamWins = game.teams.find((team) => team.id === game.team?.id)?.wins ?? 0
  const mvp = ppg * 1.55 + rpg * .62 + apg * .92 + player.overall * .28 + teamWins * .2 + player.morale * .035 + player.coachTrust * .04
  const defense = (player.attributes.interiorDefense + player.attributes.perimeterDefense + player.attributes.steal + player.attributes.block + player.attributes.helpDefense) * .16 + spg * 8 + bpg * 8.5 + rpg * .45 + teamWins * .1
  if (award === 'MVP' || award === '最佳阵容一阵' || award === '最佳阵容二阵') return mvp
  if (award === '得分王') return ppg
  if (award === '助攻王') return apg
  if (award === '抢断王') return spg
  if (award === '篮板王') return rpg
  if (award === '三分王') return average(stats.threeMade, games) + player.attributes.threePoint * .02
  if (award === '防守一阵（DPOY）' || award === '防守二阵') return defense
  if (award === '最佳新秀') return ppg * 1.45 + rpg * .55 + apg * .8 + player.overall * .3 + average(stats.minutes, games) * .16
  return Math.max(0, player.overall - 74) * .8 + player.morale * .12 + player.coachTrust * .12 + ppg * .45 + apg * .35 + rpg * .2
}

function eligibleNpc(player: LeaguePlayerState, award: AwardName) {
  if (player.retired || !player.teamId || player.seasonStats.games < 12) return false
  if (award === '最佳新秀') return player.id.startsWith('rookie-') || player.age <= 21
  if (award === '进步最快球员') return !player.id.startsWith('rookie-') && player.age <= 34
  return true
}

function createCandidates(game: SaveGame, award: AwardName): Candidate[] {
  const candidates = (game.league?.players ?? [])
    .filter((player) => eligibleNpc(player, award))
    .map((player): Candidate => ({
      id: player.id,
      name: player.name,
      teamId: player.teamId,
      teamShort: playerTeamShort(game, player.teamId),
      score: clampScore(npcScore(player, award, game)),
      isPlayer: false,
      positionGroup: groupForPositions(player.positions),
    }))
  const playerEligible = Boolean(game.player && game.team && game.player.stats.games >= 12)
    && (award !== '最佳新秀' || game.careerYear === 1)
    && (award !== '进步最快球员' || game.careerYear > 1)
  if (playerEligible && game.player && game.team) candidates.push({
    id: game.player.id, name: game.player.name, teamId: game.team.id, teamShort: game.team.short,
    score: clampScore(careerScore(game, award)), isPlayer: true,
    positionGroup: groupForPositions([game.player.position, game.player.secondaryPosition]),
  })
  return candidates.sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, 'zh-CN'))
}

function addVotes(candidates: Candidate[]): AwardFinalist[] {
  if (!candidates.length) return []
  const floor = Math.min(...candidates.map((candidate) => candidate.score))
  const weights = candidates.map((candidate, index) => Math.max(8, candidate.score - floor + 22 - index * 1.5))
  const total = weights.reduce((sum, value) => sum + value, 0)
  let remaining = 100
  return candidates.map((candidate, index) => {
    const votes = index === candidates.length - 1 ? remaining : Math.max(1, Math.round(weights[index] / total * 100))
    remaining -= votes
    const { positionGroup: _positionGroup, ...finalist } = candidate
    return { ...finalist, rank: index + 1, votes }
  })
}

function fallbackCandidate(game: SaveGame): Candidate {
  return { id: game.player?.id ?? 'league-player', name: game.player?.name ?? '联盟球员', teamId: game.team?.id ?? null, teamShort: game.team?.short ?? 'NBA', score: 50, isPlayer: Boolean(game.player), positionGroup: 'G' }
}

function playerStanding(ranked: Candidate[]) {
  const index = ranked.findIndex((candidate) => candidate.isPlayer)
  return index >= 0 ? index + 1 : 0
}

function individualResult(game: SaveGame, name: AwardName): AwardResult {
  const ranked = createCandidates(game, name)
  const candidates = ranked.length ? ranked : [fallbackCandidate(game)]
  const finalists = addVotes(candidates.slice(0, 3))
  const playerRank = playerStanding(candidates)
  const playerFinalist = finalists.find((candidate) => candidate.isPlayer)
  return { name, winner: finalists[0], finalists, recipients: [finalists[0]], isLineup: false, playerRank, playerVotes: playerFinalist?.votes ?? 0, playerWon: Boolean(finalists[0]?.isPlayer) }
}

function balancedLineup(ranked: Candidate[], excludedIds = new Set<string>()) {
  const available = ranked.filter((candidate) => !excludedIds.has(candidate.id))
  const selected: Candidate[] = []
  const quotas: Array<[PositionGroup, number]> = [['G', 2], ['F', 2], ['C', 1]]
  quotas.forEach(([group, count]) => selected.push(...available.filter((candidate) => candidate.positionGroup === group && !selected.includes(candidate)).slice(0, count)))
  selected.push(...available.filter((candidate) => !selected.includes(candidate)).slice(0, Math.max(0, 5 - selected.length)))
  return selected.slice(0, 5).sort((left, right) => ranked.indexOf(left) - ranked.indexOf(right))
}

function lineupResult(name: AwardName, ranked: Candidate[], excludedIds = new Set<string>()): AwardResult {
  const selected = balancedLineup(ranked, excludedIds)
  const recipients = addVotes(selected)
  const playerRank = playerStanding(ranked)
  const playerRecipient = recipients.find((candidate) => candidate.isPlayer)
  return { name, winner: recipients[0], finalists: recipients, recipients, isLineup: true, playerRank, playerVotes: playerRecipient?.votes ?? 0, playerWon: Boolean(playerRecipient) }
}

export function evaluateSeasonAwards(game: SaveGame): AwardResult[] {
  const individualNames: AwardName[] = ['MVP', '得分王', '助攻王', '抢断王', '篮板王', '三分王']
  const individual = individualNames.map((name) => individualResult(game, name))
  const defensiveRanked = createCandidates(game, '防守一阵（DPOY）')
  const defensiveFirst = lineupResult('防守一阵（DPOY）', defensiveRanked)
  const defensiveSecond = lineupResult('防守二阵', defensiveRanked, new Set(defensiveFirst.recipients.map((candidate) => candidate.id)))
  const allNbaRanked = createCandidates(game, '最佳阵容一阵')
  const allNbaFirst = lineupResult('最佳阵容一阵', allNbaRanked)
  const allNbaSecond = lineupResult('最佳阵容二阵', allNbaRanked, new Set(allNbaFirst.recipients.map((candidate) => candidate.id)))
  const closing = ['最佳新秀', '进步最快球员'].map((name) => individualResult(game, name as AwardName))
  return [...individual, defensiveFirst, defensiveSecond, allNbaFirst, allNbaSecond, ...closing]
}

export function createAwardCeremony(game: SaveGame): AwardCeremonyState {
  return { seasonYear: game.seasonYear, results: evaluateSeasonAwards(game) }
}

export function awardCareerRewards(results: AwardResult[]) {
  return results.reduce((reward, result) => {
    if (!result.playerWon) return reward
    const value = result.name === 'MVP' ? { legacy: 18, fans: 12, media: 10 }
      : result.name === '防守一阵（DPOY）' ? { legacy: 10, fans: 6, media: 5 }
      : result.name === '最佳阵容一阵' ? { legacy: 12, fans: 8, media: 7 }
      : result.name === '最佳新秀' ? { legacy: 9, fans: 8, media: 6 }
      : result.name === '最佳阵容二阵' || result.name === '进步最快球员' ? { legacy: 7, fans: 5, media: 5 }
      : result.name === '防守二阵' ? { legacy: 4, fans: 3, media: 3 }
      : { legacy: 6, fans: 5, media: 4 }
    return { legacy: reward.legacy + value.legacy, fans: reward.fans + value.fans, media: reward.media + value.media }
  }, { legacy: 0, fans: 0, media: 0 })
}

export const SEASON_AWARD_NAMES = AWARD_NAMES
