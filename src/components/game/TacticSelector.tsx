const tactics = [
  {
    id: 'balanced',
    title: '高位挡拆',
    description: '利用挡拆配合撕开防线，创造投篮机会。',
    cost: 10,
    image: '/assets/match-center/tactic-pick-roll.png',
  },
  {
    id: 'pass',
    title: '快速反击',
    description: '加快节奏，利用速度优势打对手措手不及。',
    cost: 8,
    image: '/assets/match-center/tactic-fastbreak.png',
  },
  {
    id: 'attack',
    title: '内线强攻',
    description: '集中火力冲击内线，制造杀伤。',
    cost: 12,
    image: '/assets/match-center/tactic-inside.png',
  },
]

export function TacticSelector({ selected, onSelect, energy, disabled = false }: { selected: string; onSelect: (id: string) => void; energy: number; disabled?: boolean }) {
  const currentEnergy = Math.min(100, Math.max(0, energy))
  return <section className="match-tactics" aria-labelledby="match-tactics-title">
    <header>
      <h2 id="match-tactics-title">战术选择</h2>
      <div className="match-energy"><span>⚡</span> 体力：<strong>{currentEnergy}/100</strong><i><b style={{ width: `${currentEnergy}%` }} /></i></div>
    </header>
    <div className="match-tactic-grid">
      {tactics.map((tactic) => <button
        type="button"
        className={`match-tactic-card ${selected === tactic.id ? 'selected' : ''}`}
        key={tactic.id}
        disabled={disabled}
        aria-pressed={selected === tactic.id}
        onClick={() => onSelect(tactic.id)}
      >
        <strong>{tactic.title}</strong>
        <img src={tactic.image} alt="" />
        <p>{tactic.description}</p>
        <span className="match-tactic-cost"><i>⚡</i>{tactic.cost}</span>
      </button>)}
    </div>
    <p className="match-tactic-tip"><span>ⓘ</span> 提示：战术选择将影响本回合球队表现</p>
  </section>
}
