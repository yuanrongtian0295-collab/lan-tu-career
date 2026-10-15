import { BriefcaseBusiness, Dumbbell, Heart, Landmark, Sparkles } from 'lucide-react'
import { Brand } from '../components/AppShell'
import type { SaveGame } from '../types'
import { ReadableTitle, StickerNumber } from '../components/Typography'

const focuses = [
  { id: 'training', icon: Dumbbell, title: '封闭特训', body: '提升三分、控球、外防和耐力的当前值与潜力。', effect: '能力成长最快' },
  { id: 'business', icon: BriefcaseBusiness, title: '商业拓展', body: '建立个人品牌、增加收入，也带来更多媒体关注。', effect: '资产 +28万' },
  { id: 'family', icon: Heart, title: '陪伴家人', body: '修复漫长赛季消耗的情绪与身体，维护重要关系。', effect: '士气与健康恢复' },
  { id: 'city', icon: Landmark, title: '城市公益', body: '举办训练营和社区活动，让这里真正成为你的城市。', effect: '球迷与城市认可' },
] as const

export function OffseasonScreen({ game, onChoose }: { game: SaveGame; onChoose: (focus: 'training' | 'business' | 'family' | 'city') => void }) {
  const rookie = game.generatedRookies[0]
  return <div className="screen offseason-screen offseason-v3">
    <header className="topbar"><Brand /><span>{game.seasonYear}休赛期</span></header>
    <section className="offseason-hero"><Sparkles /><span>赛季之间</span><ReadableTitle as="h1" fixed>球场安静以后，<br />你准备成为什么人？</ReadableTitle><p>休赛期选择会跳过夏季并进入下一年。无法兼顾所有方向，这也是职业生涯的一部分。</p></section>
    <div className="offseason-summary"><div><strong><StickerNumber value={game.careerYear} size="lg" /></strong><span>生涯年份</span></div><div><strong><StickerNumber value={Math.round(game.legacy)} size="lg" /></strong><span>传承</span></div><div><strong><StickerNumber value={game.city} size="lg" /></strong><span>城市认可</span></div><div><strong><StickerNumber value={game.fans} size="lg" /></strong><span>球迷支持</span></div></div>
    <h2 className="offseason-title">选择这个夏天的重心</h2>
    <div className="offseason-focuses">{focuses.map(({ id, icon: Icon, title, body, effect }) => <button key={id} onClick={() => onChoose(id)}><Icon /><span><strong>{title}</strong><small>{body}</small><b>{effect}</b></span></button>)}</div>
    {rookie ? <section className="offseason-rookie"><span>新秀前瞻</span><div><strong className="dynamic-name">{rookie.name}</strong><small>{rookie.positions.join('/')} · {rookie.archetype}</small></div><b><StickerNumber value={rookie.overall} size="lg" /></b></section> : null}
    <p className="legal-note">选择后自动进入训练营，并生成下一届80名新秀。</p>
  </div>
}
