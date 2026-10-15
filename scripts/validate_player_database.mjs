import { readFile, readdir } from 'node:fs/promises'

const root = new URL('../public/data/nba/', import.meta.url)
const readJson = async (name) => JSON.parse(await readFile(new URL(name, root), 'utf8'))
const fail = (message) => { throw new Error(message) }

const metadata = await readJson('metadata.json')
const current = await readJson('current-players.json')
const index = await readJson('player-index.json')
const files = (await readdir(root)).filter((name) => /^history-.*\.json$/.test(name))
const history = await Promise.all(files.map(readJson))
const historyCount = history.reduce((sum, shard) => sum + (shard.cards?.length ?? 0), 0)
const attributeKeys = Object.keys(current.players[0]?.attributes ?? {})

if (current.players.length !== metadata.counts.currentPlayers) fail('现役球员数量与 metadata 不一致')
if (index.players.length !== metadata.counts.identities) fail('历史身份数量与 metadata 不一致')
if (historyCount !== metadata.counts.seasonCards) fail('历史赛季卡数量与 metadata 不一致')
if (new Set(current.players.map((player) => player.id)).size !== current.players.length) fail('现役球员 ID 重复')
if (new Set(current.players.map((player) => player.teamId).filter(Boolean)).size !== 30) fail('现役球队覆盖不足 30 支')
if (attributeKeys.length !== 28) fail(`能力项数量错误：${attributeKeys.length}`)

for (const player of current.players) {
  if (!player.name || player.name.includes('\uFFFD')) fail(`球员姓名编码异常：${player.id}`)
  if (Object.keys(player.attributes).length !== 28) fail(`球员能力项不完整：${player.name}`)
  if (Object.values(player.attributes).some((value) => !Number.isFinite(value) || value < 25 || value > 99)) fail(`球员能力越界：${player.name}`)
  if (!Number.isFinite(player.overall) || player.overall < 45 || player.overall > 99) fail(`球员总评越界：${player.name}`)
}

console.log(JSON.stringify({
  version: metadata.version,
  identities: index.players.length,
  currentPlayers: current.players.length,
  teams: new Set(current.players.map((player) => player.teamId).filter(Boolean)).size,
  seasonCards: historyCount,
  historyShards: files.length,
  attributes: attributeKeys.length,
}, null, 2))
