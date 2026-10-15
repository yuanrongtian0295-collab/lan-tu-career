import type { GameResult, SaveGame, StoryChoice, StoryEvent, StoryRequirements } from '../types'
import { createStoryContext, isStoryEventEligible, storyAvailability } from '../engine/storyRules'

type PlayoffStoryBlueprint = {
  id: string
  category: string
  title: string
  speaker: string
  body: string
  choices: StoryChoice[]
  kind?: 'court' | 'team' | 'offcourt' | 'medical'
  requirements?: StoryRequirements
}

const PLAYOFF_STORY_BLUEPRINTS: PlayoffStoryBlueprint[] = [
  {
    id: 'film-counter', category: '战术', title: '录像里藏着下一场的答案', speaker: '{mentor} · 球队大哥',
    body: '{round}第{game}场结束后，{mentor}留下你逐帧拆解{opponent}的防守。他发现对手正在提前封锁你的第一选择。',
    choices: [
      { label: '重做挡拆阅读顺序', hint: '组织能力与手术刀传球徽章成长，额外消耗体能', effects: { energy: -6, coachTrust: 4, mentorXp: 8 }, relationship: { id: 'mentor', trust: 5, respect: 4 }, attributes: { vision: 1, passAccuracy: 1 }, badge: { id: 'surgeon-pass', progress: 18 }, life: { professionalism: 4 } },
      { label: '要求增加个人单打回合', hint: '关键球和突破成长，但战术纪律下降', effects: { energy: -4, media: 3, coachTrust: -2 }, attributes: { clutch: 1, ballHandle: 1 }, badge: { id: 'first-step', progress: 16 }, life: { ambition: 5, risk: 2 } },
    ],
  },
  {
    id: 'press-spotlight', category: '媒体', title: '全国直播镜头没有关闭', speaker: '赛后发布会',
    body: '{result}之后，记者追问你是否已经准备好成为{team}的季后赛第一责任人。每一句话都会改变外界对你的定位。',
    choices: [
      { label: '公开承担胜负责任', hint: '媒体、教练信任与领袖形象提升，压力同步增加', effects: { media: 6, coachTrust: 4, legacy: 2, morale: -2 }, attributes: { leadership: 1 }, life: { professionalism: 5, ambition: 3 } },
      { label: '把聚光灯留给全队', hint: '更衣室关系和球队士气提升，个人热度较低', effects: { fans: 2, morale: 6, mentorXp: 4 }, relationship: { id: 'mentor', trust: 4, intimacy: 3 }, badge: { id: 'locker-glue', progress: 16 }, life: { loyalty: 5 } },
    ],
  },
  {
    id: 'clutch-reps', category: '训练', title: '终场哨后的最后十球', speaker: '投篮教练',
    body: '球馆已经清空，教练让你模拟落后两分的最后回合。你可以继续加练，也可以把体能留给{round}的下一战。',
    choices: [
      { label: '完成高压十球挑战', hint: '关键球、投篮稳定和关键先生徽章成长；存在疲劳风险', effects: { energy: -12, coachTrust: 3 }, attributes: { clutch: 1, shotStability: 1 }, badge: { id: 'clutch', progress: 24 }, life: { ambition: 5 }, risk: { chance: 16, label: '疲劳过载', result: '最后一组急停让脚踝出现炎症反应，医疗组建议观察。', effects: { health: -8, morale: -2 }, injury: { name: '脚踝炎症', games: 2, severity: 1 } } },
      { label: '结束训练立即恢复', hint: '保存体能和健康，错过额外成长', effects: { energy: 10, health: 4, morale: 2 }, life: { professionalism: 3, risk: -2 } },
    ],
  },
  {
    id: 'defensive-assignment', category: '比赛计划', title: '教练把最难的人交给你', speaker: '球队主教练',
    body: '{opponent}准备让核心连续点名。教练询问你是否愿意改变原有分工，承担下一场最困难的防守任务。',
    choices: [
      { label: '主动领防对手核心', hint: '外线防守、协防和防守徽章成长，体能消耗明显', effects: { energy: -8, coachTrust: 7, fans: 3 }, attributes: { perimeterDefense: 1, helpDefense: 1 }, badge: { id: 'chain-lock', progress: 22 }, life: { professionalism: 4, risk: 2 } },
      { label: '坚持原有对位和进攻职责', hint: '保存体能与进攻状态，教练信任略降', effects: { energy: 4, morale: 3, coachTrust: -3 }, attributes: { shotStability: 1 }, life: { ambition: 3 } },
    ],
  },
  {
    id: 'locker-blame', category: '更衣室', title: '复盘会上没人先开口', speaker: '{mentor} · 球队大哥',
    body: '{result}让更衣室气氛紧绷。一名队友认为你的临场选择打乱了既定战术，所有人都在等你的回应。',
    choices: [
      { label: '承认错误并提出修正方案', hint: '信任、士气和领导力提升', effects: { morale: 6, coachTrust: 5, mentorXp: 6 }, relationship: { id: 'mentor', trust: 6, respect: 5, tension: -4 }, attributes: { leadership: 1 }, badge: { id: 'locker-glue', progress: 20 }, life: { professionalism: 6 } },
      { label: '强调队友也必须执行到位', hint: '个人权威上升，更衣室紧张度提高', effects: { media: 2, morale: -4, coachTrust: -1 }, relationship: { id: 'mentor', respect: 3, tension: 7 }, life: { ambition: 5, loyalty: -3 } },
    ],
  },
  {
    id: 'recovery-night', category: '恢复', title: '冰敷室与录像室只能选一个', speaker: '球队医疗组',
    body: '连续高强度比赛让身体指标下滑，但战术组同时发来一份必须在天亮前看完的{opponent}录像。',
    choices: [
      { label: '优先完成深度恢复', hint: '体能和健康显著恢复，战术准备保持稳定', effects: { energy: 15, health: 7, coachTrust: 1 }, life: { professionalism: 4, risk: -3 } },
      { label: '熬夜完成全部录像分析', hint: '比赛阅读和教练信任提升，恢复不足', effects: { energy: -9, health: -3, coachTrust: 6 }, attributes: { vision: 1, helpDefense: 1 }, badge: { id: 'help-instinct', progress: 18 }, life: { ambition: 4, risk: 3 } },
    ],
  },
  {
    id: 'family-call', category: '家庭', title: '酒店走廊里的家人来电', speaker: '家人',
    body: '家人听出了你声音里的疲惫。他们想陪你聊一会儿，而球队将在二十分钟后开始额外战术会议。',
    choices: [
      { label: '留下来把电话说完', hint: '家庭倾向与士气提升，迟到会降低少量教练信任', effects: { morale: 9, coachTrust: -2 }, life: { family: 8, ambition: -1 } },
      { label: '结束通话准时参加会议', hint: '职业性和战术准备提升，家庭关系承受压力', effects: { coachTrust: 5, morale: -3 }, attributes: { vision: 1 }, life: { professionalism: 6, family: -5 } },
    ],
  },
  {
    id: 'romance-seat', category: '感情', title: '那张一直空着的场边座位', speaker: '苏晴',
    body: '苏晴可以赶来观看下一场，但这意味着你要公开一段此前保持低调的关系。季后赛镜头不会放过任何细节。',
    choices: [
      { label: '邀请她坐到家属席', hint: '亲密和士气提升；恋情可能成为媒体焦点', effects: { morale: 10, fans: 3 }, relationship: { id: 'romance', trust: 6, intimacy: 9, tension: -3 }, life: { family: 6, risk: 2 }, risk: { chance: 28, label: '恋情曝光', result: '转播镜头捕捉到你赛后走向家属席，恋情迅速登上热搜。', effects: { media: -3, fans: 7 }, life: { nightlife: 1 } } },
      { label: '让她等到系列赛结束', hint: '保持专注，感情关系出现裂痕', effects: { coachTrust: 2, morale: -5 }, relationship: { id: 'romance', trust: -6, intimacy: -5, tension: 8 }, life: { ambition: 4, family: -5 } },
    ],
  },
  {
    id: 'brand-moment', category: '商业', title: '经纪人递来一份临时合同', speaker: '经纪人叶岚',
    body: '品牌希望借{round}热度拍摄一支短片，但拍摄时间会占用赛前恢复。经纪人提醒你，季后赛表现也会决定下一份合同。',
    choices: [
      { label: '拒绝拍摄专注系列赛', hint: '职业形象和教练信任提升，放弃即时收入', effects: { coachTrust: 5, media: 2 }, relationship: { id: 'agent', trust: 2 }, life: { professionalism: 6, ambition: 2 } },
      { label: '完成拍摄扩大个人品牌', hint: '获得收入和关注，体能与球队信任下降', effects: { money: 180000, media: 7, fans: 4, energy: -8, coachTrust: -3 }, relationship: { id: 'agent', trust: 6 }, life: { ambition: 5, risk: 3 } },
    ],
  },
  {
    id: 'hostile-crowd', category: '客场', title: '两万人的嘘声写着你的名字', speaker: '客场广播',
    body: '{opponent}球迷在热身时持续针对你。你可以回应，也可以把所有情绪留到比赛开始之后。',
    choices: [
      { label: '示意全场继续加大音量', hint: '球迷热度、关键球和野心提升，风险偏好增加', effects: { fans: 6, media: 5, morale: 4 }, attributes: { clutch: 1 }, badge: { id: 'clutch', progress: 18 }, life: { ambition: 5, risk: 4 } },
      { label: '戴上耳机完成热身流程', hint: '稳定性、职业性和教练信任提升', effects: { coachTrust: 4, morale: 3 }, attributes: { shotStability: 1 }, life: { professionalism: 5, risk: -2 } },
    ],
  },
  {
    id: 'officials-pressure', category: '舆论', title: '争议哨声正在发酵', speaker: '联盟赛后报道',
    body: '最后阶段的判罚引发争议，记者希望你直接评价裁判。球队公关提醒，季后赛罚款和舆论都可能改变系列赛气氛。',
    choices: [
      { label: '克制表达并承担罚球问题', hint: '职业形象、罚球和教练信任提升', effects: { media: 4, coachTrust: 4 }, attributes: { freeThrow: 1 }, life: { professionalism: 6 } },
      { label: '公开质疑判罚尺度', hint: '球迷支持与关注上涨，可能收到罚款', effects: { fans: 8, media: -4, money: -25000 }, life: { risk: 6, ambition: 3 }, flags: ['playoff-officials-rivalry'] },
    ],
  },
  {
    id: 'captain-speech', category: '领袖', title: '赛前一分钟由谁开口', speaker: '{mentor} · 球队大哥',
    body: '{mentor}把更衣室中央的位置让给你。你可以第一次承担季后赛动员，也可以继续观察真正的球队领袖如何控制情绪。',
    choices: [
      { label: '站到中央完成动员', hint: '领导力、传承和更衣室徽章成长', effects: { morale: 8, legacy: 3, coachTrust: 3 }, relationship: { id: 'mentor', respect: 6, trust: 3 }, attributes: { leadership: 1 }, badge: { id: 'locker-glue', progress: 24 }, life: { ambition: 4, loyalty: 4 } },
      { label: '请球队大哥继续讲话', hint: '师徒信任和团队稳定提升，个人领袖成长较少', effects: { morale: 5, mentorXp: 10 }, relationship: { id: 'mentor', trust: 6, intimacy: 3 }, life: { loyalty: 5 } },
    ],
  },
  {
    id: 'lineup-adjustment', category: '轮换', title: '教练准备改变你的比赛位置', speaker: '球队主教练',
    body: '为了破解{opponent}的轮换，教练考虑让你短时间承担不同位置和更多持球任务。这会直接影响下一场的角色评价。',
    choices: [
      { label: '接受临时持球核心职责', hint: '控球、传球与教练信任提升，失误风险上升', effects: { coachTrust: 6, energy: -5 }, attributes: { ballHandle: 1, passAccuracy: 1 }, badge: { id: 'surgeon-pass', progress: 15 }, life: { ambition: 4, risk: 3 } },
      { label: '坚持熟悉角色保证效率', hint: '投篮稳定与士气提升，教练认为你略显保守', effects: { morale: 5, coachTrust: -1 }, attributes: { shotStability: 1 }, life: { professionalism: 3, risk: -2 } },
    ],
  },
  {
    id: 'opponent-trash-talk', category: '对抗', title: '对手把挑衅送到球员通道', speaker: '{opponent}球员',
    body: '对方核心在镜头前说你无法承受{round}强度。回应方式将决定这场个人对抗会停留在球场，还是蔓延到整个系列赛。',
    choices: [
      { label: '在镜头前直接回应', hint: '关注、球迷和野心提升，比赛压力变大', effects: { fans: 7, media: 6, morale: 4 }, attributes: { clutch: 1 }, life: { ambition: 6, risk: 4 }, flags: ['playoff-personal-rivalry'] },
      { label: '拒绝回应只谈球队', hint: '职业性、教练信任和团队关系提升', effects: { coachTrust: 5, media: 2 }, relationship: { id: 'mentor', trust: 3, respect: 3 }, life: { professionalism: 6, loyalty: 3 } },
    ],
  },
  {
    id: 'fan-encounter', category: '城市', title: '酒店门口等着一位小球迷', speaker: '{team}球迷会',
    body: '球队大巴即将出发，一位穿着你号码球衣的小球迷希望得到签名。安保提醒你不能耽误全队行程。',
    choices: [
      { label: '停下完成签名与合照', hint: '球迷、城市认可和传承提升，行程略受影响', effects: { fans: 8, city: 6, legacy: 2, coachTrust: -1 }, life: { loyalty: 5, family: 2 } },
      { label: '让工作人员送出签名球鞋', hint: '兼顾行程与球迷关系，需要承担成本', effects: { fans: 5, city: 3, money: -12000, coachTrust: 2 }, life: { professionalism: 4 } },
    ],
  },
  {
    id: 'rookie-question', category: '传承', title: '年轻队友在深夜敲门', speaker: '球队年轻队友',
    body: '年轻队友因为季后赛失误无法入睡，他希望听听你如何面对压力。你的回应会影响他，也会定义你在更衣室的位置。',
    choices: [
      { label: '陪他复盘并分享经验', hint: '领导力、传承与团队徽章成长，牺牲恢复时间', effects: { energy: -5, legacy: 5, morale: 3 }, attributes: { leadership: 1 }, badge: { id: 'locker-glue', progress: 20 }, life: { loyalty: 5, family: 2 }, flags: ['playoff-mentor-role'] },
      { label: '要求他自己找到答案', hint: '强化竞争文化与个人野心，团队亲密度下降', effects: { coachTrust: 2, morale: -3 }, relationship: { id: 'mentor', tension: 3 }, life: { ambition: 5, loyalty: -2 } },
    ],
  },
  {
    id: 'social-post', category: '社交平台', title: '发送键上停着一句话', speaker: '个人社交账号',
    body: '{result}后，你的评论区迅速失控。经纪人建议发布一条动态，但内容会改变媒体和球迷对你的判断。',
    choices: [
      { label: '发布“系列赛还没有结束”', hint: '球迷、士气和野心提升，外界期待加重', effects: { fans: 6, media: 3, morale: 4 }, life: { ambition: 5 }, flags: ['playoff-public-promise'] },
      { label: '保持沉默关闭社交软件', hint: '减少舆论干扰并恢复体能，媒体热度下降', effects: { energy: 5, media: -2, coachTrust: 2 }, life: { professionalism: 4, risk: -2 } },
    ],
  },
  {
    id: 'medical-warning', category: '健康', title: '医疗数据出现一条黄色警报', speaker: '球队医疗组',
    body: '你的负荷指标接近警戒线。医疗组建议减少下一场的爆发动作，但教练担心这会让{opponent}更大胆地收缩防线。',
    choices: [
      { label: '接受负荷限制方案', hint: '健康和耐久提升，教练信任略降', effects: { health: 7, energy: 8, coachTrust: -2 }, attributes: { durability: 1 }, life: { professionalism: 5, risk: -4 } },
      { label: '坚持完整比赛计划', hint: '教练、球迷和野心提升；存在拉伤风险', effects: { coachTrust: 5, fans: 4, energy: -6 }, life: { ambition: 5, risk: 6 }, risk: { chance: 22, label: '季后赛过载', result: '高负荷动作导致腿筋紧张，医疗组要求重新评估出场时间。', effects: { health: -12, morale: -3 }, injury: { name: '腿筋拉伤', games: 4, severity: 2 } } },
    ],
  },
  {
    id: 'scouting-secret', category: '战术', title: '球探报告里有一页不能外传', speaker: '球队首席球探',
    body: '球探组发现{opponent}在特定阵容下会暴露弱侧空位。教练允许你决定是把它变成个人得分机会，还是团队传导方案。',
    choices: [
      { label: '设计个人终结战术', hint: '突破、近筐终结和得分徽章成长', effects: { coachTrust: 3, energy: -4 }, attributes: { layup: 1, drivingDunk: 1 }, badge: { id: 'iron-finish', progress: 20 }, life: { ambition: 4 } },
      { label: '把弱侧机会分给队友', hint: '视野、传球和团队信任提升', effects: { coachTrust: 5, morale: 5 }, attributes: { vision: 1, passAccuracy: 1 }, badge: { id: 'surgeon-pass', progress: 20 }, life: { loyalty: 4 } },
    ],
  },
  {
    id: 'ownership-expectation', category: '管理层', title: '老板在电梯里问了一个问题', speaker: '{team}管理层',
    body: '管理层希望知道你如何定义这次{round}之旅：一次成长经历，还是必须兑现的争冠窗口。',
    choices: [
      { label: '承诺把球队带到下一轮', hint: '媒体、城市、传承和野心提升，失败压力增加', effects: { media: 6, city: 5, legacy: 3, morale: -2 }, life: { ambition: 7, risk: 3 }, flags: ['playoff-frontoffice-promise'] },
      { label: '强调长期建设与稳定成长', hint: '职业性、忠诚和教练信任提升', effects: { coachTrust: 4, city: 2 }, life: { professionalism: 5, loyalty: 5 } },
    ],
  },
  {
    id: 'free-throw-pressure', category: '关键球', title: '空球馆里只剩罚球声', speaker: '助理教练',
    body: '上一场的细节让教练决定加练关键罚球。你可以在疲劳状态下完成挑战，也可以改用呼吸训练稳定心态。',
    choices: [
      { label: '疲劳状态连续命中二十球', hint: '罚球、稳定和关键投篮徽章成长，消耗体能', effects: { energy: -9, coachTrust: 4 }, attributes: { freeThrow: 1, shotStability: 1 }, badge: { id: 'pressure-shot', progress: 22 }, life: { ambition: 4 } },
      { label: '进行心理与呼吸训练', hint: '关键球、士气和健康提升', effects: { morale: 6, health: 3 }, attributes: { clutch: 1 }, badge: { id: 'clutch', progress: 14 }, life: { professionalism: 4 } },
    ],
  },
  {
    id: 'scouting-leak', category: '危机', title: '战术截图出现在对手记者手机里', speaker: '球队公关总监',
    body: '球队怀疑内部战术资料被泄露。公关总监要求你决定是否公开回应，这会影响更衣室信任和媒体叙事。',
    choices: [
      { label: '内部处理并保护队友', hint: '忠诚、教练信任与更衣室关系提升', effects: { coachTrust: 6, morale: 4 }, relationship: { id: 'mentor', trust: 5, respect: 3 }, life: { loyalty: 6, professionalism: 3 } },
      { label: '公开要求联盟调查', hint: '媒体关注上涨，球队内部紧张加剧', effects: { media: 8, fans: 3, morale: -5 }, relationship: { id: 'mentor', tension: 5 }, life: { risk: 5, ambition: 3 }, flags: ['playoff-leak-investigation'] },
    ],
  },
  {
    id: 'minutes-demand', category: '出场时间', title: '第四节轮换表上少了你的名字', speaker: '球队主教练',
    body: '教练准备调整末节轮换来保护你的体能。你可以接受安排，也可以要求在{round}关键时刻留在场上。',
    choices: [
      { label: '要求打满关键阶段', hint: '教练信任、球迷和关键球提升，体能与健康承压', effects: { coachTrust: 4, fans: 5, energy: -10, health: -3 }, attributes: { clutch: 1, stamina: 1 }, life: { ambition: 6, risk: 5 } },
      { label: '接受轮换并帮助替补准备', hint: '健康、团队士气和领导力提升', effects: { health: 5, energy: 8, morale: 6 }, attributes: { leadership: 1 }, badge: { id: 'locker-glue', progress: 16 }, life: { loyalty: 5, professionalism: 4 } },
    ],
  },
  {
    id: 'weak-side-read', category: '比赛计划', kind: 'court', title: '弱侧底角被放空了三次', speaker: '球队助理教练',
    body: '录像显示{opponent}在你持球突破时总会从弱侧底角协防。下一场的第一套进攻要由你决定如何惩罚它。',
    choices: [
      { label: '提前把球送到底角', hint: '下一场助攻和团队进攻更稳定', effects: { coachTrust: 5, morale: 3 }, attributes: { vision: 1 }, nextGame: { id: 'weak-side-pass', label: '弱侧预判', gamesLeft: 1, usage: -0.02, offense: 2.5, turnoverRisk: -0.3 } },
      { label: '假传后直接攻击篮筐', hint: '下一场个人得分上限更高，但失误风险增加', effects: { fans: 3, coachTrust: 2 }, attributes: { layup: 1 }, nextGame: { id: 'weak-side-drive', label: '假传突破', gamesLeft: 1, usage: 0.04, offense: 2, turnoverRisk: 0.65, fatigue: 2 } },
    ],
  },
  {
    id: 'pace-control', category: '战术', kind: 'court', title: '教练把节奏开关交给你', speaker: '球队主教练',
    body: '{opponent}正在用转换进攻打乱轮换。下一场你需要决定把比赛拖进半场，还是主动提速抢开局。',
    choices: [
      { label: '压低节奏控制每次回合', hint: '失误减少、防守稳定，个人回合略少', effects: { coachTrust: 6 }, nextGame: { id: 'pace-slow', label: '控制节奏', gamesLeft: 1, usage: -0.02, defense: 2, turnoverRisk: -0.55 } },
      { label: '提速冲击对手退防', hint: '进攻和使用率提升，体能消耗增加', effects: { fans: 4, energy: -3 }, nextGame: { id: 'pace-fast', label: '提速冲击', gamesLeft: 1, usage: 0.03, offense: 3, fatigue: 4, injuryRisk: 2 } },
    ],
  },
  {
    id: 'timeout-huddle', category: '更衣室', kind: 'team', title: '暂停时所有人都在等一句话', speaker: '{mentor} · 球队大哥',
    body: '球队刚被打出一波攻势，{mentor}示意你帮助统一下一场的场上沟通。',
    choices: [
      { label: '明确每个人的防守职责', hint: '下一场团队防守和教练信任提升', effects: { coachTrust: 5, morale: 4 }, attributes: { leadership: 1 }, nextGame: { id: 'huddle-defense', label: '暂停防守部署', gamesLeft: 1, defense: 3 } },
      { label: '让大哥稳定更衣室', hint: '默契关系提升，保持当前角色边界', effects: { mentorXp: 8, morale: 5 }, relationship: { id: 'mentor', trust: 5, respect: 3 } },
    ],
  },
  {
    id: 'foul-trouble-counter', category: '比赛计划', kind: 'court', title: '对手核心已经背上犯规压力', speaker: '球队战术组',
    body: '下一战开局可以连续攻击{opponent}核心的防守区域，但这也可能让全队进攻变得过于单一。',
    choices: [
      { label: '开局连续点名制造犯规', hint: '进攻收益更高，失误和消耗同步上升', effects: { coachTrust: 3 }, nextGame: { id: 'foul-attack', label: '点名犯规麻烦', gamesLeft: 1, usage: 0.04, offense: 2.5, turnoverRisk: 0.45, fatigue: 2 } },
      { label: '只在自然错位时攻击', hint: '保持战术均衡与球权流动', effects: { coachTrust: 5, morale: 3 }, nextGame: { id: 'foul-patient', label: '耐心寻找错位', gamesLeft: 1, offense: 1.5, turnoverRisk: -0.35 } },
    ],
  },
  {
    id: 'closeout-plan', category: '战术', kind: 'court', title: '晋级机会只剩四十八分钟', speaker: '球队主教练',
    body: '球队已经拿到系列赛赛点。教练要求你决定下一场是开局压迫，还是把比赛拖入更可靠的执行节奏。',
    requirements: { requireCloseoutGame: true },
    choices: [
      { label: '从第一回合开始施压', hint: '开局进攻提升，体能和伤病风险增加', effects: { fans: 5, energy: -4 }, nextGame: { id: 'closeout-pressure', label: '赛点压迫', gamesLeft: 1, offense: 3.5, fatigue: 4, injuryRisk: 3 } },
      { label: '坚持常规轮换与执行', hint: '防守和失误控制更稳定', effects: { coachTrust: 6 }, nextGame: { id: 'closeout-poise', label: '赛点沉着', gamesLeft: 1, defense: 2.5, turnoverRisk: -0.5 } },
    ],
  },
  {
    id: 'elimination-response', category: '关键球', kind: 'court', title: '再输一场就没有明天', speaker: '{mentor} · 球队大哥',
    body: '球队站在淘汰边缘。{mentor}问你愿意如何改变下一场的场上职责，而不是只说一句漂亮话。',
    requirements: { requireEliminationGame: true },
    choices: [
      { label: '增加持球并主动发起进攻', hint: '使用率与进攻提升，失误和体能风险增加', effects: { morale: 5, coachTrust: 4 }, nextGame: { id: 'elimination-creator', label: '背水一战持球', gamesLeft: 1, usage: 0.05, offense: 4, turnoverRisk: 0.75, fatigue: 4 } },
      { label: '把主要精力放在防守端', hint: '团队防守提升，个人数据可能下降', effects: { coachTrust: 6, morale: 4 }, nextGame: { id: 'elimination-defense', label: '背水一战防守', gamesLeft: 1, usage: -0.03, defense: 4, fatigue: 3 } },
    ],
  },
]

