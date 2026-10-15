import type { Archetype, AttributeKey, Attributes, LibraryPlayer, Position } from '../types'

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  closeShot: '近距离', layup: '突破上篮', drivingDunk: '突破扣篮', standingDunk: '原地扣篮', postControl: '背身控制',
  midRange: '中距离', threePoint: '三分', freeThrow: '罚球', shotStability: '投篮稳定',
  passAccuracy: '传球准确', vision: '传球视野', ballHandle: '控球', speedWithBall: '持球速度',
  interiorDefense: '内线防守', perimeterDefense: '外线防守', steal: '抢断', block: '封盖', helpDefense: '协防判断',
  offensiveRebound: '进攻篮板', defensiveRebound: '防守篮板', speed: '速度', acceleration: '加速度', strength: '力量',
  vertical: '弹跳', stamina: '耐力', durability: '耐久', clutch: '关键球', leadership: '领导力',
}

export const ATTRIBUTE_GROUPS: Array<{ name: string; keys: AttributeKey[] }> = [
  { name: '终结', keys: ['closeShot', 'layup', 'drivingDunk', 'standingDunk', 'postControl'] },
  { name: '投射', keys: ['midRange', 'threePoint', 'freeThrow', 'shotStability'] },
  { name: '组织', keys: ['passAccuracy', 'vision', 'ballHandle', 'speedWithBall'] },
  { name: '防守', keys: ['interiorDefense', 'perimeterDefense', 'steal', 'block', 'helpDefense'] },
  { name: '篮板', keys: ['offensiveRebound', 'defensiveRebound'] },
  { name: '身体', keys: ['speed', 'acceleration', 'strength', 'vertical', 'stamina', 'durability'] },
  { name: '精神', keys: ['clutch', 'leadership'] },
]

const blank = (): Attributes => Object.fromEntries(
  Object.keys(ATTRIBUTE_LABELS).map((key) => [key, 55]),
) as Attributes

const ARCHETYPE_SHAPES: Record<Archetype, Partial<Attributes>> = {
  floorGeneral: { passAccuracy: 94, vision: 96, ballHandle: 90, speedWithBall: 87, threePoint: 82, layup: 84, clutch: 88 },
  scoringGuard: { layup: 92, midRange: 91, threePoint: 88, ballHandle: 92, speedWithBall: 91, acceleration: 92, clutch: 90 },
  twoWayGuard: { perimeterDefense: 94, steal: 91, speed: 90, threePoint: 83, ballHandle: 84, stamina: 93 },
  sharpshooter: { threePoint: 98, midRange: 92, freeThrow: 93, shotStability: 96, speed: 82, clutch: 91 },
  wingScorer: { layup: 91, drivingDunk: 88, midRange: 93, threePoint: 87, ballHandle: 86, clutch: 92 },
  twoWayWing: { perimeterDefense: 95, helpDefense: 90, steal: 88, midRange: 87, threePoint: 84, strength: 86 },
  athleticWing: { drivingDunk: 96, layup: 90, speed: 92, acceleration: 92, strength: 87, vertical: 96, perimeterDefense: 84 },
  allAround: { layup: 91, drivingDunk: 91, midRange: 86, threePoint: 84, passAccuracy: 88, vision: 90, strength: 90, stamina: 94, clutch: 93, leadership: 94 },
  playmakingBig: { closeShot: 94, postControl: 95, passAccuracy: 93, vision: 96, defensiveRebound: 94, strength: 91, midRange: 88 },
  stretchBig: { closeShot: 89, standingDunk: 85, midRange: 90, threePoint: 90, defensiveRebound: 88, block: 82, strength: 85 },
  rimProtector: { interiorDefense: 96, block: 98, helpDefense: 94, defensiveRebound: 95, offensiveRebound: 89, standingDunk: 92, strength: 91 },
  postScorer: { closeShot: 97, standingDunk: 93, postControl: 98, midRange: 85, offensiveRebound: 91, defensiveRebound: 92, strength: 96 },
}

