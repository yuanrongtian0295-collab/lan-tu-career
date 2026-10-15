import { motion } from 'framer-motion'
import type { CareerPlayer, Team } from '../../types'
import type { LiveTeamBoxStats } from '../../engine/gameEngine'
import { StickerNumber } from '../Typography'

type LiveBoxStats = {
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
}

type ComparisonRow = {
  label: string
  teamValue: number | null
  opponentValue: number | null
  format?: 'percent' | 'number'
}

function displayValue(value: number | null, format: ComparisonRow['format']) {
  if (value === null) return '—'
  return format === 'percent' ? `${value.toFixed(1)}%` : Math.round(value)
}

export function LiveDataTable({
  team,
  opponent,
  player,
  stats,
  teamScore,
  opponentScore,
  grade,
  minutes,
  teamStats,
  opponentStats,
}: {
  team: Team
  opponent: Team | null
  player: CareerPlayer
  stats: LiveBoxStats
  teamScore: number
  opponentScore: number
  grade: string
  minutes: number
  teamStats: LiveTeamBoxStats | null
  opponentStats: LiveTeamBoxStats | null
}) {
  const rate = (made: number | undefined, attempted: number | undefined) => attempted ? (made ?? 0) / attempted * 100 : null
  const rows: ComparisonRow[] = [
    { label: '投篮命中率', teamValue: rate(teamStats?.fieldGoalsMade, teamStats?.fieldGoalsAttempted), opponentValue: rate(opponentStats?.fieldGoalsMade, opponentStats?.fieldGoalsAttempted), format: 'percent' },
    { label: '三分命中率', teamValue: rate(teamStats?.threePointersMade, teamStats?.threePointersAttempted), opponentValue: rate(opponentStats?.threePointersMade, opponentStats?.threePointersAttempted), format: 'percent' },
    { label: '罚球', teamValue: rate(teamStats?.freeThrowsMade, teamStats?.freeThrowsAttempted), opponentValue: rate(opponentStats?.freeThrowsMade, opponentStats?.freeThrowsAttempted), format: 'percent' },
    { label: '篮板', teamValue: teamStats?.rebounds ?? null, opponentValue: opponentStats?.rebounds ?? null, format: 'number' },
    { label: '助攻', teamValue: teamStats?.assists ?? null, opponentValue: opponentStats?.assists ?? null, format: 'number' },
    { label: '失误', teamValue: teamStats?.turnovers ?? null, opponentValue: opponentStats?.turnovers ?? null, format: 'number' },
    { label: '快攻得分', teamValue: teamStats?.fastBreakPoints ?? null, opponentValue: opponentStats?.fastBreakPoints ?? null, format: 'number' },
    { label: '禁区得分', teamValue: teamStats?.paintPoints ?? null, opponentValue: opponentStats?.paintPoints ?? null, format: 'number' },
  ]
  const hasStarted = teamStats !== null && opponentStats !== null
  const plusMinus = teamScore - opponentScore
  const time = `${String(Math.floor(minutes)).padStart(2, '0')}:${String(Math.round((minutes % 1) * 60)).padStart(2, '0')}`
  const playerStats = [
    ['得分', stats.points],
    ['助攻', stats.assists],
    ['篮板', stats.rebounds],
    ['抢断', stats.steals],
    ['盖帽', stats.blocks],
    ['失误', stats.turnovers],
  ] as const

  return <motion.section className="live-data-table-v7" aria-label="比赛数据表格" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
    <section className="data-team-panel-v7">
      <header className="data-matchup-v7">
        <div className="is-team"><img src={team.logo} alt="" /><span>{team.short}</span><strong><StickerNumber value={teamScore} size="hero" /></strong></div>
        <em>—</em>
        <div className="is-opponent"><strong><StickerNumber value={opponentScore} size="hero" /></strong><span>{opponent?.short ?? 'OPP'}</span>{opponent ? <img src={opponent.logo} alt="" /> : null}</div>
      </header>
      <div className="data-comparison-list-v7">{rows.map((row) => {
        const maximum = Math.max(row.teamValue ?? 0, row.opponentValue ?? 0, 1)
        return <div className="data-comparison-row-v7" key={row.label}>
          <div className="data-comparison-value is-team"><strong><StickerNumber value={displayValue(row.teamValue, row.format)} size="lg" /></strong><i><b style={{ width: `${(row.teamValue ?? 0) / maximum * 100}%` }} /></i></div>
          <span>{row.label}</span>
          <div className="data-comparison-value is-opponent"><strong><StickerNumber value={displayValue(row.opponentValue, row.format)} size="lg" /></strong><i><b style={{ width: `${(row.opponentValue ?? 0) / maximum * 100}%` }} /></i></div>
        </div>
      })}</div>
    </section>

    <section className="data-player-panel-v7">
      <h2><strong>{player.name}</strong><span>本场数据</span></h2>
      <div className="data-player-grid-v7">{playerStats.map(([label, value], index) => <div className={index === 0 ? 'is-featured' : ''} key={label}><strong><StickerNumber value={value} size="hero" /></strong><span>{label}</span></div>)}</div>
      <footer>
        <div><span>评分</span><strong>{grade || '—'}</strong></div>
        <div><span>正负值</span><strong className={plusMinus < 0 ? 'is-negative' : ''}><StickerNumber value={hasStarted ? `${plusMinus >= 0 ? '+' : ''}${plusMinus}` : '—'} size="md" /></strong></div>
        <div><span>上场时间</span><strong><StickerNumber value={time} size="md" /></strong></div>
      </footer>
    </section>
  </motion.section>
}