const BLUEPRINT_RULES: Record<string, { kind: 'court' | 'team' | 'offcourt' | 'medical'; dnpSafe?: boolean; limitedSafe?: boolean; requirements?: StoryRequirements }> = {
  'film-counter': { kind: 'team', dnpSafe: true },
  'press-spotlight': { kind: 'offcourt' },
  'clutch-reps': { kind: 'court', requirements: { requiresParticipation: true, minMinutes: 12, availability: ['healthy'] } },
  'defensive-assignment': { kind: 'court', requirements: { requiresParticipation: true, minMinutes: 10, availability: ['healthy'] } },
  'locker-blame': { kind: 'team', dnpSafe: true },
  'recovery-night': { kind: 'medical', dnpSafe: true, limitedSafe: true },
  'family-call': { kind: 'offcourt' },
  'romance-seat': { kind: 'offcourt' },
  'brand-moment': { kind: 'offcourt' },
  'hostile-crowd': { kind: 'court', limitedSafe: true, requirements: { requiresParticipation: true, minMinutes: 6 } },
  'officials-pressure': { kind: 'court', limitedSafe: true, requirements: { requiresParticipation: true, maxScoreMargin: 8 } },
  'captain-speech': { kind: 'team', dnpSafe: true },
  'lineup-adjustment': { kind: 'court', requirements: { requiresParticipation: true, minMinutes: 10, availability: ['healthy'] } },
  'opponent-trash-talk': { kind: 'court', limitedSafe: true, requirements: { requiresParticipation: true, minMinutes: 6 } },
  'fan-encounter': { kind: 'offcourt' },
  'rookie-question': { kind: 'team', dnpSafe: true },
  'social-post': { kind: 'offcourt' },
  'medical-warning': { kind: 'medical', dnpSafe: true, limitedSafe: true },
  'scouting-secret': { kind: 'court', limitedSafe: true, requirements: { requiresParticipation: true, minMinutes: 6 } },
  'ownership-expectation': { kind: 'offcourt' },
  'free-throw-pressure': { kind: 'court', requirements: { requiresParticipation: true, minMinutes: 8, availability: ['healthy'] } },
  'scouting-leak': { kind: 'team', dnpSafe: true },
  'minutes-demand': { kind: 'court', requirements: { requiresParticipation: true, minMinutes: 24, availability: ['healthy'] } },
}