const raw = `
尼古拉·约基奇|current|2025-26|C,PF|playmakingBig|98|vision,postControl,passAccuracy
谢伊·吉尔杰斯-亚历山大|current|2025-26|PG,SG|scoringGuard|98|midRange,layup,clutch
扬尼斯·阿德托昆博|current|2025-26|PF,C|athleticWing|97|drivingDunk,strength,layup
卢卡·东契奇|current|2025-26|PG,SG|floorGeneral|96|vision,ballHandle,clutch
安东尼·爱德华兹|current|2025-26|SG,SF|athleticWing|95|drivingDunk,acceleration,clutch
斯蒂芬·库里|current|2025-26|PG|sharpshooter|95|threePoint,shotStability,clutch
勒布朗·詹姆斯|current|2025-26|SF,PF|allAround|94|leadership,vision,strength
杰森·塔图姆|current|2025-26|SF,PF|twoWayWing|94|threePoint,perimeterDefense,stamina
维克托·文班亚马|current|2025-26|C,PF|rimProtector|96|block,standingDunk,threePoint
凯文·杜兰特|current|2025-26|SF,PF|wingScorer|93|midRange,shotStability,clutch
安东尼·戴维斯|current|2025-26|PF,C|rimProtector|94|interiorDefense,block,closeShot
杰伦·布伦森|current|2025-26|PG|scoringGuard|93|midRange,ballHandle,clutch
多诺万·米切尔|current|2025-26|SG,PG|scoringGuard|93|drivingDunk,threePoint,clutch
泰雷斯·哈利伯顿|current|2025-26|PG|floorGeneral|93|passAccuracy,vision,threePoint
科怀·伦纳德|current|2025-26|SF,SG|twoWayWing|93|perimeterDefense,midRange,steal
凯德·坎宁安|current|2025-26|PG,SG|floorGeneral|92|vision,ballHandle,midRange
乔尔·恩比德|current|2025-26|C|postScorer|94|postControl,closeShot,interiorDefense
卡尔-安东尼·唐斯|current|2025-26|C,PF|stretchBig|92|threePoint,closeShot,defensiveRebound
贾·莫兰特|current|2025-26|PG|athleticWing|91|layup,vertical,speedWithBall
德文·布克|current|2025-26|SG,PG|wingScorer|92|midRange,shotStability,clutch
杰伦·威廉姆斯|current|2025-26|SF,SG|twoWayWing|91|perimeterDefense,layup,midRange
杰伦·布朗|current|2025-26|SG,SF|athleticWing|91|drivingDunk,strength,perimeterDefense
特雷·杨|current|2025-26|PG|floorGeneral|90|vision,threePoint,passAccuracy
凯里·欧文|current|2025-26|PG,SG|scoringGuard|91|ballHandle,layup,clutch
保罗·班凯罗|current|2025-26|PF,SF|wingScorer|90|strength,layup,midRange
埃文·莫布利|current|2025-26|PF,C|rimProtector|90|helpDefense,block,interiorDefense
詹姆斯·哈登|current|2025-26|PG,SG|floorGeneral|89|passAccuracy,ballHandle,threePoint
达龙·福克斯|current|2025-26|PG|scoringGuard|89|speedWithBall,acceleration,layup
多曼塔斯·萨博尼斯|current|2025-26|C,PF|playmakingBig|89|defensiveRebound,passAccuracy,postControl
巴姆·阿德巴约|current|2025-26|C,PF|rimProtector|89|helpDefense,interiorDefense,strength
帕斯卡尔·西亚卡姆|current|2025-26|PF,SF|allAround|88|stamina,layup,helpDefense
劳里·马尔卡宁|current|2025-26|PF,SF|stretchBig|88|threePoint,standingDunk,freeThrow
鲁迪·戈贝尔|current|2025-26|C|rimProtector|88|block,defensiveRebound,interiorDefense
切特·霍姆格伦|current|2025-26|C,PF|rimProtector|89|block,threePoint,helpDefense
斯科蒂·巴恩斯|current|2025-26|SF,PF|allAround|88|vision,helpDefense,strength
弗朗茨·瓦格纳|current|2025-26|SF,SG|wingScorer|89|layup,ballHandle,midRange
阿尔佩伦·申京|current|2025-26|C|playmakingBig|89|postControl,vision,closeShot
泰雷斯·马克西|current|2025-26|PG,SG|scoringGuard|90|speedWithBall,threePoint,layup
拉梅洛·鲍尔|current|2025-26|PG|floorGeneral|88|vision,ballHandle,passAccuracy
锡安·威廉森|current|2025-26|PF|athleticWing|89|strength,drivingDunk,layup
德斯蒙德·贝恩|current|2025-26|SG,SF|sharpshooter|87|threePoint,strength,shotStability
达里厄斯·加兰|current|2025-26|PG|floorGeneral|87|ballHandle,threePoint,passAccuracy
贾马尔·穆雷|current|2025-26|PG,SG|scoringGuard|88|clutch,midRange,ballHandle
小贾伦·杰克逊|current|2025-26|PF,C|rimProtector|88|block,interiorDefense,threePoint
布兰登·英格拉姆|current|2025-26|SF,SG|wingScorer|87|midRange,ballHandle,shotStability
朱·霍勒迪|current|2025-26|PG,SG|twoWayGuard|87|perimeterDefense,strength,leadership
德里克·怀特|current|2025-26|SG,PG|twoWayGuard|87|helpDefense,block,threePoint
克里斯塔普斯·波尔津吉斯|current|2025-26|C,PF|stretchBig|88|threePoint,block,standingDunk
阿门·汤普森|current|2025-26|SF,PG|athleticWing|88|perimeterDefense,vertical,speed
库珀·弗拉格|current|2025-26|SF,PF|twoWayWing|86|helpDefense,block,leadership
迈克尔·乔丹|historic|1990-91|SG,SF|allAround|99|midRange,clutch,perimeterDefense
卡里姆·阿卜杜尔-贾巴尔|historic|1970-71|C|postScorer|99|closeShot,postControl,block
魔术师约翰逊|historic|1986-87|PG,SF|floorGeneral|99|vision,passAccuracy,leadership
拉里·伯德|historic|1985-86|SF,PF|allAround|98|clutch,threePoint,vision
比尔·拉塞尔|historic|1961-62|C|rimProtector|98|defensiveRebound,block,leadership
威尔特·张伯伦|historic|1961-62|C|postScorer|99|standingDunk,strength,stamina
沙奎尔·奥尼尔|historic|1999-00|C|postScorer|98|standingDunk,strength,closeShot
蒂姆·邓肯|historic|2002-03|PF,C|rimProtector|98|postControl,helpDefense,leadership
哈基姆·奥拉朱旺|historic|1993-94|C|rimProtector|98|postControl,block,steal
科比·布莱恩特|historic|2005-06|SG,SF|wingScorer|98|midRange,clutch,shotStability
奥斯卡·罗伯特森|historic|1963-64|PG|allAround|98|vision,strength,layup
杰里·韦斯特|historic|1969-70|PG,SG|scoringGuard|97|clutch,midRange,freeThrow
凯文·加内特|historic|2003-04|PF,C|twoWayWing|97|helpDefense,defensiveRebound,leadership
德克·诺维茨基|historic|2006-07|PF,C|stretchBig|97|midRange,threePoint,clutch
摩西·马龙|historic|1982-83|C|postScorer|97|offensiveRebound,strength,closeShot
朱利叶斯·欧文|historic|1975-76|SF|athleticWing|97|drivingDunk,layup,vertical
大卫·罗宾逊|historic|1993-94|C|rimProtector|97|block,speed,strength
查尔斯·巴克利|historic|1992-93|PF,SF|athleticWing|96|strength,offensiveRebound,layup
卡尔·马龙|historic|1996-97|PF|postScorer|96|strength,stamina,closeShot
约翰·斯托克顿|historic|1989-90|PG|floorGeneral|96|passAccuracy,steal,vision
斯科蒂·皮蓬|historic|1993-94|SF,PG|twoWayWing|96|perimeterDefense,helpDefense,vision
伊塞亚·托马斯|historic|1984-85|PG|floorGeneral|96|ballHandle,vision,clutch
德维恩·韦德|historic|2008-09|SG,PG|athleticWing|97|layup,block,clutch
阿伦·艾弗森|historic|2000-01|SG,PG|scoringGuard|97|ballHandle,acceleration,layup
史蒂夫·纳什|historic|2005-06|PG|floorGeneral|96|vision,passAccuracy,freeThrow
杰森·基德|historic|2001-02|PG|floorGeneral|95|vision,defensiveRebound,perimeterDefense
克里斯·保罗|historic|2007-08|PG|floorGeneral|96|passAccuracy,steal,clutch
詹姆斯·哈登|historic|2017-18|PG,SG|scoringGuard|97|threePoint,ballHandle,passAccuracy
拉塞尔·威斯布鲁克|historic|2016-17|PG|athleticWing|96|speed,vertical,stamina
德怀特·霍华德|historic|2008-09|C|rimProtector|95|standingDunk,block,defensiveRebound
特雷西·麦克格雷迪|historic|2002-03|SG,SF|wingScorer|96|midRange,ballHandle,drivingDunk
文斯·卡特|historic|2000-01|SG,SF|athleticWing|95|drivingDunk,vertical,threePoint
雷·阿伦|historic|2000-01|SG|sharpshooter|94|threePoint,shotStability,stamina
雷吉·米勒|historic|1989-90|SG|sharpshooter|94|threePoint,freeThrow,clutch
加里·佩顿|historic|1995-96|PG|twoWayGuard|95|perimeterDefense,steal,leadership
阿朗佐·莫宁|historic|1998-99|C|rimProtector|94|block,interiorDefense,strength
帕特里克·尤因|historic|1989-90|C|postScorer|95|closeShot,block,midRange
多米尼克·威尔金斯|historic|1985-86|SF|athleticWing|95|drivingDunk,vertical,midRange
埃尔金·贝勒|historic|1961-62|SF|allAround|97|layup,defensiveRebound,clutch
鲍勃·库西|historic|1956-57|PG|floorGeneral|94|vision,ballHandle,passAccuracy
乔治·格文|historic|1979-80|SG,SF|wingScorer|95|layup,midRange,shotStability
里克·巴里|historic|1966-67|SF|wingScorer|96|freeThrow,midRange,clutch
比尔·沃顿|historic|1977-78|C|playmakingBig|95|helpDefense,passAccuracy,defensiveRebound
皮特·马拉维奇|historic|1976-77|SG,PG|scoringGuard|94|ballHandle,vision,midRange
克莱德·德雷克斯勒|historic|1991-92|SG,SF|athleticWing|95|drivingDunk,layup,steal
格兰特·希尔|historic|1996-97|SF,PG|allAround|95|vision,layup,perimeterDefense
安芬尼·哈达威|historic|1995-96|PG,SG|floorGeneral|95|ballHandle,vision,layup
姚明|historic|2006-07|C|postScorer|94|closeShot,freeThrow,postControl
保罗·皮尔斯|historic|2001-02|SF,SG|wingScorer|94|clutch,midRange,threePoint
卡梅隆·安东尼|historic|2012-13|SF,PF|wingScorer|95|midRange,postControl,clutch
马努·吉诺比利|historic|2007-08|SG,PG|scoringGuard|93|layup,passAccuracy,clutch
托尼·帕克|historic|2008-09|PG|scoringGuard|93|speedWithBall,layup,midRange
保罗·加索尔|historic|2010-11|PF,C|playmakingBig|93|postControl,passAccuracy,closeShot
本·华莱士|historic|2003-04|C,PF|rimProtector|93|defensiveRebound,block,strength
克里斯·韦伯|historic|2000-01|PF,C|playmakingBig|94|vision,postControl,defensiveRebound
肖恩·坎普|historic|1995-96|PF,C|athleticWing|93|drivingDunk,vertical,strength
丹尼斯·罗德曼|historic|1991-92|PF,SF|rimProtector|92|defensiveRebound,offensiveRebound,stamina
穆托姆博|historic|1995-96|C|rimProtector|93|block,interiorDefense,defensiveRebound
阿维达斯·萨博尼斯|historic|1995-96|C|playmakingBig|92|passAccuracy,postControl,strength
`.trim()

