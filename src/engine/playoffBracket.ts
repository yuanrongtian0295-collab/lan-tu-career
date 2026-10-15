import type { PlayoffConference, PlayoffSeries, PlayoffState, Team } from '../types'

const FIRST_ROUND_PAIRINGS = [[1, 8], [4, 5], [3, 6], [2, 7]] as const

const seriesId = (conference: PlayoffConference, round: number, slot: number) => `${conference}-${round}-${slot}`

const seededConference = (teams: Team[], conference: Team['conference']) => teams
  .filter((team) => team.conference === conference)
  .sort((a, b) => b.wins - a.wins || b.strength - a.strength || a.id.localeCompare(b.id))
  .slice(0, 8)

function emptySeries(conference: PlayoffConference, round: number, slot: number): PlayoffSeries {
  return { id: seriesId(conference, round, slot), conference, round, slot, teamAId: null, teamBId: null, seedA: null, seedB: null, teamAWins: 0, teamBWins: 0, winnerId: null }
}

function deterministicSeries(series: PlayoffSeries, teamMap: Map<string, Team>): PlayoffSeries {
  if (!series.teamAId || !series.teamBId) return series
  const teamA = teamMap.get(series.teamAId)
  const teamB = teamMap.get(series.teamBId)
  if (!teamA || !teamB) return series
  const hash = Array.from(series.id + teamA.id + teamB.id).reduce((value, character) => Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261)
  const scoreA = teamA.wins * 1.4 + teamA.strength + (series.seedB ?? 8) * .3
  const scoreB = teamB.wins * 1.4 + teamB.strength + (series.seedA ?? 8) * .3
  const teamAWinsSeries = scoreA + (hash % 17) - 8 >= scoreB
  const loserWins = (hash >>> 5) % 4
  return {
    ...series,
    teamAWins: teamAWinsSeries ? 4 : loserWins,
    teamBWins: teamAWinsSeries ? loserWins : 4,
    winnerId: teamAWinsSeries ? teamA.id : teamB.id,
  }
}

function createFirstRound(teams: Team[], conference: Team['conference']): PlayoffSeries[] {
  const seeded = seededConference(teams, conference)
  return FIRST_ROUND_PAIRINGS.map(([seedA, seedB], slot) => ({
    ...emptySeries(conference, 1, slot),
    teamAId: seeded[seedA - 1]?.id ?? null,
    teamBId: seeded[seedB - 1]?.id ?? null,
    seedA,
    seedB,
  }))
}

function resolveNpcSeries(series: PlayoffSeries[], playerTeamId: string, teams: Team[]) {
  const teamMap = new Map(teams.map((team) => [team.id, team]))
  return series.map((item) => item.teamAId === playerTeamId || item.teamBId === playerTeamId ? item : deterministicSeries(item, teamMap))
}

function nextRoundSeries(bracket: PlayoffSeries[], round: number): PlayoffSeries[] {
  if (round === 2 || round === 3) {
    const previousRound = round - 1
    const count = round === 2 ? 2 : 1
    return (['东部', '西部'] as const).flatMap((conference) => Array.from({ length: count }, (_, slot) => {
      const sourceA = bracket.find((item) => item.id === seriesId(conference, previousRound, slot * 2))
      const sourceB = bracket.find((item) => item.id === seriesId(conference, previousRound, slot * 2 + 1))
      return {
        ...emptySeries(conference, round, slot),
        teamAId: sourceA?.winnerId ?? null,
        teamBId: sourceB?.winnerId ?? null,
        seedA: sourceA?.winnerId === sourceA?.teamAId ? sourceA?.seedA ?? null : sourceA?.seedB ?? null,
        seedB: sourceB?.winnerId === sourceB?.teamAId ? sourceB?.seedA ?? null : sourceB?.seedB ?? null,
      }
    }))
  }
  const east = bracket.find((item) => item.id === seriesId('东部', 3, 0))
  const west = bracket.find((item) => item.id === seriesId('西部', 3, 0))
  return [{
    ...emptySeries('总决赛', 4, 0),
    teamAId: east?.winnerId ?? null,
    teamBId: west?.winnerId ?? null,
    seedA: east?.winnerId === east?.teamAId ? east?.seedA ?? null : east?.seedB ?? null,
    seedB: west?.winnerId === west?.teamAId ? west?.seedA ?? null : west?.seedB ?? null,
  }]
}

