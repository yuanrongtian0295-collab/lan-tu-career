import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Dna, Minus, Plus, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { ATTRIBUTE_LABELS, effectiveInheritance, randomLibraryPlayer, topAttributes } from '../data/playerLibrary'
import { DEFAULT_PLAYER_PRESET_ID, PLAYER_PRESETS, getPlayerPreset } from '../data/playerPresets'
import { allocationSpent, BUILD_ALLOCATION_GROUPS, BUILD_FOCUSES, BUILD_POINT_BUDGET, createCareerBuild, DEFAULT_ALLOCATION, physicalTradeoffs } from '../engine/builderEngine'
import type { BuildAllocation, BuilderProfile } from '../engine/builderEngine'
import type { AttributeKey, CareerPlayer, LibraryPlayer, Position, TalentInheritance, Team } from '../types'
import { StickerNumber } from '../components/Typography'

const positions: Position[] = ['PG', 'SG', 'SF', 'PF', 'C']
const backgrounds = ['大学明星', '海外新星', '发展联盟', '高中天才', '落选秀逆袭', '街球出身']
type OnboardingStep = 'preset' | 'identity' | 'body' | 'style' | 'draw' | 'draft'

const initialForm: BuilderProfile = {
  name: '林默', hometown: '上海', age: 19, portraitId: DEFAULT_PLAYER_PRESET_ID, position: 'PG', secondaryPosition: 'SG', height: 188, weight: 82, wingspan: 198,
  background: '大学明星', focus: 'creator', allocation: { ...DEFAULT_ALLOCATION },
}

