import { AlertTriangle, MessageCircleMore } from 'lucide-react'
import type { StoryChoice, StoryEvent } from '../types'
import { PartyChoiceCard, PartyDialog } from './PartyDialog'
import { StickerNumber } from './Typography'

const effectNames: Record<string, string> = { fans: '球迷', media: '媒体', city: '城市', legacy: '传承', morale: '士气', coachTrust: '信任', energy: '体能', health: '健康', money: '资产', mentorXp: '师徒' }

function formatEffect(key: string, value: number) {
  const amount = key === 'money' ? `${Math.round(value / 10000)}万` : value
  return `${effectNames[key] ?? key} ${value > 0 ? '+' : ''}${amount}`
}

function choiceScore(choice: StoryChoice) {
  const direct = Object.values(choice.effects).reduce((score, value) => score + (Number(value) < 0 ? Math.abs(Number(value)) * 3 : -Number(value)), 0)
  return direct + (choice.risk?.chance ?? 0)
}

export function StoryModal({ story, onResolve }: { story: StoryEvent; onResolve: (choice: StoryChoice) => void }) {
  const recommendedIndex = story.choices.reduce((best, choice, index, choices) => choiceScore(choice) < choiceScore(choices[best]) ? index : best, 0)

  return (
    <PartyDialog
      className="story-modal story-v3"
      label="剧情选择"
      title={story.title}
      subtitle={<><MessageCircleMore />{story.speaker}</>}
      description={story.body}
      footer="选择将影响生涯走向"
    >
      <div className="choice-list">
        {story.choices.map((choice, index) => {
          const gains = Object.entries(choice.effects).filter(([, value]) => Number(value) > 0)
          const costs = Object.entries(choice.effects).filter(([, value]) => Number(value) < 0)
          return <PartyChoiceCard
            key={choice.label}
            index={index + 1}
            title={choice.label}
            description={choice.hint}
            recommended={index === recommendedIndex}
            onClick={() => onResolve(choice)}
          >
            <span className="story-outcome is-benefit">
              <b>收益</b>
              <span>{gains.length ? gains.map(([key, value]) => <i key={key}>{formatEffect(key, Number(value))}</i>) : <em>保持当前状态</em>}</span>
            </span>
            <span className="story-outcome is-risk">
              <b>风险</b>
              <span>{choice.risk ? <><AlertTriangle /><StickerNumber value={`${choice.risk.chance}%`} size="xs" /> · {choice.risk.label}</> : costs.length ? costs.map(([key, value]) => <i className="negative" key={key}>{formatEffect(key, Number(value))}</i>) : <em>长期结果取决于后续剧情</em>}</span>
            </span>
          </PartyChoiceCard>
        })}
      </div>
    </PartyDialog>
  )
}
