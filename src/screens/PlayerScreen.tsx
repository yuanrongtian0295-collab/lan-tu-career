import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Activity, ArrowRightLeft, BriefcaseBusiness, ChevronRight, Dumbbell, HeartPulse, LogOut, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'
import { ATTRIBUTE_GROUPS, ATTRIBUTE_LABELS } from '../data/playerLibrary'
import { getPlayerPreset, portraitIdFromLegacyNumber } from '../data/playerPresets'
import { Meter } from '../components/AppShell'
import type { AttributeKey, Position, SaveGame } from '../types'
import { StickerNumber } from '../components/Typography'
import { PartyChoiceCard, PartyDialog } from '../components/PartyDialog'
import { injuryRestrictionLabel, normalizeInjuryName } from '../engine/injuryRules'

type ManagementDetail = 'contract' | 'legacy' | 'injury' | 'trade' | 'retire' | null

export function PlayerScreen({ game, initialSection = 'attributes', initialDetail = null, onTrain, onPosition, onTrade, onRecover, onRetire }: { game: SaveGame; initialSection?: 'attributes' | 'badges' | 'career'; initialDetail?: ManagementDetail; onTrain: (key: AttributeKey, mode?: 'normal' | 'intense') => void; onPosition: (position: Position) => void; onTrade: () => void; onRecover: () => void; onRetire: () => void }) {
  const [section, setSection] = useState<'attributes' | 'badges' | 'career'>(initialSection)
  const [trainingMode, setTrainingMode] = useState<'normal' | 'intense'>('normal')
  const [detail, setDetail] = useState<ManagementDetail>(initialDetail)
  if (!game.player || !game.team) return null
  const player = game.player
  const preset = getPlayerPreset(player.portraitId ?? portraitIdFromLegacyNumber(player.number))
  const legacyTier = game.legacy >= 80 ? '球队传奇' : game.legacy >= 45 ? '队史核心' : game.legacy >= 20 ? '重要轮换' : '初入球队'
  const managementCopy = detail ? {
    contract: { label: '经纪人办公室', title: '合同与资产', description: '你的合同、资产和商业形象会随赛季表现与公开选择持续变化。' },
    legacy: { label: '队史档案', title: `${game.team.city}${game.team.name}队史地位`, description: '冠军、奖项、关键比赛和对城市的承诺，都会沉淀为不可替代的球队传承。' },
    injury: { label: '医疗中心', title: game.injury ? normalizeInjuryName(game.injury.name) : '伤病报告', description: game.injury ? injuryRestrictionLabel(game.injury) ? `${injuryRestrictionLabel(game.injury)}已经生效，比赛将自动记录为DNP，直到伤病恢复或进入下赛季。` : '第三次带伤出场后必须接受医疗复检；普通伤势将被强制DNP，重伤、高复发风险或低健康状态会直接赛季报销。' : '' },
    trade: { label: '交易申请', title: '提交交易申请？', description: '球队将立即执行一次交易评估。更换球队会重建赛程和更衣室关系，并降低15点城市认可。' },
    retire: { label: '生涯决定', title: '确定结束球员生涯？', description: '退役后将进入第二人生，可以选择教练、管理层、商业或家庭道路；本次生涯仍会保留到你主动开启新生涯。' },
  }[detail] : null
  return <div className={`screen player-screen player-v3 section-${section}`}>
    <section className="player-hero"><div className="player-season-strip"><StickerNumber value={`${game.seasonYear}-${String(game.seasonYear + 1).slice(2)}`} size="sm" /><span>赛季</span><b>第 <StickerNumber value={game.careerYear} size="sm" /> 年</b></div><img className="player-hero-model player-portrait-hero" src={preset.image} alt={`${preset.label}预设球员形象`} /><div className="player-hero-shade" /><div className="player-identity"><span>{game.team.city}{game.team.name} · <StickerNumber value={`#${preset.number}`} size="sm" /> · {preset.label}</span><h1 className="dynamic-name">{player.name}</h1><p>{player.position} / {player.secondaryPosition} · <StickerNumber value={player.height} size="xs" />cm · {player.archetype}</p></div><div className="hero-overall"><span>总评</span><strong><StickerNumber value={player.overall} size="lg" /></strong></div></section>
    <div className="player-meters"><Meter label="体能" value={player.energy} tone="cyan" /><Meter label="健康" value={player.health} tone={game.injury ? 'red' : 'gold'} /><Meter label="潜力兑现" value={Math.min(100, 44 + game.careerYear * 5)} /></div>
    <div className="segmented player-tabs segmented-control" role="tablist" aria-label="球员页面切换">{[['attributes', '能力'], ['badges', '徽章'], ['career', '生涯']].map(([id, label]) => <button role="tab" aria-selected={section === id} key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id as typeof section)}>{label}</button>)}</div>
    {section === 'attributes' ? <><section className="training-control"><div><span>训练模式</span><strong>当前负荷 <StickerNumber value={`${player.trainingLoad}/100`} size="sm" /></strong></div><div className="training-mode-switch segmented-control segmented-control--compact"><button className={trainingMode === 'normal' ? 'selected' : ''} onClick={() => setTrainingMode('normal')}>常规 · -8体能 · +1</button><button className={trainingMode === 'intense' ? 'selected danger' : 'danger'} onClick={() => setTrainingMode('intense')}>高强度 · -18体能 · +2~3</button></div><p>{trainingMode === 'intense' ? `训练过载风险约 ${Math.round((.08 + player.trainingLoad / 400) * 100)}%，受伤后无法继续训练。` : '常规训练风险很低，连续训练仍会积累负荷。'}</p></section><div className="attribute-groups">{ATTRIBUTE_GROUPS.map((group) => <section key={group.name}><h2>{group.name}<span>{trainingMode === 'intense' ? '高强度训练' : '常规训练'}</span></h2>{group.keys.map((key) => <button disabled={Boolean(game.injury) || player.energy < (trainingMode === 'intense' ? 18 : 8) || player.potential[key] <= player.attributes[key]} key={key} onClick={() => onTrain(key, trainingMode)}><span>{ATTRIBUTE_LABELS[key]}</span><div><i style={{ width: `${player.attributes[key]}%` }} /></div><strong><StickerNumber value={Math.round(player.attributes[key])} size="sm" /></strong><small>{player.potential[key] > player.attributes[key] ? `潜力 ${Math.round(player.potential[key])}` : '已达到潜力上限'}</small><Dumbbell size={16} /></button>)}</section>)}</div></> : null}
    {section === 'badges' ? <div className="badge-grid">{player.badges.map((badge) => <article key={badge.id} className={badge.level ? 'unlocked' : ''}><span><Sparkles /></span><div><small>{badge.category} · {['未解锁', '熟练', '精英', '大师', '传奇'][badge.level]}</small><h3>{badge.name}</h3><p>{badge.description}</p><div><i style={{ width: `${badge.progress}%` }} /></div></div></article>)}</div> : null}
    {section === 'career' ? <div className="career-management">
      <section><h2>位置管理</h2><p>赛季中可以换位，但会进入适应期并暂时降低教练信任。</p><div className="position-selector segmented-control segmented-control--compact">{(['PG', 'SG', 'SF', 'PF', 'C'] as Position[]).map((position) => <button key={position} className={player.position === position ? 'selected' : ''} onClick={() => onPosition(position)}>{position}</button>)}</div></section>
      <button className="management-row" onClick={() => setDetail('trade')}><ArrowRightLeft /><span><strong>申请交易</strong><small>经纪人将寻找适合的球队，城市认可会下降。</small></span><ChevronRight /></button>
      <button className="management-row" onClick={() => setDetail('contract')}><BriefcaseBusiness /><span><strong>合同与资产</strong><small>当前资产 ¥<StickerNumber value={Math.round(game.money / 10000)} size="xs" />万 · 新秀合同</small></span><ChevronRight /></button>
      <button className="management-row" onClick={() => setDetail('legacy')}><ShieldCheck /><span><strong>球队历史地位</strong><small>传承分 <StickerNumber value={Math.round(game.legacy)} size="xs" /> · 城市认可 <StickerNumber value={game.city} size="xs" /></small></span><ChevronRight /></button>
      <section className="life-direction"><h2>人生倾向</h2><p>剧情选择正在塑造退役后的道路。</p>{Object.entries(game.life).map(([key, value]) => <div key={key}><span>{key === 'professionalism' ? '职业' : key === 'ambition' ? '野心' : key === 'loyalty' ? '忠诚' : key === 'family' ? '家庭' : key === 'nightlife' ? '夜生活' : '冒险'}</span><i><b style={{ width: `${value}%` }} /></i><strong><StickerNumber value={value} size="sm" /></strong></div>)}</section>
      {game.injury ? <button className="management-row" onClick={() => setDetail('injury')}><HeartPulse /><span><strong>{normalizeInjuryName(game.injury.name)}</strong><small>{injuryRestrictionLabel(game.injury) ? `${injuryRestrictionLabel(game.injury)}，无法主动选择出场。` : <>预计缺席 <StickerNumber value={game.injury.gamesLeft} size="xs" /> 场，已带伤出场 {game.injury.playedThrough}/3 次。</>}</small></span><ChevronRight /></button> : null}
      <button className="management-row danger" onClick={() => setDetail('retire')}><LogOut /><span><strong>宣布退役</strong><small>结束球员生涯并进入第二人生。</small></span><ChevronRight /></button>
    </div> : null}
    <AnimatePresence>{detail && managementCopy ? <PartyDialog
      className={`management-modal detail-${detail}`}
      label={managementCopy.label}
      title={managementCopy.title}
      description={managementCopy.description}
      onClose={() => setDetail(null)}
      footer="每一次决定，都会写进你的生涯档案"
    >
      {detail === 'contract' ? <><div className="management-detail-grid"><div><small>合同状态</small><strong>{game.careerYear <= 4 ? `新秀合同 · 第${game.careerYear}/4年` : '续约合同'}</strong></div><div><small>可用资产</small><strong>¥{game.money.toLocaleString()}</strong></div><div><small>媒体印象</small><strong>{game.media}/100</strong></div><div><small>球迷支持</small><strong>{game.fans}/100</strong></div></div><div className="management-sheet-actions"><PartyChoiceCard compact index={1} title="返回生涯管理" description="关闭合同详情并继续当前生涯" onClick={() => setDetail(null)} /></div></> : null}
      {detail === 'legacy' ? <><div className="management-detail-grid"><div><small>当前定位</small><strong>{legacyTier}</strong></div><div><small>传承分</small><strong>{Math.round(game.legacy)}</strong></div><div><small>城市认可</small><strong>{game.city}/100</strong></div><div><small>生涯年份</small><strong>第 {game.careerYear} 年</strong></div></div><div className="legacy-progress"><i><b style={{ width: `${Math.min(100, game.legacy)}%` }} /></i><span>传承分达到80，将进入球队传奇行列</span></div><div className="management-sheet-actions"><PartyChoiceCard compact index={1} title="继续书写队史" description="返回球员中心，延续当前球队生涯" onClick={() => setDetail(null)} /></div></> : null}
      {detail === 'injury' && game.injury ? <><div className="management-detail-grid"><div><small>预计缺席</small><strong>{game.injury.gamesLeft} 场</strong></div><div><small>伤势等级</small><strong>{game.injury.severity}/3</strong></div><div><small>复发风险</small><strong>{game.injury.reinjuryRisk}%</strong></div><div><small>带伤出场</small><strong>{game.injury.playedThrough}/3 次</strong></div></div><div className="management-sheet-actions split"><PartyChoiceCard compact index={1} title="稍后决定" description="暂不消耗恢复日" onClick={() => setDetail(null)} /><PartyChoiceCard compact tone="primary" recommended index={2} title="安排恢复日" description="恢复体能并降低伤病风险" onClick={() => { onRecover(); setDetail(null) }} /></div></> : null}
      {detail === 'trade' ? <><div className="management-risk"><ArrowRightLeft /><span><strong>风险与回报</strong><small>媒体关注上升，野心增加；忠诚与原城市关系下降。</small></span></div><div className="management-sheet-actions split"><PartyChoiceCard compact recommended index={1} title="留队" description="保持球队关系与城市认可" onClick={() => setDetail(null)} /><PartyChoiceCard compact tone="danger" index={2} title="确认申请" description="进入交易评估并重建球队关系" onClick={() => { onTrade(); setDetail(null) }} /></div></> : null}
      {detail === 'retire' ? <div className="management-sheet-actions split"><PartyChoiceCard compact recommended index={1} title="继续征战" description="保留当前生涯并返回球员中心" onClick={() => setDetail(null)} /><PartyChoiceCard compact tone="danger" index={2} title="确认退役" description="结束球员阶段，进入第二人生" onClick={onRetire} /></div> : null}
    </PartyDialog> : null}</AnimatePresence>
    <div className="player-footer-note"><Activity />能力成长由属性潜力、比赛行为、年龄和训练共同决定。<TrendingUp size={16} /></div>
  </div>
}
