import { motion } from 'framer-motion'
import {
  ChevronsRight,
  CircleDollarSign,
  Gem,
  HeartPulse,
  MapPin,
  MessageCircleMore,
  Newspaper,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react'
import type { SaveGame } from '../types'
import { OverallDigits } from '../components/OverallDigits'
import { getPlayerPreset, portraitIdFromLegacyNumber } from '../data/playerPresets'
import { injuryRestrictionLabel, normalizeInjuryName } from '../engine/injuryRules'

const numberFormatter = new Intl.NumberFormat('zh-CN')
const compactFormatter = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 })
const formatNumber = (value: number) => numberFormatter.format(Math.max(0, Math.round(value)))
const formatResource = (value: number) => compactFormatter.format(Math.max(0, Math.round(value)))

export function DashboardScreen({
  game,
  onEnterGame,
  onTab,
  onRecover,
}: {
  game: SaveGame
  onEnterGame: () => void
  onTab: (tab: string) => void
  onRecover: () => void
}) {
  if (!game.player || !game.team) return null

  const player = game.player
  // Keep the approved 40px two-character name while reserving a separate
  // number slot. Very long names truncate rather than becoming unreadable.
  const nameUnits = Array.from(player.name).reduce((sum, character) => sum + (/^[\x00-\x7F]$/.test(character) ? .6 : 1), 0)
  const nameFontSize = nameUnits <= 2 ? 40 : Math.max(20, Math.min(40, Math.floor(84 / nameUnits)))
  const preset = getPlayerPreset(player.portraitId ?? portraitIdFromLegacyNumber(player.number))
  const team = game.teams.find((candidate) => candidate.id === game.team?.id) ?? game.team
  const next = game.schedule.find((item) => !item.played) ?? null
  const opponent = next ? game.teams.find((candidate) => candidate.id === next.opponentId) : null
  const seasonLabel = `${game.seasonYear}-${String(game.seasonYear + 1).slice(2)}`
  const canRecover = player.energy < 100 || player.health < 100 || player.trainingLoad > 0 || Boolean(game.injury)
  const homeFeed = game.feed.slice(0, 2).length > 0
    ? game.feed.slice(0, 2)
    : [{
      id: 'home-locker-room-note',
      author: game.relationships[0]?.name ?? team.mentor,
      handle: '@locker_room',
      body: game.relationships[0]?.lastMessage ?? '你的表现得到了更衣室的关注，继续保持。',
      time: '刚刚',
      tone: 'positive' as const,
      likes: 86,
      comments: 12,
    }]

  return (
    <div className="screen dashboard-screen home-v6-screen">
      <section className="home-v6-hero" style={{ '--home-team': team.color, '--home-accent': team.accent } as React.CSSProperties}>
        <div className="home-v6-background" aria-hidden="true" />
        <div className="home-v6-stage">
          <div className="home-v6-top-brush" aria-hidden="true" />

        <div className="home-v6-title">
          <img src="/assets/v3-pages/career-party/career-title-v2.png" alt="生涯中心" />
        </div>

        <div className="home-v6-season" aria-label={`${seasonLabel}赛季，第${game.careerYear}年`}>
          <strong>{seasonLabel}</strong>
          <span className="home-v6-season-label" role="img" aria-label="赛季">
            <img src="/assets/v3-pages/career-party/season-glyph-sai-v1.png" alt="" aria-hidden="true" />
            <img src="/assets/v3-pages/career-party/season-glyph-ji-v1.png" alt="" aria-hidden="true" />
          </span>
          <b>
            <span className="home-v6-season-year-affix" role="img" aria-label="第"><img src="/assets/v3-pages/career-party/season-glyph-di-v1.png" alt="" aria-hidden="true" /></span>
            <strong className="home-v6-season-year-number">{game.careerYear}</strong>
            <span className="home-v6-season-year-affix" role="img" aria-label="年"><img src="/assets/v3-pages/career-party/season-glyph-nian-v1.png" alt="" aria-hidden="true" /></span>
          </b>
        </div>

        <motion.img
          className="home-v6-player-art"
          src={preset.image}
          alt={`${preset.label}预设球员全身形象`}
          initial={{ opacity: 0, x: 18, scale: 1.025 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: .55, ease: [0.22, 1, 0.36, 1] }}
        />

        <div className="home-v6-identity home-v6-paper">
          <strong title={player.name} style={{ '--home-name-size': `${nameFontSize}px` } as React.CSSProperties}>{player.name}</strong>
          <span>#{player.number}</span>
        </div>
        <div className="home-v6-position home-v6-cyan-panel">
          <strong>{player.position}</strong>
          <span>{player.role}</span>
        </div>
        <div className="home-v6-overall home-v6-yellow-panel">
          <img
            className="home-v6-overall-label"
            src="/assets/home-v6/overall-label-v2-generated.png"
            alt=""
            aria-hidden="true"
          />
          <OverallDigits value={player.overall} />
        </div>

          <div className="home-v6-floor-mark" aria-hidden="true" />
        </div>

        <div className="home-v6-resources home-v6-paper" aria-label="球员资源">
          <button disabled={!canRecover} onClick={onRecover} aria-label={canRecover ? '恢复体能' : '体能状态已满'}>
            <Zap aria-hidden="true" /><strong>{Math.round(player.energy)}/100</strong><b aria-hidden="true">＋</b>
          </button>
          <button onClick={() => onTab('player-contract')} aria-label="查看资产" aria-description={`资产 ${formatNumber(game.money)}`} title={`资产 ${formatNumber(game.money)}`}>
            <CircleDollarSign aria-hidden="true" /><strong>{formatResource(game.money)}</strong><b aria-hidden="true">＋</b>
          </button>
          <button onClick={() => onTab('phone-social')} aria-label="查看球迷" aria-description={`球迷 ${formatNumber(game.fans)}`} title={`球迷 ${formatNumber(game.fans)}`}>
            <Gem aria-hidden="true" /><strong>{formatResource(game.fans)}</strong><b aria-hidden="true">＋</b>
          </button>
        </div>

        <div className="home-v6-metrics" aria-label="状态数据">
          <HomeMeter label="体能" value={player.energy} tone="orange" />
          <HomeMeter label="士气" value={player.morale} tone="lime" />
          <HomeMeter label="教练信任" value={player.coachTrust} tone="cyan" />
        </div>
      </section>

      {game.injury ? (
        <button className="home-v6-injury home-v6-paper" onClick={onRecover}>
          <HeartPulse aria-hidden="true" />
          <span><strong>{normalizeInjuryName(game.injury.name)}</strong><small>{injuryRestrictionLabel(game.injury) ? `${injuryRestrictionLabel(game.injury)} · ` : ''}预计缺阵 {game.injury.gamesLeft} 场</small></span>
          <b>康复</b>
        </button>
      ) : null}

      <section className="home-v6-match home-v6-paper" aria-label="下一场比赛">
        <div className="home-v6-match-heading">
          <span><img className="home-v7-next-title" src="/assets/home-v7/next-title.png" alt="下一场" /></span>
          <strong>{game.seasonStage === 'playoffs' ? '季后赛' : '常规赛'} · {seasonLabel}</strong>
        </div>
        <div className="home-v8-match-context">
          <time>{next ? `${next.month}月${next.date}日 · 第${next.gameNumber}场` : '赛季结束'}</time>
          {next ? <b><MapPin aria-hidden="true" />{next.home ? '主场作战' : '客场挑战'}</b> : null}
        </div>

        {opponent ? (
          <div className="home-v6-matchup">
            <HomeV6Team team={team} />
            <div className="home-v6-vs"><strong>VS</strong><span>{next?.home ? 'HOME' : 'AWAY'}</span></div>
            <HomeV6Team team={opponent} />
          </div>
        ) : (
          <div className="home-v6-season-complete"><Trophy aria-hidden="true" /><strong>赛季已经结束</strong><span>结算赛季，继续书写你的生涯。</span></div>
        )}

        <button className="home-v6-play-button home-v6-yellow-panel" onClick={onEnterGame}>
          {opponent
            ? <img className="home-v7-play-wordmark" src="/assets/home-v7/play-wordmark.png" alt="进入比赛" />
            : <span>{game.seasonStage === 'regular' ? '结算常规赛' : '进入休赛期'}</span>}
          {!opponent && <small>开启生涯下一章</small>}
          <ChevronsRight aria-hidden="true" />
        </button>
      </section>

      <section className="home-v6-feed home-v6-paper" aria-label="最新动态">
        <div className="home-v6-feed-heading"><h2><img src="/assets/home-v7/feed-title.png" alt="最新动态" /></h2><button onClick={() => onTab('phone-social')}>更多 <ChevronsRight aria-hidden="true" /></button></div>
        <div className="home-v6-feed-list">
          {homeFeed.map((item, index) => (
            <button key={item.id} onClick={() => onTab('phone-social')}>
              <span className={`home-v6-feed-icon ${index === 0 ? 'lime' : 'cyan'}`}>
                {index === 0 ? <TrendingUp aria-hidden="true" /> : index === 1 ? <Newspaper aria-hidden="true" /> : <MessageCircleMore aria-hidden="true" />}
              </span>
              <span><strong>{item.author}</strong><small>{item.body}</small></span>
              <time>{item.time}</time>
            </button>
          ))}
        </div>
      </section>

      <div className="home-v6-bottom-spacer" aria-hidden="true" />
    </div>
  )
}

function HomeMeter({ label, value, tone }: { label: string; value: number; tone: 'orange' | 'lime' | 'cyan' }) {
  const meterValue = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={`home-v6-meter ${tone}`}>
      <span>{label}</span>
      <strong>{meterValue}</strong>
      <i role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={meterValue}><b style={{ width: `${meterValue}%` }} /></i>
    </div>
  )
}

function HomeV6Team({ team }: { team: SaveGame['teams'][number] }) {
  return (
    <div className="home-v6-team">
      <img src={team.logo} alt={`${team.city}${team.name} Logo`} />
      <strong>{team.short}</strong>
      <span>{team.wins}-{team.losses}</span>
      <small>{team.city}{team.name}</small>
    </div>
  )
}
