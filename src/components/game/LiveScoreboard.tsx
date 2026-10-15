import type { LiveGameEvent } from '../../engine/gameEngine'
import type { Team } from '../../types'

type LiveStatus = 'running' | 'paused' | 'finished'

export function LiveScoreboard({ team, opponent, events, status, home }: { team: Team; opponent: Team | null; events: LiveGameEvent[]; status: LiveStatus; home: boolean }) {
  const current = events[events.length - 1]
  const teamScore = current?.teamScore ?? 0
  const opponentScore = current?.opponentScore ?? 0
  const lead = teamScore - opponentScore
  const teamMomentum = Math.max(12, Math.min(88, 50 + lead * 4))
  const opponentMomentum = 100 - teamMomentum
  const leftTeam = home ? opponent : team
  const rightTeam = home ? team : opponent
  const leftScore = home ? opponentScore : teamScore
  const rightScore = home ? teamScore : opponentScore
  const leftMomentum = home ? opponentMomentum : teamMomentum
  const rightMomentum = home ? teamMomentum : opponentMomentum

  return <section className="live-scoreboard-v6" aria-label="实时比分">
    <div className="match-team is-home">
      {leftTeam ? <img src={leftTeam.logo} alt={`${leftTeam.short} 队徽`} /> : null}
      <strong>{leftTeam?.short ?? '—'}</strong>
    </div>
    <div className="match-score-center">
      <div className="match-score-numbers"><strong>{leftScore}</strong><span>–</span><strong>{rightScore}</strong></div>
      <div className="match-momentum">
        <i className="is-home"><b style={{ width: `${leftMomentum}%` }} /></i>
        <span>{status === 'finished' ? '最终比分' : '势均力敌'}</span>
        <i className="is-away"><b style={{ width: `${rightMomentum}%` }} /></i>
      </div>
    </div>
    <div className="match-team is-away">
      {rightTeam ? <img src={rightTeam.logo} alt={`${rightTeam.short} 队徽`} /> : null}
      <strong>{rightTeam?.short ?? '—'}</strong>
    </div>
  </section>
}
