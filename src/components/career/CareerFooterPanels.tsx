import { ChevronRight } from 'lucide-react'
import type { InjuryState } from '../../types'
import { injuryRestrictionLabel, normalizeInjuryName } from '../../engine/injuryRules'
import { StickerNumber } from '../Typography'

const FOOTER_ASSET_ROOT = '/assets/v3-pages/career-party/footer-v1'

export type CareerStatArtKey = 'points' | 'rebounds' | 'assists' | 'minutes'

export interface CareerStatItem {
  key: CareerStatArtKey
  label: string
  value: string
}

const STAT_ART: Record<CareerStatArtKey, string> = {
  points: `${FOOTER_ASSET_ROOT}/stat-points-v2.png`,
  rebounds: `${FOOTER_ASSET_ROOT}/stat-rebounds-v2.png`,
  assists: `${FOOTER_ASSET_ROOT}/stat-assists-v2.png`,
  minutes: `${FOOTER_ASSET_ROOT}/stat-minutes-v2.png`,
}

const INJURY_ART = {
  ankle: `${FOOTER_ASSET_ROOT}/injury-ankle.png`,
  knee: `${FOOTER_ASSET_ROOT}/injury-knee.png`,
  calf: `${FOOTER_ASSET_ROOT}/injury-calf.png`,
  hamstring: `${FOOTER_ASSET_ROOT}/injury-hamstring.png`,
  back: `${FOOTER_ASSET_ROOT}/injury-back.png`,
  overload: `${FOOTER_ASSET_ROOT}/injury-overload.png`,
} as const

function getInjuryArt(name: string) {
  const normalized = normalizeInjuryName(name)
  if (/脚踝|踝|足|脚/.test(normalized)) return INJURY_ART.ankle
  if (/膝/.test(normalized)) return INJURY_ART.knee
  if (/腘绳|腿筋|大腿|股/.test(normalized)) return INJURY_ART.hamstring
  if (/小腿|胫|腓|腿/.test(normalized)) return INJURY_ART.calf
  if (/腰|背|脊/.test(normalized)) return INJURY_ART.back
  return INJURY_ART.overload
}

interface CareerInjuryStripProps {
  injury: InjuryState
  disabled?: boolean
  onClick: () => void
}

export function CareerInjuryStrip({ injury, disabled, onClick }: CareerInjuryStripProps) {
  const name = normalizeInjuryName(injury.name)
  const restriction = injuryRestrictionLabel(injury)
  const detail = restriction ? `${restriction} · 后续比赛自动记为DNP` : `预计休战${injury.gamesLeft}场`

  return <button
    className="medical-card career-injury-strip"
    disabled={disabled}
    onClick={onClick}
    aria-label={`${name}，${detail}，复发风险${injury.reinjuryRisk}%`}
  >
    <span className="career-injury-art-slot" aria-hidden="true">
      <img src={getInjuryArt(name)} alt="" />
    </span>
    <span className="career-injury-copy">
      <strong>{name}</strong>
      <small>{detail}</small>
    </span>
    <ChevronRight aria-hidden="true" />
  </button>
}

export function CareerStatsPanel({ stats }: { stats: CareerStatItem[] }) {
  return <section className="career-stat-line" aria-label="赛季个人数据">
    {stats.map((stat) => <div key={stat.key}>
      <span>{stat.label}</span>
      <img className="career-stat-art" src={STAT_ART[stat.key]} alt="" aria-hidden="true" />
      <strong><StickerNumber value={stat.value} size="md" /></strong>
    </div>)}
  </section>
}

interface CareerSeasonGoalProps {
  played: number
  segments: number
}

export function CareerSeasonGoal({ played, segments }: CareerSeasonGoalProps) {
  return <section className="career-season-goal" aria-label="赛季目标">
    <div>
      <p><StickerNumber value={played} size="lg" /> <span>/ 82</span></p>
      <div className="goal-segments" aria-label={`赛季目标进度${played}/82`}>
        {Array.from({ length: 16 }, (_, index) => <i className={index < segments ? 'filled' : ''} key={index} />)}
      </div>
    </div>
  </section>
}
