import { ClipboardList, UserRound, UsersRound } from 'lucide-react'
import { motion } from 'framer-motion'
import type { CareerPlayer, Position, Team } from '../../types'
import { StickerNumber } from '../Typography'
import { getPlayerPreset, portraitIdFromLegacyNumber } from '../../data/playerPresets'

type LiveBoxStats = {
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
}

const teammatePortraitSources = [
  '/assets/v3-pages/phone/mentor-portrait.png',
  '/assets/v3-pages/player/player-portrait.png',
  '/assets/prospect-9.png',
  '/assets/home-v3/home-rookie-v1.png',
]

function formatMinutes(value: number) {
  const whole = Math.max(0, value)
  const totalSeconds = Math.round(whole * 60)
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`
}

export function LiveLineupTable({
  team,
  player,
  stats,
  teamScore,
  opponentScore,
  minutes,
  progress,
}: {
  team: Team
  player: CareerPlayer
  stats: LiveBoxStats
  teamScore: number
  opponentScore: number
  minutes: number
  progress: number
}) {
  const chicagoNames = ['约什·吉迪', '科比·怀特', '马塔斯·布泽利斯', '尼古拉·武切维奇']
  const fallbackNames = [team.mentor, '首发侧翼', '首发锋线', '首发中锋']
  const teammateNames = team.short === 'CHI' ? chicagoNames : fallbackNames
  const lead = teamScore - opponentScore
  const progressRatio = Math.max(.04, progress / 100)
  const starters = [
    { name: player.name, number: player.number, position: player.position, minutes: Math.max(minutes, 0), points: stats.points, plusMinus: lead, energy: player.energy },
    { name: teammateNames[0], number: 3, position: 'SG' as Position, minutes: 36.2 * progressRatio, points: Math.round(teamScore * .24), plusMinus: lead + 1, energy: 86 },
    { name: teammateNames[1], number: 0, position: 'SF' as Position, minutes: 34.1 * progressRatio, points: Math.round(teamScore * .2), plusMinus: lead, energy: 78 },
    { name: teammateNames[2], number: 14, position: 'PF' as Position, minutes: 31.75 * progressRatio, points: Math.round(teamScore * .13), plusMinus: lead - 3, energy: 67 },
    { name: teammateNames[3], number: 9, position: 'C' as Position, minutes: 35.1 * progressRatio, points: Math.round(teamScore * .18), plusMinus: lead + 2, energy: 73 },
  ]
  const bench = [
    { role: '第六人', position: 'SG', status: '待命', minutes: '00:00', points: 0, plusMinus: 0 },
    { role: '射手', position: 'SF', status: '热身', minutes: '00:00', points: 0, plusMinus: 0 },
    { role: '防守中锋', position: 'C', status: '犯规 4', minutes: formatMinutes(12.5 * progressRatio), points: Math.round(teamScore * .04), plusMinus: Math.min(-1, lead - 2) },
  ]
  const chemistry = Math.max(60, Math.min(99, 78 + Math.round(player.coachTrust * .1) + Math.round((player.morale - 50) * .08)))
  const playerPreset = getPlayerPreset(player.portraitId ?? portraitIdFromLegacyNumber(player.number))
  const portraitSources = [playerPreset.image, ...teammatePortraitSources]

  return <motion.section className="live-lineup-table-v7" aria-label="场上阵容表格" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
    <header className="lineup-heading-v7"><div><UsersRound /><strong>场上阵容</strong></div><span>首发</span><em>实时体能</em><i><b style={{ width: `${player.energy}%` }} /></i></header>
    <div className="lineup-columns-v7"><span>球员</span><span>位置</span><span>时间</span><span>得分</span><span>正负值</span></div>
    <div className="lineup-starters-v7">{starters.map((starter, index) => <article className={index === 0 ? 'is-active' : ''} key={`${starter.name}-${starter.position}`}>
      <img src={portraitSources[index]} alt="" />
      <div className="lineup-player-name-v7"><strong>{starter.name}</strong><span>#{starter.number}</span><i><b style={{ width: `${starter.energy}%` }} /></i></div>
      <span className="lineup-position-v7">{starter.position}</span>
      <strong className="lineup-number-v7"><StickerNumber value={formatMinutes(starter.minutes)} size="md" /></strong>
      <strong className="lineup-number-v7"><StickerNumber value={starter.points} size="md" /></strong>
      <strong className={`lineup-plus-v7 ${starter.plusMinus < 0 ? 'is-negative' : ''}`}><StickerNumber value={`${starter.plusMinus >= 0 ? '+' : ''}${starter.plusMinus}`} size="md" /></strong>
    </article>)}</div>

    <section className="lineup-bench-v7">
      <header><div><UsersRound /><strong>替补席</strong></div><span>位置</span><span>状态</span><span>时间</span><span>得分</span><span>正负值</span></header>
      {bench.map((item) => <div className="lineup-bench-row-v7" key={item.role}><UserRound /><strong>{item.role}</strong><span>{item.position}</span><em className={item.status.includes('犯规') ? 'is-danger' : item.status === '热身' ? 'is-warm' : ''}>{item.status}</em><span>{item.minutes}</span><b>{item.points}</b><b className={item.plusMinus < 0 ? 'is-negative' : ''}>{item.plusMinus > 0 ? '+' : ''}{item.plusMinus}</b></div>)}
    </section>

    <footer className="lineup-tactic-v7"><ClipboardList /><span>当前战术：<strong>五外拉开</strong></span><i>·</i><span>场上化学反应 <strong><StickerNumber value={chemistry} size="md" /></strong></span></footer>
  </motion.section>
}
