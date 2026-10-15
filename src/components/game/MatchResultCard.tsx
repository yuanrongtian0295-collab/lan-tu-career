import type { GameResult, Team } from '../../types'

export function MatchResultCard({ team, opponent, result, onCommit }: { team: Team; opponent: Team | null; result: GameResult | null; onCommit: () => void }) {
  return <section className="match-result-card" aria-label="比赛结果">
    <header><strong>比赛结果</strong><span>（比赛结束后显示）</span></header>
    <div className="match-result-score">
      <img src={team.logo} alt={`${team.short} 队徽`} />
      <strong>{result ? `${result.teamScore} - ${result.opponentScore}` : '–'}</strong>
      {opponent ? <img src={opponent.logo} alt={`${opponent.short} 队徽`} /> : <span />}
    </div>
    {result ? <button type="button" onClick={onCommit}>完成比赛并返回首页</button> : null}
  </section>
}
