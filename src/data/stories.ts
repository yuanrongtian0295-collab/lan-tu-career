import type { FeedItem, StoryEvent } from '../types'
import { MENTEE_RELATIONSHIP } from './league'

export const STORY_EVENTS: StoryEvent[] = [
  {
    id: 'mentor-film-room', category: '兄弟情', title: '大哥的第一堂录像课', speaker: '陈骁 · 球队大哥', recurrence: 'career',
    body: '训练结束后，陈骁把你留在录像室。他已经是更衣室里照顾你的大哥，现在想看看你愿不愿意接受更严格的训练要求。',
    choices: [
      { label: '跟大哥完成整套加练', hint: '大量成长与徽章进度；体能压力明显', effects: { energy: -14, coachTrust: 6, mentorXp: 28 }, relationship: { id: 'mentor', trust: 10, respect: 8, intimacy: 5 }, life: { professionalism: 7, nightlife: -3 }, badge: { id: 'surgeon-pass', progress: 32 }, attributes: { vision: 1, passAccuracy: 1 }, flags: ['big-brother-bond'] },
      { label: '先从关键录像课开始', hint: '稳定获得比赛理解，不承担额外伤病风险', effects: { energy: -6, coachTrust: 4, mentorXp: 14 }, relationship: { id: 'mentor', trust: 5, respect: 4 }, life: { professionalism: 3 }, badge: { id: 'help-instinct', progress: 16 }, flags: ['big-brother-bond'] },
      { label: '保留自己的训练节奏', hint: '维持自主性，但大哥会继续观察你的态度', effects: { energy: 4, coachTrust: -2 }, relationship: { id: 'mentor', trust: -4, tension: 4 }, life: { ambition: 4, loyalty: -2 } },
    ],
  },
  {
    id: 'extra-training', category: '训练', title: '凌晨的第二组深蹲', speaker: '体能教练',
    body: '训练师认为你已经达到本周负荷上限，但你的竞争对手刚刚在另一侧球场加练。',
    choices: [
      { label: '追加高强度力量训练', hint: '力量和扣篮成长；18%概率肌肉拉伤', effects: { energy: -18, health: -4, coachTrust: 3 }, attributes: { strength: 2, drivingDunk: 1 }, life: { ambition: 6, risk: 5 }, risk: { chance: 18, label: '肌肉过载', result: '最后一组动作变形，你遭遇轻度腿筋拉伤。', effects: { health: -12, morale: -4 }, injury: { name: '腿筋拉伤', games: 4, severity: 2 } } },
      { label: '改做低强度投篮', hint: '成长较慢，但恢复和投射稳定', effects: { energy: -7, health: 2 }, attributes: { freeThrow: 1, shotStability: 1 }, life: { professionalism: 4 } },
      { label: '结束训练回家休息', hint: '恢复身体；竞争心和教练印象略有下降', effects: { energy: 14, health: 5, coachTrust: -1 }, life: { family: 3, ambition: -2 } },
    ],
  },
  {
    id: 'nightclub-invite', category: '私人生活', title: '客场夜色', speaker: '队友群聊',
    body: '结束三连客后，队友邀请你去当地最热门的俱乐部。门外已经有记者和球迷等待。',
    choices: [
      { label: '包下卡座玩到凌晨', hint: '关系和快乐提升；35%概率被偷拍视频拖入舆论', effects: { energy: -18, morale: 12, money: -28000, fans: 3 }, relationship: { id: 'mentor', intimacy: 4 }, life: { nightlife: 10, professionalism: -5, risk: 5 }, risk: { chance: 35, label: '偷拍视频', result: '凌晨离场的视频登上热搜，球队要求你解释。', effects: { media: -10, coachTrust: -7, city: -4 }, life: { professionalism: -4 } } },
      { label: '只参加球队晚餐', hint: '兼顾更衣室关系与恢复', effects: { energy: -5, morale: 6, media: 1 }, relationship: { id: 'mentor', intimacy: 3 }, life: { loyalty: 3, nightlife: 2 } },
      { label: '回酒店做恢复', hint: '职业形象提升；部分队友觉得你疏远', effects: { energy: 12, health: 3, coachTrust: 4 }, relationship: { id: 'mentor', intimacy: -2, respect: 3 }, life: { professionalism: 6, nightlife: -3 } },
    ],
  },
  {
    id: 'social-criticism', category: '媒体', title: '热搜上的质疑', speaker: '《前瞻》篮球频道',
    body: '你在第四节连续两次出手不中，“新秀是否过度自信”登上热搜。经纪人问你要不要立即回应。',
    choices: [
      { label: '公开承担责任', hint: '媒体与教练认可提升，个人锐气略降', effects: { media: 7, coachTrust: 4, fans: 2, morale: -2 }, life: { professionalism: 5, ambition: -1 } },
      { label: '发布加练照片', hint: '赢得球迷，但额外训练有小概率过载', effects: { media: 2, fans: 5, energy: -8 }, attributes: { shotStability: 1 }, life: { ambition: 4 }, risk: { chance: 12, label: '疲劳累积', result: '连续加练让脚踝出现肿胀，医疗组建议休战。', effects: { health: -8 }, injury: { name: '脚踝炎症', games: 2, severity: 1 } } },
      { label: '强硬反问评论员', hint: '关注度暴涨，同时制造更长的媒体敌意', effects: { media: -8, fans: 9, coachTrust: -3 }, life: { ambition: 5, risk: 4 }, flags: ['media-rivalry'] },
    ],
  },
  {
    id: 'romance-distance', category: '感情', title: '被推迟的约定', speaker: '苏晴',
    body: '你们连续三次因为客场和加练取消见面。苏晴说她理解职业体育，但不想永远只存在于你的空闲时间。',
    choices: [
      { label: '空出一个完整晚上', hint: '关系显著升温，减少一次恢复安排', effects: { energy: -7, morale: 11 }, relationship: { id: 'romance', trust: 9, intimacy: 10, tension: -5 }, life: { family: 8, professionalism: -1 } },
      { label: '邀请她随队去客场', hint: '保持陪伴；25%概率关系被媒体曝光', effects: { morale: 7, money: -12000 }, relationship: { id: 'romance', intimacy: 7 }, life: { family: 5, risk: 2 }, risk: { chance: 25, label: '恋情曝光', result: '机场照片被拍到，私人关系成为赛后发布会焦点。', effects: { media: -3, fans: 5 }, life: { nightlife: 1 } } },
      { label: '请她等到休赛期', hint: '维持职业节奏，但关系裂痕扩大', effects: { morale: -5, coachTrust: 2 }, relationship: { id: 'romance', trust: -8, intimacy: -6, tension: 9 }, life: { ambition: 4, family: -6 } },
    ],
  },
  {
    id: 'rookie-mentee', category: '传承', title: '有人在等你的回答', speaker: '新秀周辰', requirements: { minCareerYear: 3, excludeFlags: ['has-mentee'] },
    body: '球队新秀周辰问你是否愿意每周带他加练。你突然意识到，自己已经成为当年仰望的那类人。',
    choices: [
      { label: '正式带他一起成长', hint: '解锁小弟联系人和长期互动，牺牲个人训练时间', effects: { legacy: 9, city: 4, energy: -7 }, relationship: { id: 'mentee', trust: 8, respect: 6, intimacy: 4 }, relationshipUnlock: MENTEE_RELATIONSHIP, life: { loyalty: 6, family: 2 }, flags: ['has-mentee'] },
      { label: '只提供比赛建议', hint: '维持职业距离，稳定增加领导力', effects: { legacy: 4, coachTrust: 3 }, attributes: { leadership: 1 }, life: { professionalism: 3 } },
      { label: '让他先证明自己', hint: '强化竞争文化，也可能让他疏远', effects: { legacy: 1, media: 3 }, life: { ambition: 5, loyalty: -2 } },
    ],
  },
  {
    id: 'trade-rumor', category: '管理层', title: '交易流言', speaker: '经纪人叶岚',
    body: '一支争冠球队正在询价，而管理层没有明确告诉你是否属于非卖品。叶岚建议你决定公开口径。',
    choices: [
      { label: '强调忠于现在的球队', hint: '本地认可提升，削弱未来谈判空间', effects: { city: 9, fans: 6, media: 2 }, life: { loyalty: 8, ambition: -2 }, flags: ['public-loyalty'] },
      { label: '把一切交给经纪人', hint: '保持弹性，但媒体会持续猜测', effects: { media: -2 }, relationship: { id: 'agent', trust: 5 }, life: { professionalism: 2 } },
      { label: '公开欢迎争冠机会', hint: '全国关注提升，本地球迷强烈不满', effects: { media: 9, city: -11, fans: -4 }, life: { ambition: 9, loyalty: -8 }, flags: ['ring-chaser'] },
    ],
  },
  {
    id: 'family-emergency', category: '家庭', title: '比赛日的未接来电', speaker: '家人',
    body: '家里发生了需要你亲自处理的事情，但今晚是全国直播，也是你第一次进入首发。',
    choices: [
      { label: '立即离队回家', hint: '家庭关系与心理状态改善，失去首发机会', effects: { morale: 8, coachTrust: -8, fans: -2 }, relationship: { id: 'friend', trust: 6 }, life: { family: 10, ambition: -3 } },
      { label: '打完比赛再处理', hint: '保住轮换与曝光，家庭压力增加', effects: { coachTrust: 5, media: 4, morale: -7 }, life: { ambition: 7, family: -7 } },
      { label: '让经纪人安排一切', hint: '花钱解决时间问题；结果可能显得冷漠', effects: { money: -45000, coachTrust: 2 }, relationship: { id: 'agent', trust: 4 }, life: { professionalism: 3, family: -2 } },
    ],
  },
  {
    id: 'brand-deal', category: '商业', title: '第一份个人代言', speaker: '经纪人叶岚',
    body: '两份合同摆在桌上：一家愿意长期陪你成长，另一家给出更高现金但要求制造话题。',
    choices: [
      { label: '签长期合作伙伴', hint: '收入较低，职业形象和城市项目更稳定', effects: { money: 180000, media: 4, city: 3 }, life: { professionalism: 5, loyalty: 3 }, flags: ['stable-brand'] },
      { label: '接受高价争议品牌', hint: '收入暴涨；30%概率爆发品牌舆情', effects: { money: 420000, fans: 4 }, life: { risk: 8, ambition: 5 }, risk: { chance: 30, label: '品牌危机', result: '合作品牌卷入争议，你的沉默被解读为默认立场。', effects: { media: -12, city: -5, money: -60000 }, life: { professionalism: -5 } } },
      { label: '暂时不签约', hint: '保持专注和谈判空间，放弃即时收入', effects: { coachTrust: 3, media: 1 }, life: { professionalism: 5, ambition: 2 } },
    ],
  },
  {
    id: 'locker-conflict', category: '更衣室', title: '训练馆里的争执', speaker: '球队群聊',
    body: '一名老将公开质疑年轻球员不愿防守，所有人都知道他说的是你。球队大哥等你表态。',
    choices: [
      { label: '当面承认并加练防守', hint: '尊重和防守成长，体能下降', effects: { energy: -10, coachTrust: 7, mentorXp: 8 }, relationship: { id: 'mentor', respect: 7 }, attributes: { perimeterDefense: 1, helpDefense: 1 }, life: { professionalism: 6 } },
      { label: '在队内会议解释角色分工', hint: '维护立场，结果取决于更衣室信任', effects: { coachTrust: 1, morale: 3 }, relationship: { id: 'mentor', trust: 2, tension: 2 }, life: { ambition: 3 } },
      { label: '把争执透露给媒体', hint: '获得话题度，严重伤害更衣室', effects: { media: 8, coachTrust: -10, fans: 2 }, relationship: { id: 'mentor', trust: -12, respect: -8, tension: 14 }, life: { loyalty: -9, risk: 6 }, flags: ['locker-leak'] },
    ],
  },
  {
    id: 'mentor-road-room', category: '兄弟情', title: '客场航班最后一排', speaker: '陈骁 · 球队大哥', requirements: { minGames: 8, relationship: { id: 'mentor', minTrust: 52 } },
    body: '连败后的返程航班上，球队大哥把耳机递给你，里面是他整理的失误片段。他没有训话，只问你下一场准备改变什么。',
    choices: [
      { label: '逐个回合听他的判断', hint: '比赛阅读和大哥信任提升，牺牲休息', effects: { energy: -5, mentorXp: 12, coachTrust: 3 }, relationship: { id: 'mentor', trust: 6, respect: 4, intimacy: 3 }, attributes: { vision: 1 }, life: { professionalism: 4 } },
      { label: '先谈更衣室的情绪', hint: '稳定士气与兄弟关系，成长较少', effects: { morale: 7, mentorXp: 5 }, relationship: { id: 'mentor', intimacy: 6, tension: -4 }, life: { loyalty: 5 } },
      { label: '独自消化比赛', hint: '恢复体能并保持自主，大哥觉得你在疏远', effects: { energy: 9, morale: 2 }, relationship: { id: 'mentor', trust: -3, intimacy: -3, tension: 3 }, life: { ambition: 3 } },
    ],
  },
  {
    id: 'mentor-clutch-disagreement', category: '兄弟情', title: '最后一攻该由谁发起', speaker: '陈骁 · 球队大哥', requirements: { minGames: 20, relationship: { id: 'mentor', minRespect: 50 } },
    body: '战术演练中，你和球队大哥对最后一攻的发起方式产生分歧。全队都停下来等你们给出统一答案。',
    choices: [
      { label: '用录像和数据说服他', hint: '成功建立战术话语权，也增加竞争张力', effects: { coachTrust: 4, media: 2 }, relationship: { id: 'mentor', respect: 6, tension: 4 }, attributes: { clutch: 1, vision: 1 }, life: { ambition: 5 } },
      { label: '接受大哥主导并负责终结', hint: '兄弟默契与关键球徽章成长', effects: { mentorXp: 10, morale: 5 }, relationship: { id: 'mentor', trust: 5, intimacy: 3, tension: -3 }, badge: { id: 'clutch', progress: 20 }, life: { loyalty: 4 } },
      { label: '请教练当场裁决', hint: '强化战术纪律，但双方关系略显生硬', effects: { coachTrust: 6 }, relationship: { id: 'coach', trust: 4, respect: 3 }, life: { professionalism: 5 } },
    ],
  },
  {
    id: 'coach-rotation-meeting', category: '教练', title: '轮换表上的铅笔线', speaker: '主教练', requirements: { minGames: 5 },
    body: '主教练把最新轮换表推到你面前。你的名字仍在第二阵容，但旁边留着可以修改的铅笔线。',
    choices: [
      { label: '承诺先做好防守执行', hint: '教练信任稳定提升，防守属性成长', effects: { coachTrust: 8, morale: 2 }, relationship: { id: 'coach', trust: 7, respect: 5, tension: -2 }, attributes: { perimeterDefense: 1, helpDefense: 1 }, life: { professionalism: 6 } },
      { label: '直接争取更多持球权', hint: '展现野心；教练会根据后续表现判断', effects: { coachTrust: 1, media: 2 }, relationship: { id: 'coach', respect: 4, tension: 4 }, attributes: { leadership: 1 }, life: { ambition: 7 } },
      { label: '接受现有角色等待机会', hint: '减少冲突并恢复士气，角色成长较慢', effects: { morale: 6, energy: 4, coachTrust: 2 }, relationship: { id: 'coach', trust: 2, tension: -3 }, life: { loyalty: 3 } },
    ],
  },
  {
    id: 'coach-defense-install', category: '教练', title: '新防守体系的第一块拼图', speaker: '主教练', requirements: { minGames: 12 },
    body: '教练组准备更换防守覆盖方式，并让你在训练中指挥弱侧轮转。一次错误就可能让整套体系失效。',
    choices: [
      { label: '提前背完所有轮转口令', hint: '教练关系、防守阅读和上场稳定性提升', effects: { energy: -8, coachTrust: 9 }, relationship: { id: 'coach', trust: 8, respect: 7 }, attributes: { helpDefense: 2 }, badge: { id: 'help-instinct', progress: 24 }, life: { professionalism: 7 } },
      { label: '只负责自己的对位', hint: '降低个人犯错概率，但教练认为你缺少担当', effects: { coachTrust: -3, energy: 2 }, relationship: { id: 'coach', trust: -4, tension: 5 }, attributes: { perimeterDefense: 1 }, life: { ambition: -1 } },
      { label: '建议简化年轻阵容职责', hint: '领导力和沟通提升，方案可能被否决', effects: { coachTrust: 3, morale: 4 }, relationship: { id: 'coach', respect: 6, tension: 1 }, attributes: { leadership: 1 }, life: { loyalty: 4 } },
    ],
  },
  {
    id: 'coach-closing-lineup', category: '教练', title: '决胜阵容的第五个位置', speaker: '主教练', requirements: { minGames: 25, relationship: { id: 'coach', minTrust: 55 } },
    body: '主教练准备固定决胜阵容，并问你愿意承担控球、盯防箭头人物，还是继续带第二阵容。这个承诺会改变你的比赛职责。',
    choices: [
      { label: '承担最后五分钟控球', hint: '关键球与组织成长，失误压力上升', effects: { coachTrust: 6, media: 4, energy: -5 }, relationship: { id: 'coach', trust: 5, respect: 6 }, attributes: { clutch: 1, ballHandle: 1 }, life: { ambition: 6, risk: 3 }, flags: ['closing-handler'] },
      { label: '主防对方第一得分点', hint: '防守成长与教练尊重显著提升', effects: { coachTrust: 9, energy: -7 }, relationship: { id: 'coach', respect: 8, trust: 5 }, attributes: { perimeterDefense: 2 }, badge: { id: 'chain-lock', progress: 26 }, life: { professionalism: 6 }, flags: ['closing-stopper'] },
      { label: '继续带领第二阵容', hint: '维持球权和阵容平衡，媒体关注较少', effects: { coachTrust: 5, morale: 5 }, relationship: { id: 'coach', trust: 5, tension: -2 }, attributes: { leadership: 1 }, life: { loyalty: 5 }, flags: ['bench-engine'] },
    ],
  },
  {
    id: 'coach-cold-bench', category: '教练', title: '第四节没有叫到你的名字', speaker: '主教练', requirements: { minGames: 15, relationship: { id: 'coach', maxTrust: 55 } },
    body: '你连续第二场在第四节被按在板凳席。赛后教练还没离开办公室，你可以现在敲门，也可以让经纪人出面。',
    choices: [
      { label: '带着录像直接沟通', hint: '有机会修复信任并明确改进方向', effects: { coachTrust: 7, morale: 3 }, relationship: { id: 'coach', trust: 6, respect: 5, tension: -5 }, life: { professionalism: 6 } },
      { label: '让经纪人施加压力', hint: '增加外部筹码，教练关系进一步紧张', effects: { media: 6, coachTrust: -5 }, relationship: { id: 'coach', trust: -6, tension: 9 }, life: { ambition: 7, risk: 4 }, flags: ['agent-pressured-coach'] },
      { label: '沉默并在训练中回应', hint: '消耗体能换取属性和尊重', effects: { energy: -12, coachTrust: 5 }, relationship: { id: 'coach', respect: 7, tension: -1 }, attributes: { shotStability: 1, stamina: 1 }, life: { professionalism: 7 } },
    ],
  },
  {
    id: 'mentee-shooting-slump', category: '小弟互动', title: '小弟把投篮录像发到凌晨', speaker: '周辰 · 你的小弟', requirements: { requireFlags: ['has-mentee'], relationship: { id: 'mentee', minTrust: 1 } },
    body: '周辰连续三场没有命中三分。他把每一次出手剪成视频发给你，问自己是否应该彻底改变投篮动作。',
    choices: [
      { label: '陪他加练并拆解脚步', hint: '小弟信任和你的领导力提升，消耗恢复时间', effects: { energy: -7, legacy: 4 }, relationship: { id: 'mentee', trust: 8, respect: 6, intimacy: 4 }, attributes: { leadership: 1 }, badge: { id: 'locker-glue', progress: 18 }, life: { loyalty: 5 } },
      { label: '告诉他继续相信原动作', hint: '稳定情绪与亲密度，技术帮助有限', effects: { morale: 4, legacy: 2 }, relationship: { id: 'mentee', trust: 5, intimacy: 5, tension: -3 }, life: { family: 3 } },
      { label: '让投篮教练负责', hint: '保持职业边界，小弟尊重不变但略感失落', effects: { energy: 5, coachTrust: 2 }, relationship: { id: 'mentee', trust: -2, intimacy: -3, tension: 3 }, life: { professionalism: 4 } },
    ],
  },
  {
    id: 'mentee-media-mistake', category: '小弟互动', title: '一句话冲上了热搜', speaker: '球队公关', requirements: { requireFlags: ['has-mentee'], minGames: 18 },
    body: '周辰在直播中抱怨上场时间，媒体把矛头转向教练组。公关部门问你是否愿意公开替他解释。',
    choices: [
      { label: '公开承担引导责任', hint: '保护小弟并提升领袖声望，承受媒体压力', effects: { legacy: 5, media: -3, coachTrust: 2 }, relationship: { id: 'mentee', trust: 9, respect: 7 }, life: { loyalty: 7, risk: 3 } },
      { label: '让他亲自道歉', hint: '帮助小弟建立职业边界，关系短期紧张', effects: { coachTrust: 5, media: 3 }, relationship: { id: 'mentee', respect: 6, trust: -2, tension: 5 }, life: { professionalism: 6 } },
      { label: '私下处理拒绝回应', hint: '降低新闻热度，外界继续猜测', effects: { media: -1, morale: 2 }, relationship: { id: 'mentee', trust: 5, intimacy: 3 }, life: { family: 3 } },
    ],
  },
  {
    id: 'mentee-role-competition', category: '小弟互动', title: '小弟进入了你的轮换位置', speaker: '主教练', requirements: { minCareerYear: 4, requireFlags: ['has-mentee'] },
    body: '周辰的成长超出预期，教练准备让他分享你的持球时间。你既是他的引路人，也是最直接的竞争者。',
    choices: [
      { label: '主动教他如何带第二阵容', hint: '传承与小弟关系大幅提升，个人球权下降', effects: { legacy: 8, coachTrust: 6, media: 3 }, relationship: { id: 'mentee', trust: 8, respect: 9, intimacy: 5 }, attributes: { leadership: 1 }, life: { loyalty: 8 } },
      { label: '要求训练中公平竞争', hint: '激发双方上限，也提高关系紧张度', effects: { morale: 4, coachTrust: 3 }, relationship: { id: 'mentee', respect: 6, tension: 7 }, attributes: { clutch: 1 }, life: { ambition: 7 } },
      { label: '要求管理层明确主次', hint: '维护核心地位，伤害小弟信任与球队形象', effects: { media: -5, coachTrust: -4 }, relationship: { id: 'mentee', trust: -10, respect: -5, tension: 12 }, life: { ambition: 8, loyalty: -7 }, flags: ['blocked-mentee-role'] },
    ],
  },
  {
    id: 'medical-load-plan', category: '健康管理', title: '医疗组递来负荷报告', speaker: '球队医疗组', requirements: { minGames: 10 },
    body: '报告显示你的爆发力仍在正常范围，但疲劳指标连续一周亮黄灯。下一场是全国直播，教练把决定权交给你。',
    choices: [
      { label: '主动申请减少训练量', hint: '恢复健康并降低伤病概率，教练认可职业判断', effects: { energy: 14, health: 6, coachTrust: 4 }, relationship: { id: 'coach', trust: 3, respect: 4 }, life: { professionalism: 6, ambition: -1 } },
      { label: '维持计划但缩短出场', hint: '平衡曝光与恢复，短期数据上限下降', effects: { energy: 7, health: 3, media: 1 }, relationship: { id: 'coach', trust: 2 }, life: { professionalism: 4 } },
      { label: '拒绝任何负荷限制', hint: '保持明星姿态；22%概率出现过载伤病', effects: { fans: 5, morale: 4, energy: -8 }, life: { ambition: 7, risk: 7 }, risk: { chance: 22, label: '负荷过载', result: '疲劳在比赛中转化为腿筋不适，医疗组强制你接受检查。', effects: { health: -12, coachTrust: -3 }, injury: { name: '腿筋拉伤', games: 5, severity: 2 } } },
    ],
  },
  {
    id: 'community-court', category: '城市生活', title: '旧球场重新亮灯', speaker: '城市社区基金会',
    body: '球队邀请你为一座翻修后的社区球场揭幕。活动与个人训练时间冲突，但现场会有数百名孩子等待。',
    choices: [
      { label: '全程参加并陪孩子打球', hint: '城市认可和球迷支持显著提升，消耗体能', effects: { city: 9, fans: 7, energy: -6, legacy: 2 }, life: { family: 5, loyalty: 4 } },
      { label: '只完成揭幕和签名', hint: '兼顾训练与社区职责', effects: { city: 5, fans: 3, energy: -2 }, life: { professionalism: 4 } },
      { label: '让品牌团队代为出席', hint: '保留训练时间，但城市认为你缺少诚意', effects: { energy: 8, money: -10000, city: -5, media: -2 }, life: { ambition: 3, loyalty: -3 } },
    ],
  },
  {
    id: 'rival-direct-message', category: '竞争关系', title: '对手发来的私信', speaker: '同届竞争对手', requirements: { minGames: 15 },
    body: '同届竞争对手在赛后发来一句“下次别躲开单挑”。截图已经被他的团队暗示可能公开。',
    choices: [
      { label: '约定下一场正面对决', hint: '关注度和竞争心提升，比赛压力增加', effects: { fans: 6, media: 5, morale: 4 }, life: { ambition: 7, risk: 3 }, flags: ['rookie-rivalry'] },
      { label: '回复只在比分牌上说话', hint: '保持克制并建立职业形象', effects: { media: 5, coachTrust: 3 }, life: { professionalism: 6 } },
      { label: '直接公开整段私信', hint: '热度暴涨；对手关系和联盟印象恶化', effects: { fans: 8, media: -7 }, life: { risk: 8, professionalism: -5 }, flags: ['public-rival-dm'] },
    ],
  },
  {
    id: 'charity-auction', category: '公益商业', title: '慈善晚宴上的最后一件拍品', speaker: '球队基金会',
    body: '慈善晚宴还差最后一笔目标金额。主持人临时询问你是否愿意捐出本赛季第一双比赛鞋。',
    choices: [
      { label: '捐出球鞋并追加善款', hint: '城市、球迷与个人传承提升，减少资产', effects: { money: -60000, city: 7, fans: 6, legacy: 3 }, life: { family: 4, loyalty: 4 } },
      { label: '只捐出签名球鞋', hint: '稳定完成公益责任', effects: { city: 4, fans: 3, media: 2 }, life: { professionalism: 4 } },
      { label: '把机会留给球队大哥', hint: '提升兄弟关系，但个人曝光减少', effects: { media: -1, mentorXp: 5 }, relationship: { id: 'mentor', trust: 4, intimacy: 4 }, life: { loyalty: 5 } },
    ],
  },
  {
    id: 'live-stream-slip', category: '社交平台', title: '直播镜头没有及时关闭', speaker: '经纪人叶岚',
    body: '训练后的个人直播结束时，镜头仍多录了十秒，画面里出现了战术板和队友之间的玩笑。经纪人要求你立即决定处理方式。',
    choices: [
      { label: '删除回放并向球队说明', hint: '降低风险并维护教练关系', effects: { media: 2, coachTrust: 5 }, relationship: { id: 'coach', trust: 4, tension: -2 }, life: { professionalism: 6 } },
      { label: '剪成轻松花絮继续发布', hint: '球迷增长；18%概率泄露战术信息', effects: { fans: 8, media: 4 }, life: { nightlife: 3, risk: 4 }, risk: { chance: 18, label: '战术泄露', result: '对手媒体放大了背景中的战术板，教练组要求你公开道歉。', effects: { coachTrust: -10, media: -6 }, life: { professionalism: -5 } } },
      { label: '让经纪人声明视频被误解', hint: '保持热度，公众可信度可能下降', effects: { media: -3, fans: 3 }, relationship: { id: 'agent', trust: 4 }, life: { risk: 4 } },
    ],
  },
  {
    id: 'arena-autographs', category: '球迷关系', title: '球员通道外还剩一排孩子', speaker: '球馆安保',
    body: '赛后安保提醒大巴即将出发，但球员通道外还有一排孩子举着你的球衣等待签名。',
    choices: [
      { label: '留下给每个人签名', hint: '球迷与城市认可提升，恢复时间减少', effects: { fans: 7, city: 5, energy: -4 }, life: { family: 4 } },
      { label: '签几件后赶上大巴', hint: '平衡球队纪律与球迷关系', effects: { fans: 3, coachTrust: 2 }, life: { professionalism: 3 } },
      { label: '让工作人员寄送签名卡', hint: '消耗资金但不影响恢复', effects: { money: -8000, fans: 4, energy: 5 }, life: { professionalism: 4 } },
    ],
  },
]

export const INITIAL_FEED: FeedItem[] = [
  { id: 'f1', author: '联盟前瞻', handle: '@courtvision', body: '这名新秀在季前训练中展示了超出预期的持球速度。真正的问题是，他能多快赢得教练信任？', time: '12分钟前', tone: 'neutral', likes: 2841, comments: 316 },
  { id: 'f2', author: '主场死忠会', handle: '@homecourt', body: '别急着给年轻人贴标签。主场会让他知道这里如何欢迎愿意防守的人。', time: '38分钟前', tone: 'positive', likes: 1906, comments: 142 },
  { id: 'f3', author: '数据看台', handle: '@numbers', body: '模型预测：如果获得稳定的22分钟，他有68%的概率进入最佳新秀讨论。', time: '1小时前', tone: 'neutral', likes: 1102, comments: 97 },
]
