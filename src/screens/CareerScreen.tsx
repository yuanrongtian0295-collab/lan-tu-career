import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { Activity, ChevronLeft, ChevronRight, Pause, Trophy } from 'lucide-react'
import type { SaveGame } from '../types'
import { StickerNumber } from '../components/Typography'
import { CareerInjuryStrip, CareerSeasonGoal, CareerStatsPanel, type CareerStatItem } from '../components/career/CareerFooterPanels'
import { PlayoffCareerPage } from '../components/career/PlayoffCareerPage'

type CareerScreenProps = {
  game: SaveGame
  onPlay: () => void
  onSimulate: (count: number) => void
  onStartAuto: () => void
  onStartPlayoffRound: () => void
  onStopAuto: () => void
}

export function CareerScreen({ game, onPlay, onSimulate, onStartAuto, onStartPlayoffRound, onStopAuto }: CareerScreenProps) {
  const months = useMemo(() => [...new Set(game.schedule.map((item) => item.month))].sort((a, b) => {
    const order = (month: number) => month >= 10 ? month - 10 : month + 3
    return order(a) - order(b)
  }), [game.schedule])
  const nextIndex = game.schedule.findIndex((item) => !item.played)
  const nextMonth = nextIndex >= 0 ? game.schedule[nextIndex].month : months.at(-1) ?? 10
  const [visibleMonth, setVisibleMonth] = useState(nextMonth)
  const [slideDirection, setSlideDirection] = useState(1)

  useEffect(() => {
    if (months.includes(nextMonth) && visibleMonth !== nextMonth && game.autoSimulation?.active) {
      const currentPage = Math.max(0, months.indexOf(visibleMonth))
      const targetPage = months.indexOf(nextMonth)
      setSlideDirection(targetPage >= currentPage ? 1 : -1)
      setVisibleMonth(nextMonth)
    }
  }, [game.autoSimulation?.active, game.autoSimulation?.currentGameNumber, months, nextMonth, visibleMonth])

  if (!game.player || !game.team) return null

  if (game.seasonStage === 'playoffs' && game.playoff) return <PlayoffCareerPage
    game={game}
    onPlay={onPlay}
    onSimulate={onSimulate}
    onStartPlayoffRound={onStartPlayoffRound}
    onStopAuto={onStopAuto}
  />

  const teamRecord = game.teams.find((team) => team.id === game.team?.id) ?? game.team
  const played = game.schedule.filter((item) => item.played).length
  const pct = game.seasonStage === 'playoffs' ? ((game.playoff?.teamWins ?? 0) / 4) * 100 : Math.round((played / 82) * 100)
  const avg = (value: number) => game.player!.stats.games ? (value / game.player!.stats.games).toFixed(1) : '0.0'
  const autoRunning = Boolean(game.autoSimulation?.active)
  const currentMonthIndex = Math.max(0, months.indexOf(visibleMonth))
  const monthGames = game.schedule.map((item, index) => ({ ...item, index })).filter((item) => item.month === visibleMonth)
  const calendarYear = visibleMonth >= 10 ? game.seasonYear : game.seasonYear + 1
  const calendarRows = Math.max(1, Math.ceil(monthGames.length / 7))
  const calendarHeight = Math.max(424, Math.min(510, 145 + calendarRows * 91))
  const seasonGoalSegments = Math.max(0, Math.min(16, Math.ceil((played / 82) * 16)))
  const careerStats: CareerStatItem[] = [
    { key: 'points', label: '场均得分', value: avg(game.player.stats.points) },
    { key: 'rebounds', label: '场均篮板', value: avg(game.player.stats.rebounds) },
    { key: 'assists', label: '场均助攻', value: avg(game.player.stats.assists) },
    { key: 'minutes', label: '出场时间', value: avg(game.player.stats.minutes) },
  ]

  const changeMonth = (delta: number) => {
    const target = Math.max(0, Math.min(months.length - 1, currentMonthIndex + delta))
    if (target === currentMonthIndex) return
    setSlideDirection(delta)
    setVisibleMonth(months[target])
  }

  const onCalendarDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x <= -55 || info.velocity.x <= -420) changeMonth(1)
    if (info.offset.x >= 55 || info.velocity.x >= 420) changeMonth(-1)
  }

  const handlePrimarySimulation = () => {
    if (game.seasonStage === 'playoffs') autoRunning ? onStopAuto() : onStartPlayoffRound()
    else if (autoRunning) onStopAuto()
    else onStartAuto()
  }

  return <div className={`screen career-screen calendar-v3 ${game.seasonStage === 'regular' ? 'is-regular career-party-v5' : 'is-playoffs'}`}>
    <div className="career-poster-top">
      <header className="page-header"><div><h1 className="type-title-fixed"><span className="career-title-label">{game.seasonStage === 'playoffs' ? '季后赛中心' : '生涯中心'}</span>{game.seasonStage === 'regular' ? <img className="career-title-art" src="/assets/v3-pages/career-party/career-title-v2.png" alt="" aria-hidden="true" /> : null}</h1><div className="career-meta-row"><span className="career-season-tag"><span className="career-season-number">{`${game.seasonYear}-${String(game.seasonYear + 1).slice(2)}`}</span><span className="career-season-label" role="img" aria-label="赛季"><img src="/assets/v3-pages/career-party/season-glyph-sai-v1.png" alt="" aria-hidden="true" /><img src="/assets/v3-pages/career-party/season-glyph-ji-v1.png" alt="" aria-hidden="true" /></span></span><span className="career-year"><span className="career-year-affix" role="img" aria-label="第"><img src="/assets/v3-pages/career-party/season-glyph-di-v1.png" alt="" aria-hidden="true" /></span><strong className="career-year-number">{game.careerYear}</strong><span className="career-year-affix" role="img" aria-label="年"><img src="/assets/v3-pages/career-party/season-glyph-nian-v1.png" alt="" aria-hidden="true" /></span></span></div></div></header>
      <section className="calendar-overview">
        <section className="season-progress"><div><span className="season-progress-title">{game.seasonStage === 'playoffs' ? `季后赛第${game.playoff?.round ?? 1}轮` : '球队战绩'}</span><strong className="career-record"><span className="career-record-wins"><span className="career-record-number">{teamRecord.wins}</span><small>胜</small></span><span className="career-record-losses"><span className="career-record-number">{teamRecord.losses}</span><small>负</small></span></strong></div><div className="progress-track"><i style={{ width: `${pct}%` }} /></div><p>赛季进度 {game.seasonStage === 'playoffs' ? `${game.playoff?.teamWins ?? 0}-${game.playoff?.opponentWins ?? 0}` : `${played}/82`} · {teamRecord.conference}联盟</p></section>
        {game.seasonStage !== 'regular' ? <img className="calendar-trophy" src="/assets/v3-pages/calendar/championship-trophy.png" alt="冠军奖杯" /> : null}
        <button className="calendar-sim-next" disabled={autoRunning} onClick={() => onSimulate(1)}>
          <img src="/assets/v3-pages/career-party/whistle-pop-v1.png" alt="" />
          <strong>模拟下一场</strong>
          <small>单场快速推进</small>
        </button>
        <button className={`calendar-sim-main ${autoRunning ? 'is-running' : ''}`} onClick={handlePrimarySimulation}>
          {autoRunning ? <Pause /> : <img src="/assets/v3-pages/career-party/foam-finger-pop-v1.png" alt="" />}
          <strong>{game.seasonStage === 'playoffs' ? autoRunning ? '暂停模拟本轮系列赛' : '一键模拟本轮系列赛' : autoRunning ? '暂停连续模拟' : '一键模拟常规赛'}</strong>
          <small>{game.seasonStage === 'playoffs' ? autoRunning ? `逐场推进中 · 已模拟 ${game.autoSimulation?.simulated ?? 0} 场` : '每场触发1–2个剧情，选择后自动继续' : autoRunning ? `正在逐场推进 · 已模拟 ${game.autoSimulation?.simulated ?? 0} 场` : '逐场动画推进，事件选择后自动继续'}</small>
        </button>
      </section>
    </div>
    {game.seasonStage === 'regular' ? <section className="season-calendar">
      <div className="calendar-swipe-viewport" style={{ '--calendar-height': `${calendarHeight}px`, '--calendar-rows': calendarRows } as CSSProperties}>
        <AnimatePresence initial={false} custom={slideDirection} mode="popLayout">
          <motion.div
            className="calendar-month"
            key={visibleMonth}
            custom={slideDirection}
            variants={{ enter: (direction: number) => ({ x: direction * 70, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (direction: number) => ({ x: direction * -70, opacity: 0 }) }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: .24, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={onCalendarDragEnd}
          >
            <div className="calendar-month-title">
              <button type="button" disabled={currentMonthIndex === 0} onClick={() => changeMonth(-1)} aria-label="上个月"><ChevronLeft /></button>
              <strong><StickerNumber value={`${calendarYear}年${visibleMonth}月`} size="lg" /></strong>
              <button type="button" disabled={currentMonthIndex === months.length - 1} onClick={() => changeMonth(1)} aria-label="下个月"><ChevronRight /></button>
            </div>
            <div className="calendar-weekdays" aria-hidden="true">{['日', '一', '二', '三', '四', '五', '六'].map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
            <div className="calendar-games">{monthGames.map((item) => {
              const opponent = game.teams.find((team) => team.id === item.opponentId)!
              const result = item.result
              const simulating = autoRunning && !game.pendingStory && game.autoSimulation?.currentGameNumber === item.gameNumber
              return <motion.button
                key={item.gameNumber}
                disabled={autoRunning || item.played || item.index !== nextIndex}
                className={`${item.played ? 'played' : ''} ${item.index === nextIndex ? 'next' : ''} ${simulating ? 'simulating' : ''} ${result?.win ? 'win' : result ? 'loss' : ''}`}
                onClick={onPlay}
                animate={item.played ? { scale: [0.96, 1], opacity: 0.78 } : { scale: 1, opacity: 1 }}
                transition={{ duration: .3 }}
              ><time><StickerNumber value={`${String(visibleMonth).padStart(2, '0')}/${String(item.date).padStart(2, '0')}`} size="sm" /></time><small>{item.home ? '主' : '客'}</small><img src={opponent.logo} alt="" />{result ? <b>{result.win ? 'W' : 'L'}</b> : <span><StickerNumber value={`#${item.gameNumber}`} size="xs" /></span>}</motion.button>
            })}</div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section> : null}
    {game.injury ? <CareerInjuryStrip injury={game.injury} disabled={autoRunning} onClick={onPlay} /> : null}
    <CareerStatsPanel stats={careerStats} />
    {game.seasonStage === 'regular' ? <CareerSeasonGoal played={played} segments={seasonGoalSegments} /> : null}
    <section className="section-block"><div className="section-heading"><h2>奖项追踪</h2><Trophy /></div><div className="award-list">{game.awards.slice(0, 3).map((award) => <div key={award.name}><span><strong>{award.name}</strong><small>当前领跑：{award.leader}</small></span><b><StickerNumber value={`#${award.playerRank || '—'}`} size="md" /></b></div>)}</div></section>
    <div className="sim-note"><Activity />开启一键模拟后会持续逐场推进；剧情或伤病弹窗完成选择后，将自动继续下一场。</div>
  </div>
}
