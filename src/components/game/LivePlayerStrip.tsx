import type { CareerPlayer, Team } from '../../types'
import { getPlayerPreset, portraitIdFromLegacyNumber } from '../../data/playerPresets'

export function LivePlayerStrip({ team, player, points, assists, rebounds, statusText }: { team: Team; player: CareerPlayer; points: number; assists: number; rebounds: number; statusText: string }) {
  const energy = Math.min(100, Math.max(0, player.energy))
  const preset = getPlayerPreset(player.portraitId ?? portraitIdFromLegacyNumber(player.number))
  return <section className="live-player-strip-v6" aria-label="球员实时表现">
    <img className="live-player-team-mark" src={team.logo} alt="" aria-hidden="true" />
    <div className="live-player-portrait"><img src={preset.image} alt={`${preset.label}预设球员`} /></div>
    <div className="match-player-name"><strong>{player.name}</strong><span>{player.position}</span></div>
    <dl className="match-player-stats">
      <div><dt>得分</dt><dd>{points}</dd></div>
      <div><dt>助攻</dt><dd>{assists}</dd></div>
      <div><dt>篮板</dt><dd>{rebounds}</dd></div>
    </dl>
    <div className="live-stamina">
      <span>体力</span>
      <strong>{energy}%</strong>
      <i><b style={{ width: `${energy}%` }} /></i>
      <small>{statusText}</small>
    </div>
  </section>
}
