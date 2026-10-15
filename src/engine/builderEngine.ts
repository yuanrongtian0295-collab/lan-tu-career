import { ATTRIBUTE_LABELS } from '../data/playerLibrary'
import { getPlayerPreset } from '../data/playerPresets'
import type { AttributeKey, Attributes, CareerPlayer, Position, TalentInheritance } from '../types'
import type { PlayerPortraitId } from '../data/playerPresets'
import { calculateOverall } from './gameEngine'

export type BuildFocus = 'creator' | 'scorer' | 'shooter' | 'defender' | 'slasher' | 'big'
export type AllocationKey = 'finishing' | 'shooting' | 'playmaking' | 'defense' | 'rebounding' | 'physical' | 'mental'
export type BuildAllocation = Record<AllocationKey, number>

export interface BuilderProfile {
  name: string
  hometown: string
  age: number
  portraitId: PlayerPortraitId
  position: Position
  secondaryPosition: Position
  height: number
  weight: number
  wingspan: number
  background: string
  focus: BuildFocus
  allocation: BuildAllocation
}

export const BUILD_POINT_BUDGET = 24

export const BUILD_FOCUSES: Array<{ id: BuildFocus; name: string; description: string; keys: AttributeKey[] }> = [
  { id: 'creator', name: '持球创造者', description: '挡拆阅读、运控与传球优先', keys: ['ballHandle', 'speedWithBall', 'vision', 'passAccuracy'] },
  { id: 'scorer', name: '三层得分手', description: '中距离、终结和关键球更稳定', keys: ['midRange', 'layup', 'shotStability', 'clutch'] },
  { id: 'shooter', name: '空间射手', description: '无球威胁与远投上限突出', keys: ['threePoint', 'freeThrow', 'shotStability', 'stamina'] },
  { id: 'defender', name: '双向锁链', description: '外线压迫、协防和抢断见长', keys: ['perimeterDefense', 'steal', 'helpDefense', 'stamina'] },
  { id: 'slasher', name: '冲框锋刃', description: '第一步、扣篮与空中终结', keys: ['drivingDunk', 'layup', 'speed', 'vertical'] },
  { id: 'big', name: '禁区支柱', description: '护筐、篮板和低位力量', keys: ['interiorDefense', 'block', 'defensiveRebound', 'strength'] },
]

export const BUILD_ALLOCATION_GROUPS: Array<{ id: AllocationKey; name: string; keys: AttributeKey[] }> = [
  { id: 'finishing', name: '终结', keys: ['closeShot', 'layup', 'drivingDunk', 'standingDunk', 'postControl'] },
  { id: 'shooting', name: '投射', keys: ['midRange', 'threePoint', 'freeThrow', 'shotStability'] },
  { id: 'playmaking', name: '组织', keys: ['passAccuracy', 'vision', 'ballHandle', 'speedWithBall'] },
  { id: 'defense', name: '防守', keys: ['interiorDefense', 'perimeterDefense', 'steal', 'block', 'helpDefense'] },
  { id: 'rebounding', name: '篮板', keys: ['offensiveRebound', 'defensiveRebound'] },
  { id: 'physical', name: '身体', keys: ['speed', 'acceleration', 'strength', 'vertical', 'stamina', 'durability'] },
  { id: 'mental', name: '精神', keys: ['clutch', 'leadership'] },
]

export const DEFAULT_ALLOCATION: BuildAllocation = { finishing: 4, shooting: 4, playmaking: 4, defense: 4, rebounding: 2, physical: 4, mental: 2 }

const allKeys = Object.keys(ATTRIBUTE_LABELS) as AttributeKey[]
const clamp = (value: number, min = 25, max = 99) => Math.round(Math.max(min, Math.min(max, value)))

const POSITION_BONUSES: Record<Position, Partial<Record<AttributeKey, number>>> = {
  PG: { ballHandle: 12, passAccuracy: 11, vision: 11, speedWithBall: 10, acceleration: 8, perimeterDefense: 5, threePoint: 5, interiorDefense: -10, standingDunk: -10 },
  SG: { threePoint: 9, midRange: 8, layup: 7, perimeterDefense: 7, ballHandle: 7, speed: 5, interiorDefense: -7 },
  SF: { layup: 7, drivingDunk: 8, midRange: 7, perimeterDefense: 7, helpDefense: 7, strength: 5 },
  PF: { strength: 9, interiorDefense: 9, defensiveRebound: 9, standingDunk: 8, postControl: 7, block: 6, ballHandle: -5 },
  C: { interiorDefense: 13, block: 12, defensiveRebound: 12, closeShot: 10, standingDunk: 11, strength: 11, speedWithBall: -10, threePoint: -4 },
}

