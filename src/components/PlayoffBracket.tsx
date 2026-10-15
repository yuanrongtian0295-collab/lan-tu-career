import { useMemo, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import type { PlayoffConference, PlayoffSeries, SaveGame, Team } from '../types'

const ROUND_LABELS: Record<number, string> = {
  1: '首轮',
  2: '分区半决赛',
  3: '分区决赛',
}

const REQUIRED_SERIES: Record<number, number> = { 1: 4, 2: 2, 3: 1 }

function emptySeries(conference: PlayoffConference, round: number, slot: number): PlayoffSeries {
  return {
    id: `${conference}-${round}-empty-${slot}`,
    conference,
    round,
    slot,
    teamAId: null,
    teamBId: null,
    seedA: null,
    seedB: null,
    teamAWins: 0,
    teamBWins: 0,
    winnerId: null,
  }
}

const TEAM_CARD_ROOT = '/assets/v3-pages/playoff-party-v1/team-cards-v2'
const SERIES_ASSET_ROOT = '/assets/v3-pages/playoff-party-v1/series-v2'
const SERIES_GAME_ASSET_ROOT = '/assets/v3-pages/playoff-party-v1/series-v3'

function teamCardAsset(team: Team) {
  return `${TEAM_CARD_ROOT}/${team.short.toLowerCase()}-team-row-v4.png`
}

function BracketTeamCard({ team, seed, wins, winner }: { team?: Team; seed: number | null; wins: number; winner: boolean }) {
  const accessibleName = team
    ? `${seed ? `第${seed}种子 ` : ''}${team.city}${team.name}，系列赛${wins}胜`
    : '对阵球队待定'

  return <div className={`party-bracket-team ${winner ? 'winner' : ''} ${team ? '' : 'is-tbd'}`} aria-label={accessibleName}>
    {team ? <img className="party-bracket-team-art" src={teamCardAsset(team)} alt="" aria-hidden="true" /> : null}
    <b aria-hidden="true">{team ? wins : '—'}</b>
  </div>
}

function MatchupCard({ series, teamMap, currentSeriesId }: {
  series: PlayoffSeries
  teamMap: Map<string, Team>
  currentSeriesId?: string
}) {
  const teamA = series.teamAId ? teamMap.get(series.teamAId) : undefined
  const teamB = series.teamBId ? teamMap.get(series.teamBId) : undefined
  const current = series.id === currentSeriesId

  return <article
    className={`party-matchup-card ${current ? 'current' : ''}`}
    aria-label={`${teamA ? `${teamA.city}${teamA.name}${series.teamAWins}胜` : '球队待定'} 对阵 ${teamB ? `${teamB.city}${teamB.name}${series.teamBWins}胜` : '球队待定'}`}
  >
    <BracketTeamCard team={teamA} seed={series.seedA} wins={series.teamAWins} winner={series.winnerId === series.teamAId} />
    <BracketTeamCard team={teamB} seed={series.seedB} wins={series.teamBWins} winner={series.winnerId === series.teamBId} />
  </article>
}

function RoundColumn({ conference, round, bracket, teamMap, currentSeriesId }: {
  conference: '东部' | '西部'
  round: number
  bracket: PlayoffSeries[]
  teamMap: Map<string, Team>
  currentSeriesId?: string
}) {
  const existing = bracket.filter((series) => series.conference === conference && series.round === round)
  const count = REQUIRED_SERIES[round]
  const series = Array.from({ length: count }, (_, index) => existing[index] ?? emptySeries(conference, round, index))

  return <section className={`party-round party-round-${round}`}>
    <h4>{ROUND_LABELS[round]}</h4>
    <div>{series.map((item) => <MatchupCard key={item.id} series={item} teamMap={teamMap} currentSeriesId={currentSeriesId} />)}</div>
  </section>
}

function ConferenceTree({ conference, side, bracket, teamMap, currentSeriesId }: {
  conference: '东部' | '西部'
  side: 'east' | 'west'
  bracket: PlayoffSeries[]
  teamMap: Map<string, Team>
  currentSeriesId?: string
}) {
  const rounds = side === 'east' ? [1, 2, 3] : [3, 2, 1]
  return <section className={`party-conference-tree ${side}`}>
    <header><b>{side === 'east' ? 'EAST' : 'WEST'}</b></header>
    <div className="party-round-columns">
      {rounds.map((round) => <RoundColumn
        key={round}
        conference={conference}
        round={round}
        bracket={bracket}
        teamMap={teamMap}
        currentSeriesId={currentSeriesId}
      />)}
    </div>
  </section>
}

function FinalsNode({ bracket, teamMap, currentSeriesId }: {
  bracket: PlayoffSeries[]
  teamMap: Map<string, Team>
  currentSeriesId?: string
}) {
  const finals = bracket.find((series) => series.round === 4) ?? emptySeries('总决赛', 4, 0)
  return <section className="party-finals-node">
    <span>总决赛</span>
    <img src="/assets/v3-pages/calendar/championship-trophy.png" alt="总冠军奖杯" />
    <MatchupCard series={finals} teamMap={teamMap} currentSeriesId={currentSeriesId} />
  </section>
}

function BracketBoard({ game }: { game: SaveGame }) {
  const teamMap = useMemo(() => new Map(game.teams.map((team) => [team.id, team])), [game.teams])
  const bracket = game.playoff?.bracket ?? []

  return <section className="party-bracket-paper" aria-label="东西部季后赛横向对阵图">
    <header className="party-bracket-title"><i /> <h2>东西部对阵图</h2> <i /></header>
    <svg
      className="party-bracket-connectors"
      viewBox="0 0 1520 1000"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g className="party-bracket-lines east">
        <path d="M242 432 H273 V550 H242 M273 492 H303" />
        <path d="M242 670 H273 V788 H242 M273 726 H303" />
        <path d="M461 492 H481 V726 H461 M481 660 H501" />
        <path d="M659 660 H681" />
      </g>
      <g className="party-bracket-lines west">
        <path d="M1278 432 H1247 V550 H1278 M1247 492 H1217" />
        <path d="M1278 670 H1247 V788 H1278 M1247 726 H1217" />
        <path d="M1059 492 H1039 V726 H1059 M1039 660 H1019" />
        <path d="M861 660 H839" />
      </g>
    </svg>
    <div className="party-landscape-bracket">
      <ConferenceTree
        conference="东部"
        side="east"
        bracket={bracket}
        teamMap={teamMap}
        currentSeriesId={game.playoff?.currentSeriesId}
      />
      <FinalsNode bracket={bracket} teamMap={teamMap} currentSeriesId={game.playoff?.currentSeriesId} />
      <ConferenceTree
        conference="西部"
        side="west"
        bracket={bracket}
        teamMap={teamMap}
        currentSeriesId={game.playoff?.currentSeriesId}
      />
    </div>
  </section>
}

function GameCard({ game, scheduleGame, index, opponent, isNext, onPlay }: {
  game: SaveGame
  scheduleGame: SaveGame['schedule'][number] | undefined
  index: number
  opponent?: Team
  isNext: boolean
  onPlay: () => void
}) {
  const played = Boolean(scheduleGame?.played && scheduleGame.result)
  const result = scheduleGame?.result
  const winningLogo = result?.win ? game.team?.logo : opponent?.logo
  const displayLogo = played ? winningLogo : scheduleGame?.home ? game.team?.logo : opponent?.logo
  const score = result ? `${result.teamScore}-${result.opponentScore}` : '—'
  const resultText = result ? `${result.win ? game.team?.short : opponent?.short ?? '对手'}胜` : isNext ? 'NEXT' : '待定'
  const venue = scheduleGame?.home ? '主场' : '客场'
  const cardStyle = {
    '--series-game-skin': `url("${SERIES_GAME_ASSET_ROOT}/series-game-g${index + 1}-v3.png")`,
  } as CSSProperties

  return <motion.button
    type="button"
    className={`party-series-game ${played ? 'played' : ''} ${result?.win ? 'win' : result ? 'loss' : ''} ${isNext ? 'next' : ''}`}
    style={cardStyle}
    disabled={!isNext}
    onClick={onPlay}
    aria-label={`G${index + 1}，${venue}，${score}，${resultText}`}
    animate={isNext ? { scale: [1, 1.035, 1] } : undefined}
    transition={isNext ? { repeat: Infinity, duration: 1.45, ease: 'easeInOut' } : undefined}
  >
    <small>{venue}</small>
    {displayLogo ? <img src={displayLogo} alt="" /> : <span className="party-game-placeholder" />}
    <b>{score}</b>
    <em>{resultText}</em>
  </motion.button>
}

function CurrentSeries({ game, onPlay }: { game: SaveGame; onPlay: () => void }) {
  if (!game.playoff || !game.team) return null
  const opponent = game.teams.find((team) => team.id === game.playoff?.opponentId)
  const nextIndex = game.schedule.findIndex((item) => !item.played)
  const momentum = Math.max(1, Math.min(11, game.playoff.teamWins * 2 + game.playoff.opponentWins + 1))

  return <section className="party-current-series" aria-label="我的系列赛">
    <div className="party-series-scoreboard">
      <div className="party-series-team">
        <img src={game.team.logo} alt="" />
        <strong>{game.team.short}</strong>
      </div>
      <div className="party-series-score">
        <b>{game.playoff.teamWins}-{game.playoff.opponentWins}</b>
        <span>{game.team.conference}首轮 · 七局四胜</span>
      </div>
      <div className="party-series-team">
        {opponent ? <img src={opponent.logo} alt="" /> : null}
        <strong>{opponent?.short ?? 'TBD'}</strong>
      </div>
    </div>
    <div className="party-series-momentum">
      <span>系列赛势头</span>
      <div className="party-momentum-arrows">
        {Array.from({ length: 11 }, (_, index) => <img
          className="party-momentum-arrow"
          src={`${SERIES_ASSET_ROOT}/momentum-arrow-${index < momentum ? 'active' : 'inactive'}-v2.png`}
          alt=""
          aria-hidden="true"
          key={index}
        />)}
      </div>
    </div>
    <div className="party-series-games">
      {Array.from({ length: 7 }, (_, index) => <GameCard
        key={index}
        game={game}
        scheduleGame={game.schedule[index]}
        index={index}
        opponent={opponent}
        isNext={index === nextIndex}
        onPlay={onPlay}
      />)}
    </div>
    <footer className="party-series-legend"><span><i className="done" />已结束</span><span><i className="next" />下一场</span><span><i />待定</span></footer>
  </section>
}

export function PlayoffBracketView({ game, onPlay }: { game: SaveGame; onPlay: () => void }) {
  return <main className="playoff-party-body">
    <BracketBoard game={game} />
    <CurrentSeries game={game} onPlay={onPlay} />
  </main>
}