const ROUND_LABELS = ['季后赛', '首轮', '分区半决赛', '分区决赛', '总决赛']

function fill(text: string, context: Record<string, string>) {
  return Object.entries(context).reduce((value, [key, replacement]) => value.replaceAll(`{${key}}`, replacement), text)
}

function hydrateChoice(choice: StoryChoice, context: Record<string, string>): StoryChoice {
  return {
    ...choice,
    label: fill(choice.label, context),
    hint: fill(choice.hint, context),
    effects: { ...choice.effects },
    attributes: choice.attributes ? { ...choice.attributes } : undefined,
    badge: choice.badge ? { ...choice.badge } : undefined,
    relationship: choice.relationship ? { ...choice.relationship } : undefined,
    life: choice.life ? { ...choice.life } : undefined,
    flags: choice.flags ? [...choice.flags] : undefined,
    nextGame: choice.nextGame ? { ...choice.nextGame } : undefined,
    risk: choice.risk ? { ...choice.risk, label: fill(choice.risk.label, context), result: fill(choice.risk.result, context), effects: { ...choice.risk.effects }, life: choice.risk.life ? { ...choice.risk.life } : undefined, injury: choice.risk.injury ? { ...choice.risk.injury } : undefined } : undefined,
  }
}

export function createPlayoffGameStories(current: SaveGame, result: GameResult, round: number, random: () => number = Math.random): StoryEvent[] {
  if (!current.player || !current.team) return []
  const roundLabel = ROUND_LABELS[round] ?? `季后赛第${round}轮`
  const gameNumber = current.schedule.filter((item) => item.played).length || 1
  const textContext = {
    player: current.player.name,
    mentor: current.team.mentor,
    team: `${current.team.city}${current.team.name}`,
    opponent: `${result.opponent.city}${result.opponent.name}`,
    round: roundLabel,
    game: String(gameNumber),
    result: result.win ? '拿下胜利' : '遭遇失利',
  }
  const storyContext = createStoryContext(current, result, 'between-games')
  const availability = storyAvailability(current)
  const queuedIds = new Set([current.pendingStory?.id, ...(current.storyQueue ?? []).map((story) => story.id)].filter(Boolean))
  const hydrated = PLAYOFF_STORY_BLUEPRINTS.map((blueprint) => {
    const rule = BLUEPRINT_RULES[blueprint.id]
    const kind = blueprint.kind ?? rule?.kind ?? 'offcourt'
    const dnpSafe = Boolean(rule?.dnpSafe)
    const limitedSafe = Boolean(rule?.limitedSafe)
    const availabilityRule = dnpSafe ? ['healthy', 'limited', 'medical-dnp', 'season-ending'] as const : limitedSafe ? ['healthy', 'limited'] as const : ['healthy'] as const
    const requirements: StoryRequirements = {
      stages: ['playoffs'],
      availability: [...availabilityRule],
      ...(kind === 'court' ? { requiresParticipation: true, minMinutes: 6 } : {}),
      ...(rule?.requirements ?? {}),
      ...(blueprint.requirements ?? {}),
    }
    const id = `playoff-r${round}-g${gameNumber}-${blueprint.id}`
    const event: StoryEvent = {
      id,
      category: blueprint.category,
      title: fill(blueprint.title, textContext),
      speaker: fill(blueprint.speaker, textContext),
      body: fill(blueprint.body, textContext),
      choices: blueprint.choices.map((choice) => hydrateChoice(choice, textContext)),
      requirements,
      context: storyContext,
    }
    return { blueprint, event, kind, dnpSafe, limitedSafe }
  })
  const available = hydrated.filter(({ event, dnpSafe, limitedSafe }) => {
    if (queuedIds.has(event.id) || current.storyHistory.includes(`${current.seasonYear}:${event.id}`)) return false
    if ((availability === 'medical-dnp' || availability === 'season-ending') && !dnpSafe) return false
    if (availability === 'limited' && event.requirements?.requiresParticipation && !limitedSafe) return false
    return isStoryEventEligible(event, current, storyContext)
  })
  const count = Math.min(available.length, 1 + (random() < 0.58 ? 1 : 0))
  const selected: typeof available = []
  for (let index = 0; index < count; index += 1) {
    const courtStories = available.filter((candidate) => candidate.kind === 'court')
    const preferred = storyContext.participated && availability === 'healthy' && courtStories.length && random() < 0.7 ? courtStories : available
    const candidate = preferred[Math.floor(random() * preferred.length)]
    selected.push(candidate)
    available.splice(available.indexOf(candidate), 1)
  }
  return selected.map(({ event }) => event)
}

export const PLAYOFF_STORY_COUNT = PLAYOFF_STORY_BLUEPRINTS.length
