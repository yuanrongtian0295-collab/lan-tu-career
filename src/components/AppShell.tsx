import { CalendarDays, House, Smartphone, Trophy, UserRound } from 'lucide-react'
import { motion } from 'framer-motion'
import { StickerNumber } from './Typography'

const items = [
  { id: 'home', label: '首页', icon: House },
  { id: 'career', label: '生涯', icon: CalendarDays },
  { id: 'league', label: '联盟', icon: Trophy },
  { id: 'phone', label: '手机', icon: Smartphone },
  { id: 'player', label: '球员', icon: UserRound },
]

export function AppShell({ active, onChange, children }: { active: string; onChange: (tab: string) => void; children: React.ReactNode }) {
  const activeSection = active.startsWith('phone') ? 'phone' : active.startsWith('player') ? 'player' : active
  return (
    <div className={`${activeSection === 'home' ? 'app-shell home-shell' : 'app-shell'} party-shell party-page-${activeSection}`} data-party-page={activeSection}>
      <main className="app-content">{children}</main>
      <nav className="bottom-nav" aria-label="主导航">
        {items.map((item) => {
          const Icon = item.icon
          const selected = activeSection === item.id
          return (
            <button key={item.id} className={selected ? 'nav-item active' : 'nav-item'} onClick={() => onChange(item.id)} aria-current={selected ? 'page' : undefined}>
              <motion.span animate={{ y: selected ? -2 : 0, scale: selected ? 1.06 : 1 }} className="nav-icon"><Icon size={21} strokeWidth={selected ? 2.4 : 1.8} /></motion.span>
              <span>{item.label}</span>
              {selected ? <motion.i layoutId="nav-line" /> : null}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export function Brand() {
  return <div className="brand" aria-label="篮途"><span>篮</span><span>途</span></div>
}

export function Meter({ label, value, tone = 'gold' }: { label: string; value: number; tone?: 'gold' | 'cyan' | 'red' }) {
  return (
    <div className={`meter ${tone}`}>
      <div className="meter-head"><span>{label}</span><strong><StickerNumber value={Math.round(value)} size="sm" /></strong></div>
      <div className="meter-track"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.max(2, Math.min(100, value))}%` }} transition={{ type: 'spring', stiffness: 90, damping: 18 }} /></div>
    </div>
  )
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="empty-state"><Trophy size={28} /><strong>{title}</strong><p>{body}</p></div>
}
