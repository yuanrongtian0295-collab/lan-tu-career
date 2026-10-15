import { ShieldPlus, Zap } from 'lucide-react'
import type { InjuryState } from '../../types'
import { injuryRestrictionLabel, isMedicallyUnavailable, normalizeInjuryName, PLAY_THROUGH_LIMIT } from '../../engine/injuryRules'
import { StickerNumber } from '../Typography'

const INJURY_ART = {
  ankle: '/assets/injury-v1/ankle.png',
  knee: '/assets/injury-v1/knee.png',
  calf: '/assets/injury-v1/calf.png',
  hamstring: '/assets/injury-v1/hamstring.png',
  back: '/assets/injury-v1/back.png',
  overload: '/assets/injury-v1/overload.png',
} as const

type InjuryArtKey = keyof typeof INJURY_ART

function resolveInjuryArt(name: string): InjuryArtKey {
  if (name.includes('膝')) return 'knee'
  if (name.includes('小腿')) return 'calf'
  if (name.includes('腿筋')) return 'hamstring'
  if (name.includes('背')) return 'back'
  if (name.includes('过载')) return 'overload'
  return 'ankle'
}

const SEVERITY_LABELS: Record<InjuryState['severity'], string> = {
  1: '轻度伤势',
  2: '中度伤势',
  3: '重度伤势',
}

export interface InjuryDecisionCardProps {
  injury: InjuryState
  energy: number
  playThrough: boolean
  onRest: () => void
  onPlayThrough: () => void
}

export function InjuryDecisionCard({ injury, energy, playThrough, onRest, onPlayThrough }: InjuryDecisionCardProps) {
  const injuryName = normalizeInjuryName(injury.name)
  const artKey = resolveInjuryArt(injuryName)
  const reinjuryRisk = Math.min(99, Math.round(injury.reinjuryRisk + (100 - energy) * 0.25))
  const medicallyLocked = isMedicallyUnavailable(injury) || injury.playedThrough >= PLAY_THROUGH_LIMIT
  const restriction = injuryRestrictionLabel(injury) ?? (medicallyLocked ? '强制DNP' : null)

  return <section className={`injury-decision-v1 severity-${injury.severity}`} aria-labelledby="injury-decision-title">
    <div className="injury-art-v1" aria-hidden="true">
      <img src={INJURY_ART[artKey]} alt="" />
    </div>

    <div className="injury-content-v1">
      <header className="injury-heading-v1">
        <h2 id="injury-decision-title">{injuryName}</h2>
        <span>{SEVERITY_LABELS[injury.severity]}</span>
      </header>

      <div className="injury-metrics-v1" aria-label="伤势评估">
        <div><small>预计缺阵</small><strong><StickerNumber value={injury.gamesLeft} size="sm" />场</strong></div>
        <div><small>伤势等级</small><strong><StickerNumber value={`${injury.severity}/3`} size="sm" /></strong></div>
        <div><small>复发风险</small><strong><StickerNumber value={`${reinjuryRisk}%`} size="sm" /></strong></div>
      </div>

      <p className="injury-note-v1">{restriction === '赛季报销' ? '医疗组已确认赛季报销，本赛季无法再次出场。' : medicallyLocked ? '已达到三次带伤出场上限，医疗组强制DNP。' : `已带伤出场 ${injury.playedThrough}/${PLAY_THROUGH_LIMIT} 次；达到上限将被强制DNP或赛季报销。`}</p>

      <div className="injury-actions-v1">
        <button type="button" className={!playThrough ? 'is-selected' : ''} aria-pressed={!playThrough} onClick={onRest}>
          <ShieldPlus aria-hidden="true" />
          <span><strong>休战并观看</strong><small>健康回升</small></span>
        </button>
        <button type="button" disabled={medicallyLocked} className={`is-danger${playThrough && !medicallyLocked ? ' is-selected' : ''}`} aria-pressed={playThrough && !medicallyLocked} onClick={onPlayThrough}>
          <Zap aria-hidden="true" />
          <span><strong>{restriction ?? '带伤出场'}</strong><small>{medicallyLocked ? '医疗组禁止登场' : '复发风险上升'}</small></span>
        </button>
      </div>
    </div>
  </section>
}