function replaceRound(bracket: PlayoffSeries[], round: number, replacement: PlayoffSeries[]) {
  return [...bracket.filter((item) => item.round !== round), ...replacement].sort((a, b) => a.round - b.round || a.conference.localeCompare(b.conference) || a.slot - b.slot)
}

export function createPlayoffState(teams: Team[], playerTeamId: string): PlayoffState | null {
  const playerTeam = teams.find((team) => team.id === playerTeamId)
  if (!playerTeam) return null
  const seeded = seededConference(teams, playerTeam.conference)
  const seed = seeded.findIndex((team) => team.id === playerTeamId) + 1
  if (seed < 1 || seed > 8) return null
  const firstRound = resolveNpcSeries([
    ...createFirstRound(teams, '东部'),
    ...createFirstRound(teams, '西部'),
  ], playerTeamId, teams)
  const futureRounds = [
    emptySeries('东部', 2, 0), emptySeries('东部', 2, 1),
    emptySeries('西部', 2, 0), emptySeries('西部', 2, 1),
    emptySeries('东部', 3, 0), emptySeries('西部', 3, 0),
    emptySeries('总决赛', 4, 0),
  ]
  const current = firstRound.find((item) => item.teamAId === playerTeamId || item.teamBId === playerTeamId)
  if (!current) return null
  const opponentId = current.teamAId === playerTeamId ? current.teamBId : current.teamAId
  if (!opponentId) return null
  return { round: 1, opponentId, teamWins: 0, opponentWins: 0, seed, currentSeriesId: current.id, bracket: [...firstRound, ...futureRounds] }
}

function overrideCurrentSeries(state: PlayoffState, playerTeamId: string): PlayoffState {
  if (!state.bracket?.length) return state
  let current = state.bracket.find((item) => item.id === state.currentSeriesId)
    ?? state.bracket.find((item) => item.round === state.round && (item.teamAId === playerTeamId || item.teamBId === playerTeamId))
  if (!current) return state
  if (current.teamAId !== state.opponentId && current.teamBId !== state.opponentId) {
    current = { ...current, teamBId: current.teamAId === playerTeamId ? state.opponentId : current.teamBId, teamAId: current.teamBId === playerTeamId ? state.opponentId : current.teamAId }
  }
  const isTeamA = current.teamAId === playerTeamId
  const updated = { ...current, teamAWins: isTeamA ? state.teamWins : state.opponentWins, teamBWins: isTeamA ? state.opponentWins : state.teamWins, winnerId: state.teamWins === 4 ? playerTeamId : state.opponentWins === 4 ? state.opponentId : null }
  return { ...state, currentSeriesId: updated.id, bracket: state.bracket.map((item) => item.id === updated.id ? updated : item) }
}

