import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createSchedule, TEAMS } from '../data/league'
import { createCareerBuild, DEFAULT_ALLOCATION } from '../engine/builderEngine'
import { EMPTY_GAME } from '../engine/careerState'
import type { SaveGame } from '../types'
import { DashboardScreen } from './DashboardScreen'

const makeGame = (): SaveGame => ({
  ...EMPTY_GAME,
  phase: 'career',
  player: createCareerBuild({ name: '测试新秀', hometown: '上海', age: 19, portraitId: 'guard-11', position: 'PG', secondaryPosition: 'SG', height: 188, weight: 82, wingspan: 198, background: '大学明星', focus: 'creator', allocation: { ...DEFAULT_ALLOCATION } }, []),
  team: TEAMS[0],
  teams: TEAMS.map(team => ({ ...team })),
  schedule: createSchedule(TEAMS[0]),
})
const render = (game: SaveGame) => renderToStaticMarkup(<DashboardScreen game={game} onEnterGame={() => {}} onTab={() => {}} onRecover={() => {}} />)

describe('首页展示', () => {
  it('双字名保留40px，长姓名适配独立槽位且保留完整提示', () => {
    const game = makeGame()
    for (const [name, size] of [['林默', 40], ['张子豪', 28], ['欧阳明轩', 21], ['我是一个十个字的球员', 20]] as const) {
      const html = render({ ...game, player: { ...game.player!, name } })
      expect(html).toContain(`title="${name}" style="--home-name-size:${size}px"`)
      expect(html).toContain(`<span>#${game.player!.number}</span>`)
    }
  })

  it('保留标题、赛季和总评的图片资源', () => {
    const html = render(makeGame())
    expect(html).toContain('career-title-v2.png')
    expect(html).toContain('season-glyph-sai-v1.png')
    expect(html).toContain('overall-label-v2-generated.png')
    expect(html).toContain('digits-v3-generated/digit-')
    expect(html).toContain('play-wordmark.png')
  })

  it('资源栏缩写数值，同时保留精确数值的辅助说明', () => {
    const html = render({ ...makeGame(), money: 420000, fans: 12300 })
    expect(html).toContain('42万')
    expect(html).toContain('1.2万')
    expect(html).toContain('aria-description="资产 420,000"')
    expect(html).toContain('aria-description="球迷 12,300"')
  })

  it('状态条在零值和满值时正确显示并限制到合法范围', () => {
    const game = makeGame()
    game.player = { ...game.player!, energy: 0, morale: 110, coachTrust: -5 }
    const html = render(game)
    expect(html).toContain('aria-label="体能" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"')
    expect(html).toContain('aria-label="士气" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"')
    expect(html).toContain('aria-label="教练信任" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"')
    expect(html).toContain('width:0%')
    expect(html).not.toContain('width:4%')
  })

  it('赛季结束不显示虚假的客场标记，保留结算入口', () => {
    const html = render({ ...makeGame(), schedule: [] })
    expect(html).toContain('赛季已经结束')
    expect(html).toContain('结算常规赛')
    expect(html).not.toContain('客场挑战')
    expect(html).not.toContain('主场作战')
  })

  it('没有球员时安全渲染为空', () => {
    expect(render({ ...makeGame(), player: null })).toBe('')
  })
})