function clamp(value: number) {
  return Math.max(25, Math.min(99, Math.round(value)))
}

function createAttributes(archetype: Archetype, overall: number, signature: AttributeKey[]): Attributes {
  const attributes = blank()
  const shape = ARCHETYPE_SHAPES[archetype]
  const offset = overall - 90

  for (const key of Object.keys(attributes) as AttributeKey[]) {
    const shaped = shape[key] ?? (key === 'stamina' || key === 'durability' ? 82 : 68)
    attributes[key] = clamp(shaped + offset * 0.72)
  }

  signature.forEach((key, index) => {
    attributes[key] = clamp(Math.max(attributes[key], overall + 1 - index))
  })

  return attributes
}

function slugName(name: string, index: number) {
  return `${name.replace(/[·\s-]/g, '').slice(0, 10)}-${index}`
}

export const PLAYER_LIBRARY: LibraryPlayer[] = raw.split('\n').map((line, index) => {
  const [name, era, season, positionList, archetype, ovr, signatureList] = line.split('|')
  const signature = signatureList.split(',') as AttributeKey[]
  const overall = Number(ovr)
  return {
    id: slugName(name, index),
    name,
    era: era as 'current' | 'historic',
    season,
    positions: positionList.split(',') as Position[],
    archetype: archetype as Archetype,
    overall,
    attributes: createAttributes(archetype as Archetype, overall, signature),
    signature,
  }
})

