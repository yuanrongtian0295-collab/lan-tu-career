import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Search, Shield, Sparkles, Trophy, Users } from 'lucide-react'
import { ATTRIBUTE_LABELS, PLAYER_LIBRARY } from '../data/playerLibrary'
import type { Archetype, AttributeKey, Era, Position, SaveGame } from '../types'
import { StickerNumber } from '../components/Typography'

type ArchivePlayer = {
  id: string
  name: string
  active: boolean
  positions: Position[]
  peakOverall: number
  peakSeason: string
}

type LibraryRow = {
  id: string
  name: string
  era: Era
  season: string
  positions: Position[]
  archetype: Archetype
  overall: number
  signature: AttributeKey[]
  status?: string
}

export function LeagueScreen({ game }: { game: SaveGame }) {
  const [view, setView] = useState<'standings' | 'library' | 'rookies'>('standings')
  const [query, setQuery] = useState('')
  const [era, setEra] = useState<'all' | 'current' | 'historic'>('all')
  const [archive, setArchive] = useState<ArchivePlayer[]>([])
  const deferred = useDeferredValue(query)
  const standings = useMemo(() => [...game.teams].sort((a, b) => b.wins - a.wins || b.strength - a.strength), [game.teams])
  useEffect(() => {
    if (view !== 'library' || archive.length) return
    let cancelled = false
    fetch('/data/nba/player-index.json')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('archive unavailable')))
      .then((payload: { players?: ArchivePlayer[] }) => { if (!cancelled) setArchive(payload.players ?? []) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [archive.length, view])
  const currentPlayers = useMemo<LibraryRow[]>(() => (game.league?.players ?? []).filter((player) => !player.retired).map((player) => ({
    id: player.id,
    name: player.name,
    era: 'current',
    season: `${game.seasonYear}-${String(game.seasonYear + 1).slice(2)}`,
    positions: player.positions,
    archetype: player.archetype,
    overall: player.overall,
    signature: (Object.entries(player.attributes) as Array<[AttributeKey, number]>).sort((left, right) => right[1] - left[1]).slice(0, 3).map(([key]) => key),
    status: player.injury ? `${player.injury.name} · 缺阵${player.injury.gamesLeft}场` : `${player.role} · ${player.minutesPerGame}分钟`,
  })), [game.league, game.seasonYear])
  const historicPlayers = useMemo<LibraryRow[]>(() => archive.length ? archive.filter((player) => !player.active).map((player) => ({
    id: player.id,
    name: player.name,
    era: 'historic',
    season: player.peakSeason,
    positions: player.positions,
    archetype: 'allAround',
    overall: player.peakOverall,
    signature: [],
    status: '历史峰值赛季',
  })) : PLAYER_LIBRARY.filter((player) => player.era === 'historic'), [archive])
  const players = useMemo(() => {
    const source = era === 'current' ? currentPlayers : era === 'historic' ? historicPlayers : [...currentPlayers, ...historicPlayers]
    const normalizedQuery = deferred.trim().toLocaleLowerCase()
    return source.filter((player) => !normalizedQuery || player.name.toLocaleLowerCase().includes(normalizedQuery))
  }, [currentPlayers, deferred, era, historicPlayers])
  const rows = view === 'rookies' ? game.generatedRookies : players

  return <div className={`screen league-screen league-v3 view-${view}`}>
    <header className="page-header"><div><span>联盟档案馆</span><h1 className="type-title-fixed">联盟</h1><div className="league-season-strip"><StickerNumber value={`${game.seasonYear}-${String(game.seasonYear + 1).slice(2)}`} size="sm" /><span>赛季</span><b>第 <StickerNumber value={game.careerYear} size="sm" /> 年</b></div></div><Trophy size={28} /></header>
    <div className="segmented segmented-control" role="tablist" aria-label="联盟页面切换">{[['standings', '排名'], ['library', '球星库'], ['rookies', '新秀']].map(([id, label]) => <button role="tab" aria-selected={view === id} key={id} className={view === id ? 'active' : ''} onClick={() => { setView(id as typeof view); setQuery('') }}>{label}</button>)}</div>
    {view === 'standings' ? <>
      <section className="leader-banner"><div><span>联盟第一 · {standings[0].conference}部榜首</span><h2 className="dynamic-name">{standings[0].city}{standings[0].name}</h2><p><StickerNumber value={standings[0].wins} size="sm" />胜 <StickerNumber value={standings[0].losses} size="sm" />负 · 球队强度 <strong><StickerNumber value={standings[0].strength} size="md" /></strong></p></div><div style={{ '--team': standings[0].color } as React.CSSProperties}><img src={standings[0].logo} alt={`${standings[0].englishName} Logo`} /></div></section>
      <div className="standings-table"><div className="table-head"><span>排名 / 球队</span><span>胜负</span><span>近况</span></div>{standings.map((team, index) => <div className={team.id === game.team?.id ? 'my-team' : ''} key={team.id}><b><StickerNumber value={index + 1} size="sm" /></b><i style={{ '--team': team.color } as React.CSSProperties}><img src={team.logo} alt="" /></i><span><strong>{team.city}{team.name}</strong><small>{team.short} · {team.conference}</small></span><span><StickerNumber value={`${team.wins}-${team.losses}`} size="sm" /></span><em><StickerNumber value={team.strength} size="sm" /></em></div>)}</div>
    </> : <>
      <div className="library-tools"><label><Search size={17} /><input placeholder={view === 'rookies' ? '搜索本届新秀' : '搜索现役或历史球员'} value={query} onChange={(event) => setQuery(event.target.value)} /></label>{view === 'library' ? <div className="league-era-tabs segmented-control segmented-control--compact">{[['all', '全部'], ['current', '现役'], ['historic', '历史']].map(([id, label]) => <button className={era === id ? 'active' : ''} onClick={() => setEra(id as typeof era)} key={id}>{label}</button>)}</div> : null}</div>
      <p className="library-notice">{view === 'library' ? `本地数据库：${currentPlayers.length}名动态联盟球员 · ${archive.length || '正在载入'}名历史身份。能力、伤病和轮换随当前存档独立变化。` : `${game.seasonYear}届自动生成新秀，共${game.generatedRookies.length}人。球探报告可能存在误差。`}</p>
      <div className="player-library">{rows.filter((player) => player.name.toLocaleLowerCase().includes(deferred.trim().toLocaleLowerCase())).length === 0 ? <div className="empty-state"><Search /><strong>没有找到匹配球员</strong><p>换一个姓名或清除搜索条件。</p></div> : rows.filter((player) => player.name.toLocaleLowerCase().includes(deferred.trim().toLocaleLowerCase())).slice(0, 80).map((player, index) => <article key={player.id}><div className="library-rank"><StickerNumber value={view === 'rookies' ? index + 1 : player.overall} size="sm" /></div><span className="library-avatar"><Users /></span><div><h3>{player.name}</h3><p>{player.season} · {player.positions.join('/')} · {player.archetype}{'status' in player && player.status ? ` · ${player.status}` : ''}</p><span>{player.signature.map((key) => <small key={key}>{ATTRIBUTE_LABELS[key]}</small>)}</span></div><div className="library-ovr"><strong><StickerNumber value={player.overall} size="md" /></strong><small>总评</small></div></article>)}</div>
    </>}
    {view === 'rookies' ? <div className="generation-note rookie-generation"><img src="/assets/v3-pages/league/draft-ball.png" alt="选秀篮球贴图" /><Sparkles /><span><strong>{game.seasonYear} 选秀大会 · 自动生成新秀中</strong>每年生成位置、性格、潜力和故事均不同的新秀班，避免生涯超过现实年代后出现空白。</span></div> : null}
    {view === 'library' ? <div className="generation-note"><Shield /><span><strong>私人本地模式</strong>真实姓名和球队徽标不代表NBA或2K官方授权；公开发布前可一键切换为授权数据包。</span></div> : null}
  </div>
}
