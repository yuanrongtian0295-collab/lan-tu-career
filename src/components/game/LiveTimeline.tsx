import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import type { LiveGameEvent } from '../../engine/gameEngine'
import type { Team } from '../../types'

function createPreviewEvents(team: Team, opponent: Team | null, home: boolean) {
  const teamName = `${team.city}${team.name}`
  const opponentName = opponent ? `${opponent.city}${opponent.name}` : '对手球队'
  const hostName = home ? teamName : opponentName
  const matchup = home ? `${teamName}主场迎战${opponentName}` : `${teamName}客场挑战${opponentName}`
  return [
    { id: 'preview-1', clock: '12:00', text: `比赛即将开始！${matchup}，首节对决即将打响！`, tone: 'team' },
    { id: 'preview-2', clock: '12:00', text: `球员们正在热身，${hostName}主场气氛逐渐升温！`, tone: 'team' },
    { id: 'preview-3', clock: '12:00', text: `${opponentName}完成赛前投篮热身，双方状态都已准备就绪！`, tone: 'opponent' },
    { id: 'preview-4', clock: '12:00', text: '双方首发已就位，跳球马上开始！', tone: 'team' },
  ]
}

export const LiveTimeline = forwardRef<HTMLElement, { events: LiveGameEvent[]; team: Team; opponent: Team | null; home: boolean }>(function LiveTimeline({ events, team, opponent, home }, ref) {
  const items = events.length
    ? events.map((event) => ({ id: event.id, clock: event.clock, text: event.text, tone: event.tone }))
    : createPreviewEvents(team, opponent, home)

  return <motion.section ref={ref} className="live-timeline-v6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-live="polite">
    {items.map((event, index) => <motion.article
      className={`${event.tone} ${index === items.length - 1 && events.length ? 'current' : ''}`}
      key={event.id}
      initial={events.length ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
    >
      <time>{event.clock}</time>
      <i className="live-event-node" />
      <p>{event.text}</p>
    </motion.article>)}
  </motion.section>
})