const BACKGROUND_BONUSES: Record<string, Partial<Record<AttributeKey, number>>> = {
  大学明星: { leadership: 6, shotStability: 4, helpDefense: 4 },
  海外新星: { passAccuracy: 5, postControl: 4, freeThrow: 4 },
  发展联盟: { stamina: 6, durability: 5, strength: 3 },
  高中天才: {},
  落选秀逆袭: { clutch: 6, stamina: 4, perimeterDefense: 3 },
  街球出身: { ballHandle: 7, speedWithBall: 5, layup: 4, leadership: -2 },
}

function applyBonuses(attributes: Attributes, bonuses: Partial<Record<AttributeKey, number>>) {
  for (const [key, amount] of Object.entries(bonuses) as Array<[AttributeKey, number]>) attributes[key] += amount
}

export function allocationSpent(allocation: BuildAllocation) {
  return Object.values(allocation).reduce((sum, value) => sum + value, 0)
}

export function physicalTradeoffs(profile: Pick<BuilderProfile, 'height' | 'weight' | 'wingspan'>) {
  const notes: string[] = []
  if (profile.height >= 205) notes.push('高身材提升护筐与近筐，但降低持球速度')
  if (profile.height <= 180) notes.push('小体型提升启动与运控，但对抗终结受限')
  if (profile.weight >= 115) notes.push('大体重强化力量与卡位，消耗更多体能')
  if (profile.wingspan - profile.height >= 14) notes.push('长臂强化防守覆盖，投射与控球略有折损')
  if (!notes.length) notes.push('均衡身体模型，没有明显极端惩罚')
  return notes
}

export function createCareerBuild(profile: BuilderProfile, inheritances: TalentInheritance[]): CareerPlayer {
  const preset = getPlayerPreset(profile.portraitId)
  const attributes = Object.fromEntries(allKeys.map((key) => [key, 50])) as Attributes
  applyBonuses(attributes, POSITION_BONUSES[profile.position])
  applyBonuses(attributes, POSITION_BONUSES[profile.secondaryPosition])
  allKeys.forEach((key) => { attributes[key] -= (POSITION_BONUSES[profile.secondaryPosition][key] ?? 0) * 0.58 })
  applyBonuses(attributes, BACKGROUND_BONUSES[profile.background] ?? {})
  const focus = BUILD_FOCUSES.find((item) => item.id === profile.focus) ?? BUILD_FOCUSES[0]
  focus.keys.forEach((key) => { attributes[key] += 8 })
  BUILD_ALLOCATION_GROUPS.forEach((group) => group.keys.forEach((key) => { attributes[key] += profile.allocation[group.id] * 1.8 }))

  const heightDelta = profile.height - 190
  const weightDelta = profile.weight - 86
  const wingspanDelta = profile.wingspan - profile.height
  attributes.closeShot += heightDelta * 0.13
  attributes.standingDunk += heightDelta * 0.2
  attributes.block += heightDelta * 0.18 + wingspanDelta * 0.22
  attributes.interiorDefense += heightDelta * 0.15 + weightDelta * 0.08
  attributes.defensiveRebound += heightDelta * 0.16 + wingspanDelta * 0.12
  attributes.strength += weightDelta * 0.24
  attributes.speed -= heightDelta * 0.18 + Math.max(0, weightDelta) * 0.08
  attributes.acceleration -= heightDelta * 0.16 + Math.max(0, weightDelta) * 0.1
  attributes.speedWithBall -= heightDelta * 0.15
  attributes.ballHandle -= Math.max(0, wingspanDelta - 8) * 0.12
  attributes.threePoint -= Math.max(0, wingspanDelta - 12) * 0.08
  attributes.durability += Math.min(8, Math.max(-5, weightDelta * 0.08))
  allKeys.forEach((key) => { attributes[key] = clamp(attributes[key]) })

  const potential = Object.fromEntries(allKeys.map((key) => [key, clamp(attributes[key] + 12 + (22 - profile.age) * 2)])) as Attributes
  if (profile.background === '高中天才') allKeys.forEach((key) => { potential[key] = clamp(potential[key] + 4) })
  inheritances.forEach((item) => {
    potential[item.attribute] = Math.max(potential[item.attribute], item.effectiveValue)
    attributes[item.attribute] = Math.max(attributes[item.attribute], clamp(42 + (item.effectiveValue - 42) * 0.7))
  })

  const player: CareerPlayer = {
    id: crypto.randomUUID(), name: profile.name || '林默', age: profile.age, number: preset.number, portraitId: preset.id, hometown: profile.hometown || '上海',
    position: profile.position, secondaryPosition: profile.secondaryPosition, height: profile.height, weight: profile.weight, wingspan: profile.wingspan,
    background: profile.background, archetype: focus.name, overall: 65, attributes, potential, badges: [], inheritances,
    energy: 100, morale: 72, health: 100, coachTrust: 42, role: '轮换新秀', trainingLoad: 0,
    stats: { games: 0, starts: 0, minutes: 0, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fgMade: 0, fgAttempted: 0, threeMade: 0, threeAttempted: 0 },
  }
  player.overall = calculateOverall(player)
  return player
}
