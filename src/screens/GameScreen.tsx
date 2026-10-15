import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import type { GameResult, SaveGame } from '../types'
import { createLiveGameSession, prepareGameResult, type LiveGameSession } from '../engine/gameEngine'
import { LiveControls } from '../components/game/LiveControls'
import { LiveDataTable } from '../components/game/LiveDataTable'
import { LiveLineupTable } from '../components/game/LiveLineupTable'
import { LivePlayerStrip } from '../components/game/LivePlayerStrip'
import { LiveScoreboard } from '../components/game/LiveScoreboard'
import { LiveTimeline } from '../components/game/LiveTimeline'
import { MatchResultCard } from '../components/game/MatchResultCard'
import { TacticSelector } from '../components/game/TacticSelector'

const liveTabs = ['直播', '数据', '阵容'] as const
type LiveTab = typeof liveTabs[number]
type LiveStatus = 'running' | 'paused' | 'finished'

export function GameScreen({ game, onBack, onPlay }: { game: SaveGame; onBack: () => void; onPlay: (tactic: string, playThrough?: boolean, preparedResult?: GameResult) => void }) {
  const [selected, setSelected] = useState('balanced')
  const [tab, setTab] = useState<LiveTab>('直播')
  const [status, setStatus] = useState<LiveStatus>('running')
  const [session, setSession] = useState<LiveGameSession | null>(null)
  const [revealed, setRevealed] = useState(0)
  const timelineRef = useRef<HTMLElement>(null)

  const visualTeam = useMemo(() => game.teams.find((team) => team.id === game.team?.id) ?? game.team, [game.team, game.teams])
  const nextGame = useMemo(() => game.schedule.find((item) => !item.played) ?? null, [game.schedule])
  const visualOpponent = useMemo(
    () => nextGame ? game.teams.find((team) => team.id === nextGame.opponentId) ?? null : null,
    [game.teams, nextGame?.opponentId],
  )
  const playerIsHome = nextGame?.home ?? true

  useEffect(() => {
    if (status !== 'running' || !session) return
    if (revealed >= session.events.length) {
      setStatus('finished')
      return
    }
    const timer = window.setTimeout(() => setRevealed((count) => Math.min(session.events.length, count + 1)), 780)
    return () => window.clearTimeout(timer)
  }, [revealed, session, status])

  useEffect(() => {
    if (tab !== '直播') return
    const node = timelineRef.current
    if (node && revealed > 4) node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }, [revealed, tab])

  if (!game.player || !game.team || !visualTeam) return null

  const visibleEvents = session?.events.slice(0, revealed) ?? []
  const current = visibleEvents[visibleEvents.length - 1]
  const currentStats = {
    points: current?.points ?? 0,
    rebounds: current?.rebounds ?? 0,
    assists: current?.assists ?? 0,
    steals: current?.steals ?? 0,
    blocks: current?.blocks ?? 0,
    turnovers: current?.turnovers ?? 0,
  }
  const progress = session ? Math.round(revealed / session.events.length * 100) : 0

  const beginOrResume = () => {
    if (status === 'finished') return
    if (session) {
      setStatus('running')
      return
    }
    const result = prepareGameResult(game, selected, false)
    if (!result) return
    setSession(createLiveGameSession(result, game.player!, game.team!))
    setRevealed(1)
    setStatus('running')
    setTab('直播')
  }

  const finishLive = () => {
    if (!session) {
      beginOrResume()
      return
    }
    setRevealed(session.events.length)
    setStatus('finished')
    setTab('直播')
  }

  const commitResult = () => {
    if (!session) return
    onPlay(selected, false, session.result)
    window.setTimeout(onBack, 360)
  }

  return <div className={`screen game-screen game-v3 game-live-v6 match-center-page is-${status}`}>
    <header className="match-hero" aria-label="比赛中心">
      <h1 className="match-title">
        <span>比赛中心</span>
        <img src="/assets/match-center/match-center-title.png" alt="" aria-hidden="true" />
      </h1>
      <button className="match-back-button" type="button" onClick={onBack} aria-label="返回首页">
        <ArrowLeft aria-hidden="true" />
        <span>返回</span>
      </button>
      <div className="match-status-row">
        <div className="match-live-badge"><b><i /> LIVE</b><span>{status === 'finished' ? '比赛已结束' : status === 'paused' ? '比赛已暂停' : '比赛进行中'}</span></div>
        <div className="match-clock-badge"><span>第 <b>{status === 'finished' ? 4 : current?.quarter ?? 1}</b> 节</span><strong>{status === 'finished' ? '00:00' : current?.clock ?? '12:00'}</strong></div>
      </div>
    </header>

    <LiveScoreboard team={visualTeam} opponent={visualOpponent} events={visibleEvents} status={status} home={playerIsHome} />
    <LivePlayerStrip team={visualTeam} player={game.player} points={currentStats.points} assists={currentStats.assists} rebounds={currentStats.rebounds} statusText={status === 'running' ? '比赛进行中' : status === 'finished' ? '比赛结束' : '等待继续'} />

    <section className="match-content-panel">
      <div className="game-tabs" role="tablist" aria-label="比赛内容切换">
        {liveTabs.map((item) => <button type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}
      </div>

      <AnimatePresence mode="wait">
        {tab === '直播' ? <LiveTimeline ref={timelineRef} events={visibleEvents} team={visualTeam} opponent={visualOpponent} home={playerIsHome} key="live" /> : null}
        {tab === '数据' ? <LiveDataTable key="data" team={visualTeam} opponent={visualOpponent} player={game.player} stats={currentStats} teamScore={current?.teamScore ?? 0} opponentScore={current?.opponentScore ?? 0} grade={session?.result.grade ?? '—'} minutes={session ? session.result.minutes * progress / 100 : 0} teamStats={current?.teamStats ?? null} opponentStats={current?.opponentStats ?? null} /> : null}
        {tab === '阵容' ? <LiveLineupTable key="lineup" team={visualTeam} player={game.player} stats={currentStats} teamScore={current?.teamScore ?? 0} opponentScore={current?.opponentScore ?? 0} minutes={session ? session.result.minutes * progress / 100 : 0} progress={progress} /> : null}
      </AnimatePresence>

      <TacticSelector selected={selected} onSelect={setSelected} energy={game.player.energy} disabled={status === 'finished'} />
    </section>

    <LiveControls
      status={status}
      progress={progress}
      clock={status === 'finished' ? '00:00' : current?.clock ?? '12:00'}
      onPause={() => setStatus((value) => value === 'finished' ? value : 'paused')}
      onContinue={beginOrResume}
      onFinish={finishLive}
    />

    <MatchResultCard
      team={visualTeam}
      opponent={visualOpponent}
      result={status === 'finished' ? session?.result ?? null : null}
      onCommit={commitResult}
    />
  </div>
}
