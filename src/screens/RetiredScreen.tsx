import { motion } from 'framer-motion'
import { Building2, Mic2, RotateCcw, Shield, Trophy, UsersRound } from 'lucide-react'
import type { SaveGame } from '../types'
import { ReadableTitle, StickerNumber } from '../components/Typography'

export function RetiredScreen({ game, onChoose, onReset }: { game: SaveGame; onChoose: (path: string) => void; onReset: () => void }) {
  const choices = [
    { icon: Shield, title: '成为主教练', body: '职业与师徒积累会决定执教声望。', fit: game.life.professionalism + game.mentor.level * 8 },
    { icon: Building2, title: '进入管理层', body: '野心、资产与联盟影响力决定起点。', fit: game.life.ambition + Math.min(30, game.money / 100000) },
    { icon: Mic2, title: '成为媒体人', body: '媒体关系和公众关注会成为你的资本。', fit: game.media + game.fans * .3 },
    { icon: UsersRound, title: '创办青训学院', body: '家庭、忠诚与传承决定学院号召力。', fit: game.life.family + game.life.loyalty + game.legacy * .2 },
  ].sort((a, b) => b.fit - a.fit)
  const ending = game.life.professionalism > 72 && game.life.loyalty > 65
    ? '更衣室灯塔'
    : game.life.ambition > 76
      ? '不肯停下的王者'
      : game.life.family > 72
        ? '把生活赢回来的人'
        : game.life.nightlife > 65
          ? '永远处在聚光灯下'
          : '复杂而真实的职业球员'

  return <div className="retired-screen retired-v3">
    <motion.div className="hall-ring" initial={{ scale: .6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><Trophy /></motion.div>
    <span>你的传奇，永不落幕 · {ending}</span>
    <ReadableTitle as="h1" fixed>传奇谢幕</ReadableTitle>
    <div className="retire-career-range">职业生涯 <b>{game.seasonYear - game.careerYear + 1}-{game.seasonYear}</b></div>
    <p>{game.player?.name} 用 {game.careerYear} 个赛季留下了 {Math.round(game.legacy)} 点传承。全部剧情选择、伤病决定和人际关系共同形成了这个结局。</p>
    <div className="retire-summary">
      <div><strong><StickerNumber value={game.player?.stats.games ?? 0} size="lg" /></strong><span>生涯比赛</span></div>
      <div><strong><StickerNumber value={game.storyRecords.length} size="lg" /></strong><span>人生抉择</span></div>
      <div><strong><StickerNumber value={Math.round(game.legacy)} size="lg" /></strong><span>历史传承</span></div>
    </div>
    <h2>{game.retirementPath ? '第二人生已经开始' : '人生新篇章 · 选择未来道路'}</h2>
    <div className="retirement-choices">{choices.map(({ icon: Icon, title, body, fit }, index) => <button className={game.retirementPath === title ? 'selected' : ''} onClick={() => onChoose(title)} key={title}><Icon /><span><strong>{title}{index === 0 ? ' · 最适合' : ''}</strong><small>{body} 匹配度 <StickerNumber value={Math.min(99, Math.round(fit))} size="xs" /></small></span></button>)}</div>
    {game.retirementPath ? <p className="retirement-result">你选择了“{game.retirementPath}”。这不是一个独立按钮，而是整段生涯选择累积后的新起点。</p> : null}
    <button className="secondary-button restart-button" onClick={onReset}><RotateCcw />开启新的生涯</button>
  </div>
}
