import type { SaveGame } from '../../types'
import { PlayoffBracketView } from '../PlayoffBracket'
import { CareerInjuryStrip, CareerStatsPanel, type CareerStatItem } from './CareerFooterPanels'

type PlayoffCareerPageProps = {
  game: SaveGame
  onPlay: () => void
  onSimulate: (count: number) => void
  onStartPlayoffRound: () => void
  onStopAuto: () => void
}

export function PlayoffCareerPage({ game, onPlay, onSimulate, onStartPlayoffRound, onStopAuto }: PlayoffCareerPageProps) {
  if (!game.player || !game.team || !game.playoff) return null
  const autoRunning = Boolean(game.autoSimulation?.active)
  const playedGames = game.schedule.filter((item) => item.played)
  const wins = playedGames.filter((item) => item.result?.win).length
  const losses = playedGames.length - wins
  const avg = (value: number) => game.player!.stats.games ? (value / game.player!.stats.games).toFixed(1) : '0.0'
  const stats: CareerStatItem[] = [
    { key: 'points', label: '场均得分', value: avg(game.player.stats.points) },
    { key: 'rebounds', label: '场均篮板', value: avg(game.player.stats.rebounds) },
    { key: 'assists', label: '场均助攻', value: avg(game.player.stats.assists) },
    { key: 'minutes', label: '出场时间', value: avg(game.player.stats.minutes) },
  ]

  return <div className="screen career-screen calendar-v3 is-playoffs playoff-party-v1">
    <section className="playoff-party-hero">
      <img className="playoff-party-title-art" src="/assets/v3-pages/playoff-party-v1/playoff-title-v1.png" alt="季后赛中心" />
      <div className="career-meta-row playoff-career-meta-row">
        <span className="career-season-tag">
          <span className="career-season-number">{`${game.seasonYear}-${String(game.seasonYear + 1).slice(2)}`}</span>
          <span className="career-season-label playoff-season-label" role="img" aria-label="季后赛">
            <img src="/assets/v3-pages/career-party/season-glyph-ji-v1.png" alt="" aria-hidden="true" />
            <img src="/assets/v3-pages/career-party/season-glyph-hou-v1.png" alt="" aria-hidden="true" />
            <img src="/assets/v3-pages/career-party/season-glyph-sai-v1.png" alt="" aria-hidden="true" />
          </span>
        </span>
        <span className="career-year">
          <span className="career-year-affix" role="img" aria-label="第"><img src="/assets/v3-pages/career-party/season-glyph-di-v1.png" alt="" aria-hidden="true" /></span>
          <strong className="career-year-number">{game.careerYear}</strong>
          <span className="career-year-affix" role="img" aria-label="年"><img src="/assets/v3-pages/career-party/season-glyph-nian-v1.png" alt="" aria-hidden="true" /></span>
        </span>
      </div>
      <section className="playoff-party-record" aria-label={`季后赛战绩${wins}胜${losses}负`}>
        <div className="playoff-record-copy">
          <img className="playoff-record-title-art" src="/assets/v3-pages/career-party/playoff-record-title-v1.png" alt="" aria-hidden="true" />
          <strong className="career-record">
            <span className="career-record-wins"><span className="career-record-number">{wins}</span><small>胜</small></span>
            <span className="career-record-losses"><span className="career-record-number">{losses}</span><small>负</small></span>
          </strong>
        </div>
        <div className="progress-track"><i style={{ width: `${Math.max(8, (wins / Math.max(1, wins + losses)) * 100)}%` }} /></div>
      </section>
      <div className="playoff-party-actions">
        <button
          type="button"
          className={`playoff-sim-round ${autoRunning ? 'is-running' : ''}`}
          aria-label={autoRunning ? `暂停模拟本轮系列赛，已完成${game.autoSimulation?.simulated ?? 0}场` : '一键模拟本轮系列赛，每场触发1到2次关键事件'}
          title={autoRunning ? '暂停模拟本轮系列赛' : '一键模拟本轮系列赛'}
          onClick={autoRunning ? onStopAuto : onStartPlayoffRound}
        />
        <button
          type="button"
          className="playoff-sim-next"
          aria-label="模拟下一场，单场快速推进"
          title="模拟下一场"
          disabled={autoRunning}
          onClick={() => onSimulate(1)}
        />
      </div>
    </section>
    <PlayoffBracketView game={game} onPlay={onPlay} />
    {game.injury ? <CareerInjuryStrip injury={game.injury} disabled={autoRunning} onClick={onPlay} /> : null}
    <CareerStatsPanel stats={stats} />
  </div>
}