export function hydratePlayoffState(state: PlayoffState | null, teams: Team[], playerTeamId: string): PlayoffState | null {
  if (!state) return null
  if (state.bracket?.length) return overrideCurrentSeries(state, playerTeamId)
  const fresh = createPlayoffState(teams, playerTeamId)
  if (!fresh) return state
  if (state.round === 1) return overrideCurrentSeries({ ...fresh, ...state }, playerTeamId)
  let bracket = fresh.bracket ?? []
  let currentSeriesId = fresh.currentSeriesId
  for (let round = 1; round < Math.min(4, state.round); round += 1) {
    const current = bracket.find((item) => item.id === currentSeriesId)
    if (!current) break
    const teamIsA = current.teamAId === playerTeamId
    bracket = bracket.map((item) => item.id === current.id ? { ...item, teamAWins: teamIsA ? 4 : 2, teamBWins: teamIsA ? 2 : 4, winnerId: playerTeamId } : item)
    const generated = resolveNpcSeries(nextRoundSeries(bracket, round + 1), playerTeamId, teams)
    bracket = replaceRound(bracket, round + 1, generated)
    currentSeriesId = generated.find((item) => item.teamAId === playerTeamId || item.teamBId === playerTeamId)?.id
  }
  const current = bracket.find((item) => item.id === currentSeriesId)
  if (current && current.teamAId !== state.opponentId && current.teamBId !== state.opponentId) {
    bracket = bracket.map((item) => item.id === current.id ? { ...item, teamBId: item.teamAId === playerTeamId ? state.opponentId : item.teamBId, teamAId: item.teamBId === playerTeamId ? state.opponentId : item.teamAId } : item)
  }
  return overrideCurrentSeries({ ...fresh, ...state, currentSeriesId, bracket }, playerTeamId)
}

export type PlayoffProgress = { state: PlayoffState; seriesComplete: boolean; eliminated: boolean; champion: boolean }

export function progressPlayoffBracket(state: PlayoffState, playerTeamId: string, teams: Team[], won: boolean): PlayoffProgress {
  const hydrated = hydratePlayoffState(state, teams, playerTeamId) ?? state
  const bracket = hydrated.bracket ?? []
  const current = bracket.find((item) => item.id === hydrated.currentSeriesId)
  const nextTeamWins = hydrated.teamWins + (won ? 1 : 0)
  const nextOpponentWins = hydrated.opponentWins + (won ? 0 : 1)
  if (!current) return { state: { ...hydrated, teamWins: nextTeamWins, opponentWins: nextOpponentWins }, seriesComplete: nextTeamWins === 4 || nextOpponentWins === 4, eliminated: nextOpponentWins === 4, champion: hydrated.round === 4 && nextTeamWins === 4 }
  const teamIsA = current.teamAId === playerTeamId
  const updatedCurrent: PlayoffSeries = {
    ...current,
    teamAWins: teamIsA ? nextTeamWins : nextOpponentWins,
    teamBWins: teamIsA ? nextOpponentWins : nextTeamWins,
    winnerId: nextTeamWins === 4 ? playerTeamId : nextOpponentWins === 4 ? hydrated.opponentId : null,
  }
  let nextBracket = bracket.map((item) => item.id === current.id ? updatedCurrent : item)
  const seriesComplete = nextTeamWins === 4 || nextOpponentWins === 4
  if (!seriesComplete || nextOpponentWins === 4 || hydrated.round === 4) return {
    state: { ...hydrated, teamWins: nextTeamWins, opponentWins: nextOpponentWins, bracket: nextBracket },
    seriesComplete,
    eliminated: nextOpponentWins === 4,
    champion: hydrated.round === 4 && nextTeamWins === 4,
  }

  const nextRound = hydrated.round + 1
  const generated = resolveNpcSeries(nextRoundSeries(nextBracket, nextRound), playerTeamId, teams)
  nextBracket = replaceRound(nextBracket, nextRound, generated)
  const nextSeries = generated.find((item) => item.teamAId === playerTeamId || item.teamBId === playerTeamId)
  const opponentId = nextSeries?.teamAId === playerTeamId ? nextSeries.teamBId : nextSeries?.teamAId
  if (!nextSeries || !opponentId) return { state: { ...hydrated, teamWins: nextTeamWins, opponentWins: nextOpponentWins, bracket: nextBracket }, seriesComplete: true, eliminated: false, champion: false }
  return {
    state: { ...hydrated, round: nextRound, opponentId, teamWins: 0, opponentWins: 0, currentSeriesId: nextSeries.id, bracket: nextBracket },
    seriesComplete: true,
    eliminated: false,
    champion: false,
  }
}