export function OnboardingScreen({ onStart }: { onStart: (player: CareerPlayer, team?: Team) => void }) {
  const [step, setStep] = useState<OnboardingStep>('preset')
  const [form, setForm] = useState<BuilderProfile>(initialForm)
  const [inheritances, setInheritances] = useState<TalentInheritance[]>([])
  const [drawn, setDrawn] = useState<LibraryPlayer>(() => randomLibraryPlayer())
  const [selected, setSelected] = useState<AttributeKey>(() => topAttributes(drawn)[0])
  const [rerolls, setRerolls] = useState(2)
  const preview = useMemo(() => createCareerBuild(form, inheritances), [form, inheritances])
  const sourceOptions = topAttributes(drawn)
  const spent = allocationSpent(form.allocation)
  const preset = getPlayerPreset(form.portraitId)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [step])

  const choosePreset = (id: BuilderProfile['portraitId']) => {
    const next = getPlayerPreset(id)
    setForm({ ...form, portraitId: next.id, position: next.position, secondaryPosition: next.secondaryPosition })
  }

  const reroll = () => {
    if (rerolls <= 0) return
    const next = randomLibraryPlayer(inheritances.map((item) => item.sourceId))
    setDrawn(next); setSelected(topAttributes(next)[0]); setRerolls((value) => value - 1)
  }

  const absorb = () => {
    const entry: TalentInheritance = {
      sourceId: drawn.id, sourceName: drawn.name, attribute: selected, sourceValue: drawn.attributes[selected],
      effectiveValue: effectiveInheritance(drawn, form.position, form.height, selected),
    }
    const nextItems = [...inheritances, entry]
    setInheritances(nextItems)
    if (nextItems.length >= 12) { setStep('draft'); return }
    const next = randomLibraryPlayer(nextItems.map((item) => item.sourceId))
    setDrawn(next); setSelected(topAttributes(next)[0])
  }

  const changeAllocation = (key: keyof BuildAllocation, delta: number) => {
    const nextValue = Math.max(0, Math.min(8, form.allocation[key] + delta))
    const nextSpent = spent - form.allocation[key] + nextValue
    if (nextSpent > BUILD_POINT_BUDGET) return
    setForm({ ...form, allocation: { ...form.allocation, [key]: nextValue } })
  }

  const quickStart = () => {
    const items: TalentInheritance[] = []
    for (let index = 0; index < 12; index += 1) {
      const source = randomLibraryPlayer(items.map((item) => item.sourceId))
      const attribute = topAttributes(source)[index % 3]
      items.push({ sourceId: source.id, sourceName: source.name, attribute, sourceValue: source.attributes[attribute], effectiveValue: effectiveInheritance(source, form.position, form.height, attribute) })
    }
    onStart(createCareerBuild(form, items))
  }

  return <div className={`onboarding builder-v3 step-${step}`}>
    <header className="onboarding-head"><div className="brand large"><span>篮</span><span>途</span></div><button className="text-button" onClick={quickStart}>快速创建</button></header>
    <div className="step-track six">{(['preset', 'identity', 'body', 'style', 'draw', 'draft'] as const).map((id, index, all) => {
      const activeIndex = all.indexOf(step)
      return <i key={id} className={index < activeIndex ? 'done' : index === activeIndex ? 'active' : ''} />
    })}</div>

    {step === 'preset' ? <motion.section className="preset-selection" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <span className="section-index">01 · 球员形象</span><h1>先选定你的球场身份。</h1><p className="setup-lead">选择一张预设球员形象。号码、球衣和角色形象绑定，之后不能手动修改号码。</p>
      <div className="preset-grid" role="list" aria-label="预设球员形象">
        {PLAYER_PRESETS.map((item) => <button type="button" role="listitem" key={item.id} className={`preset-card ${form.portraitId === item.id ? 'selected' : ''}`} style={{ '--preset-accent': item.accent } as CSSProperties} onClick={() => choosePreset(item.id)} aria-pressed={form.portraitId === item.id}>
          <div className="preset-card-top"><span className="preset-number">#<StickerNumber value={item.number} size="hero" /></span><span className="preset-state">{form.portraitId === item.id ? '已选择' : '选择'}</span></div>
          <div className="preset-card-art"><img src={item.image} alt={`${item.label}预设球员`} /></div>
          <div className="preset-card-copy"><strong>{item.label}</strong><span>{item.role}</span><small>{item.description}</small></div>
        </button>)}
      </div>
      <div className="preset-lock-note"><span>号码为预设，不可更改</span><strong>#{preset.number} · {preset.role}</strong></div>
      <button className="primary-button preset-continue" onClick={() => setStep('identity')}>继续创建档案<ChevronRight size={19} /></button>
    </motion.section> : null}

    {step === 'identity' || step === 'body' || step === 'style' ? <section className="builder-showcase" aria-label="已选择的预设球员">
      <div className="builder-showcase-preset-art"><img src={preset.image} alt={`${preset.label}预设球员形象`} /></div>
      <div className="builder-showcase-panel"><span>LOCKED PRESET</span><strong>#{preset.number} · {preset.role}</strong><p>形象与号码已锁定<br />可继续调整比赛属性</p></div>
    </section> : null}

    <AnimatePresence mode="wait">
      {step === 'identity' ? <motion.section key="identity" className="setup-section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <span className="section-index">02 · 身份</span><h1>从一张球员卡开始。</h1><p className="setup-lead">年龄、背景和身份会改变潜力、媒体叙事与初始人际关系。</p>
        <label>球员姓名<input value={form.name} maxLength={10} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <div className="form-row identity-form-row"><label>家乡<input value={form.hometown} maxLength={8} onChange={(event) => setForm({ ...form, hometown: event.target.value })} /></label><div className="fixed-number-field"><span>预设号码</span><strong>#{preset.number}</strong><small>不可更改</small></div></div>
        <Range label="选秀年龄" value={form.age} min={18} max={22} unit="岁" onChange={(age) => setForm({ ...form, age })} />
        <label>成长背景<div className="option-grid">{backgrounds.map((background) => <button type="button" key={background} className={form.background === background ? 'selected' : ''} onClick={() => setForm({ ...form, background })}>{background}</button>)}</div></label>
        <button className="primary-button" onClick={() => setStep('body')}>调整身体数据<ChevronRight size={19} /></button>
      </motion.section> : null}

      {step === 'body' ? <motion.section key="body" className="setup-section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <span className="section-index">03 · 身体与位置</span><h1>每一厘米都有代价。</h1>
        <label>主要位置<div className="position-selector segmented-control segmented-control--compact">{positions.map((position) => <button type="button" key={position} className={form.position === position ? 'selected' : ''} onClick={() => setForm({ ...form, position, secondaryPosition: form.secondaryPosition === position ? positions[(positions.indexOf(position) + 1) % 5] : form.secondaryPosition })}>{position}</button>)}</div></label>
        <label>第二位置<div className="position-selector secondary segmented-control segmented-control--compact">{positions.map((position) => <button type="button" disabled={form.position === position} key={position} className={form.secondaryPosition === position ? 'selected' : ''} onClick={() => setForm({ ...form, secondaryPosition: position })}>{position}</button>)}</div></label>
        <Range label="身高" value={form.height} min={163} max={227} unit="cm" onChange={(height) => setForm({ ...form, height, wingspan: Math.max(height - 3, Math.min(height + 30, form.wingspan)) })} />
        <Range label="体重" value={form.weight} min={58} max={165} unit="kg" onChange={(weight) => setForm({ ...form, weight })} />
        <Range label="臂展" value={form.wingspan} min={Math.max(160, form.height - 3)} max={Math.min(250, form.height + 30)} unit="cm" onChange={(wingspan) => setForm({ ...form, wingspan })} />
        <div className="tradeoff-notes">{physicalTradeoffs(form).map((note) => <p key={note}>{note}</p>)}</div>
        <div className="build-preview"><div><span>预设角色</span><strong>{preset.role}</strong></div><div><span>当前总评</span><strong><StickerNumber value={preview.overall} size="md" /></strong></div></div>
        <button className="primary-button" onClick={() => setStep('style')}>分配能力点<ChevronRight size={19} /></button>
      </motion.section> : null}

      {step === 'style' ? <motion.section key="style" className="setup-section style-builder" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <span className="section-index">04 · 比赛风格</span><h1>决定你怎样赢球。</h1>
        <div className="focus-options">{BUILD_FOCUSES.map((focus) => <button type="button" className={form.focus === focus.id ? 'selected' : ''} key={focus.id} onClick={() => setForm({ ...form, focus: focus.id })}><strong>{focus.name}</strong><small>{focus.description}</small></button>)}</div>
        <div className="allocation-head"><span>能力点</span><strong><StickerNumber value={BUILD_POINT_BUDGET - spent} size="md" /> 剩余</strong></div>
        <div className="allocation-list">{BUILD_ALLOCATION_GROUPS.map((group) => <div key={group.id}><span><strong>{group.name}</strong><small>{group.keys.slice(0, 3).map((key) => ATTRIBUTE_LABELS[key]).join(' · ')}</small></span><div><button type="button" aria-label={`降低${group.name}`} disabled={form.allocation[group.id] <= 0} onClick={() => changeAllocation(group.id, -1)}><Minus /></button><b><StickerNumber value={form.allocation[group.id]} size="sm" /></b><button type="button" aria-label={`提升${group.name}`} disabled={spent >= BUILD_POINT_BUDGET || form.allocation[group.id] >= 8} onClick={() => changeAllocation(group.id, 1)}><Plus /></button></div></div>)}</div>
        <div className="build-preview"><div><span>预设角色</span><strong>{preset.role}</strong></div><div><span>抽取前总评</span><strong><StickerNumber value={preview.overall} size="md" /></strong></div></div>
        <button className="primary-button" disabled={spent !== BUILD_POINT_BUDGET} onClick={() => setStep('draw')}>进入球星抽取<Dna size={19} /></button>
      </motion.section> : null}

      {step === 'draw' ? <motion.section key={`${drawn.id}-${inheritances.length}`} className="draw-section" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="draw-heading"><div><Dna size={19} /><span>球星基因抽取</span></div><strong>第 <StickerNumber value={inheritances.length + 1} size="sm" /> / <StickerNumber value={12} size="sm" /> 次</strong></div>
        <div className="prospect-card"><img src="/assets/prospect-9.png" alt="虚构篮球球员剪影" /><div className="card-shade" /><div className="card-rating"><strong><StickerNumber value={drawn.overall} size="hero" /></strong><span>{drawn.era === 'historic' ? '历史' : '现役'}</span></div><div className="card-copy"><span>{drawn.season} · {drawn.positions.join('/')}</span><h2 className="dynamic-name">{drawn.name}</h2><p>{drawn.archetype}</p></div></div>
        <p className="draw-instruction">选择一项能力继承。跨位置和身体冲突会实时降低有效值。</p>
        <div className="attribute-options">{sourceOptions.map((attribute) => { const effective = effectiveInheritance(drawn, form.position, form.height, attribute); return <button type="button" key={attribute} className={selected === attribute ? 'selected' : ''} onClick={() => setSelected(attribute)}><span><strong>{ATTRIBUTE_LABELS[attribute]}</strong><small>{effective < drawn.attributes[attribute] - 8 ? '跨位折损' : selected === attribute ? '已选择' : '点击选择'}</small></span><span className="source-value"><StickerNumber value={drawn.attributes[attribute]} size="md" /><i>→</i><b><StickerNumber value={effective} size="md" /></b></span></button> })}</div>
        <div className="draw-build"><span>{form.position}/{form.secondaryPosition}</span><span>{form.height}cm</span><span>{preset.label}</span></div>
        <div className="draw-actions"><button type="button" className="secondary-button" disabled={rerolls <= 0} onClick={reroll}><RotateCcw size={17} />重抽 · {rerolls}</button><button type="button" className="primary-button" onClick={absorb}>吸收能力<Sparkles size={18} /></button></div>
      </motion.section> : null}

      {step === 'draft' ? <motion.section key="draft" className="draft-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="draft-seal" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}><ShieldCheck size={44} /></motion.div>
        <span className="section-index">选秀之夜</span><h1>你的球员档案完成了。</h1>
        <div className="final-build"><div className="final-build-portrait"><img src={preset.image} alt={`${preset.label}预设球员`} /></div><div className="overall-shield"><span>总评</span><strong><StickerNumber value={preview.overall} size="hero" /></strong></div><div><h2 className="dynamic-name">{form.name}</h2><p>#{preset.number} · {form.position}/{form.secondaryPosition} · <StickerNumber value={form.height} size="xs" />cm · {preview.archetype}</p><span>{form.background} / {form.hometown} / <StickerNumber value={form.age} size="xs" />岁</span></div></div>
        <div className="inheritance-summary">{inheritances.slice(0, 8).map((item) => <span key={`${item.sourceId}-${item.attribute}`}>{ATTRIBUTE_LABELS[item.attribute]} {item.effectiveValue}</span>)}</div>
        <p className="draft-copy">球队、球队大哥、新秀合同和第一条人物关系将在选秀后生成。</p>
        <button className="primary-button" onClick={() => onStart(preview)}>参加选秀<ChevronRight size={19} /></button>
      </motion.section> : null}
    </AnimatePresence>
  </div>
}

function Range({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) {
  return <label className="range-field"><span>{label}<strong><StickerNumber value={value} size="lg" /><small>{unit}</small></strong></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /><div><span><StickerNumber value={min} size="xs" /></span><span><StickerNumber value={max} size="xs" /></span></div></label>
}
