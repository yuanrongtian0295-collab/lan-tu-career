import { ArrowRight, Check, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { GameResult } from '../../types'
import { StickerNumber } from '../Typography'
import { PartySurface } from '../PartySurface'

interface LiveFinalCardProps {
  result: GameResult
  onCommit: () => void
}

export function LiveFinalCard({ result, onCommit }: LiveFinalCardProps) {
  const ResultIcon = result.win ? Check : X
  const score = `${result.teamScore}-${result.opponentScore}`
  const stats = [
    { value: result.points, label: '分' },
    { value: result.rebounds, label: '篮板' },
    { value: result.assists, label: '助攻' },
  ]

  return <PartySurface as={motion.section} page="game" skin="result-panel"
    className={`live-final-card final-card-v8 ${result.win ? 'win' : 'loss'}`}
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    aria-label={`${result.win ? '比赛胜利' : '比赛结束'}，比分 ${score}`}
  >
    <header className="final-card-head">
      <div className="final-card-result-label">
        <ResultIcon aria-hidden="true" />
        <span>{result.win ? '比赛胜利' : '比赛结束'}</span>
      </div>
      <StickerNumber className="final-card-score" value={score} size="hero" label={`比分 ${score}`} />
    </header>

    <div className="final-card-stat-strip">
      <div className={`final-card-grade ${String(result.grade).length > 2 ? 'is-long' : ''}`}>
        <strong>{result.grade}</strong>
        <span>评分</span>
      </div>
      {stats.map((stat) => <div className="final-card-stat" key={stat.label}>
        <StickerNumber value={stat.value} size="lg" label={`${stat.value}${stat.label}`} />
        <span>{stat.label}</span>
      </div>)}
    </div>

    <motion.button whileTap={{ scale: 0.985 }} onClick={onCommit}>
      <span>完成比赛并返回首页</span>
      <ArrowRight aria-hidden="true" />
    </motion.button>
  </PartySurface>
}