export const LIBRARY_NOTICE = `私人本地模式内置 ${PLAYER_LIBRARY.length} 个真实现役与历史球员赛季模板。评分为本游戏独立模型，并非NBA或2K官方评分。`

export function randomLibraryPlayer(excludedIds: string[] = [], era: 'all' | 'current' | 'historic' = 'all') {
  const pool = PLAYER_LIBRARY.filter((player) => !excludedIds.includes(player.id) && (era === 'all' || player.era === era))
  const roll = Math.random() * 100
  const maxOverall = roll < 3 ? 99 : roll < 12 ? 97 : roll < 30 ? 94 : roll < 62 ? 90 : 87
  const tier = pool.filter((player) => player.overall <= maxOverall && player.overall >= maxOverall - 3)
  const candidates = tier.length ? tier : pool
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function topAttributes(player: LibraryPlayer, count = 3) {
  const signature = [...player.signature]
  const remaining = (Object.keys(player.attributes) as AttributeKey[])
    .filter((key) => !signature.includes(key))
    .sort((a, b) => player.attributes[b] - player.attributes[a])
  return [...signature, ...remaining].slice(0, count)
}

const positionIndex: Record<Position, number> = { PG: 0, SG: 1, SF: 2, PF: 3, C: 4 }

const universal = new Set<AttributeKey>(['freeThrow', 'stamina', 'durability', 'clutch', 'leadership'])

export function effectiveInheritance(source: LibraryPlayer, targetPosition: Position, height: number, attribute: AttributeKey) {
  const distance = Math.min(...source.positions.map((position) => Math.abs(positionIndex[position] - positionIndex[targetPosition])))
  const compatibility = universal.has(attribute) ? 1 : distance === 0 ? 1 : distance === 1 ? 0.92 : distance === 2 ? 0.84 : 0.72
  let body = 1
  if (height < 178 && ['standingDunk', 'block', 'interiorDefense'].includes(attribute)) body -= 0.1
  if (height > 213 && ['ballHandle', 'speedWithBall', 'perimeterDefense'].includes(attribute)) body -= 0.08
  if (height > 205 && ['standingDunk', 'block', 'defensiveRebound'].includes(attribute)) body += 0.03
  if (height < 185 && ['speed', 'acceleration', 'ballHandle'].includes(attribute)) body += 0.03
  const sourceValue = source.attributes[attribute]
  return clamp(25 + (sourceValue - 25) * compatibility * body)
}
