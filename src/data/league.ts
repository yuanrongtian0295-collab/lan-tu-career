import type { AwardRace, Badge, Relationship, Team } from '../types'

const teamRows = [
  ['1610612737', '亚特兰大', '老鹰', 'Atlanta Hawks', 'ATL', '东部', '#E03A3E', '#FDB927', 84, 101, '杰伦·约翰逊'],
  ['1610612738', '波士顿', '凯尔特人', 'Boston Celtics', 'BOS', '东部', '#007A33', '#BA9653', 94, 98, '杰森·塔图姆'],
  ['1610612751', '布鲁克林', '篮网', 'Brooklyn Nets', 'BKN', '东部', '#FFFFFF', '#A7A8A9', 78, 99, '迈克尔·波特 Jr.'],
  ['1610612766', '夏洛特', '黄蜂', 'Charlotte Hornets', 'CHA', '东部', '#1D1160', '#00788C', 80, 101, '布兰登·米勒'],
  ['1610612741', '芝加哥', '公牛', 'Chicago Bulls', 'CHI', '东部', '#CE1141', '#000000', 81, 102, '约什·吉迪'],
  ['1610612739', '克利夫兰', '骑士', 'Cleveland Cavaliers', 'CLE', '东部', '#860038', '#FDBB30', 93, 100, '多诺万·米切尔'],
  ['1610612765', '底特律', '活塞', 'Detroit Pistons', 'DET', '东部', '#C8102E', '#1D42BA', 89, 99, '凯德·坎宁安'],
  ['1610612754', '印第安纳', '步行者', 'Indiana Pacers', 'IND', '东部', '#002D62', '#FDBB30', 88, 104, '泰瑞斯·哈利伯顿'],
  ['1610612748', '迈阿密', '热火', 'Miami Heat', 'MIA', '东部', '#98002E', '#F9A01B', 91, 97, '扬尼斯·阿德托昆博'],
  ['1610612749', '密尔沃基', '雄鹿', 'Milwaukee Bucks', 'MIL', '东部', '#00471B', '#EEE1C6', 82, 99, '瑞安·罗林斯'],
  ['1610612752', '纽约', '尼克斯', 'New York Knicks', 'NYK', '东部', '#006BB6', '#F58426', 92, 97, '杰伦·布伦森'],
  ['1610612753', '奥兰多', '魔术', 'Orlando Magic', 'ORL', '东部', '#0077C0', '#C4CED4', 88, 96, '保罗·班凯罗'],
  ['1610612755', '费城', '76人', 'Philadelphia 76ers', 'PHI', '东部', '#006BB6', '#ED174C', 86, 98, '泰瑞斯·马克西'],
  ['1610612761', '多伦多', '猛龙', 'Toronto Raptors', 'TOR', '东部', '#CE1141', '#B4975A', 84, 100, '斯科蒂·巴恩斯'],
  ['1610612764', '华盛顿', '奇才', 'Washington Wizards', 'WAS', '东部', '#002B5C', '#E31837', 79, 101, '德安德烈·艾顿'],
  ['1610612742', '达拉斯', '独行侠', 'Dallas Mavericks', 'DAL', '西部', '#00538C', '#B8C4CA', 86, 98, '库珀·弗拉格'],
  ['1610612743', '丹佛', '掘金', 'Denver Nuggets', 'DEN', '西部', '#0E2240', '#FEC524', 94, 97, '尼古拉·约基奇'],
  ['1610612744', '金州', '勇士', 'Golden State Warriors', 'GSW', '西部', '#1D428A', '#FFC72C', 88, 103, '斯蒂芬·库里'],
  ['1610612745', '休斯顿', '火箭', 'Houston Rockets', 'HOU', '西部', '#CE1141', '#C4CED4', 92, 99, '凯文·杜兰特'],
  ['1610612746', '洛杉矶', '快船', 'LA Clippers', 'LAC', '西部', '#C8102E', '#1D428A', 86, 96, '科怀·伦纳德'],
  ['1610612747', '洛杉矶', '湖人', 'Los Angeles Lakers', 'LAL', '西部', '#552583', '#FDB927', 90, 100, '卢卡·东契奇'],
  ['1610612763', '孟菲斯', '灰熊', 'Memphis Grizzlies', 'MEM', '西部', '#5D76A9', '#12173F', 84, 102, '贾·莫兰特'],
  ['1610612750', '明尼苏达', '森林狼', 'Minnesota Timberwolves', 'MIN', '西部', '#0C2340', '#78BE20', 92, 98, '拉梅洛·鲍尔'],
  ['1610612740', '新奥尔良', '鹈鹕', 'New Orleans Pelicans', 'NOP', '西部', '#0C2340', '#C8102E', 81, 99, '特雷·墨菲三世'],
  ['1610612760', '俄克拉荷马城', '雷霆', 'Oklahoma City Thunder', 'OKC', '西部', '#007AC1', '#EF3B24', 97, 102, '谢伊·吉尔杰斯-亚历山大'],
  ['1610612756', '菲尼克斯', '太阳', 'Phoenix Suns', 'PHX', '西部', '#1D1160', '#E56020', 85, 101, '德文·布克'],
  ['1610612757', '波特兰', '开拓者', 'Portland Trail Blazers', 'POR', '西部', '#E03A3E', '#FFFFFF', 83, 99, '德尼·阿夫迪亚'],
  ['1610612758', '萨克拉门托', '国王', 'Sacramento Kings', 'SAC', '西部', '#5A2D81', '#63727A', 84, 101, '多曼塔斯·萨博尼斯'],
  ['1610612759', '圣安东尼奥', '马刺', 'San Antonio Spurs', 'SAS', '西部', '#C4CED4', '#FFFFFF', 91, 100, '维克托·文班亚马'],
  ['1610612762', '犹他', '爵士', 'Utah Jazz', 'UTA', '西部', '#6CACE4', '#F9A01B', 80, 100, '劳里·马尔卡宁'],
] as const

export const TEAMS: Team[] = teamRows.map((row) => ({
  id: row[0], nbaId: row[0], city: row[1], name: row[2], englishName: row[3], short: row[4],
  conference: row[5] as '东部' | '西部', color: row[6], accent: row[7], strength: row[8], pace: row[9],
  logo: `/logos/${row[4].toLowerCase()}.svg`, mentor: row[10], wins: 0, losses: 0,
}))

export const BASE_BADGES: Badge[] = [
  { id: 'iron-finish', name: '强硬终结', category: '终结', level: 1, progress: 22, description: '对抗后的上篮和近筐命中更稳定。' },
  { id: 'air-adjust', name: '空中调整', category: '终结', level: 0, progress: 8, description: '在空中改变动作，避开护筐者。' },
  { id: 'deep-threat', name: '超远威胁', category: '投射', level: 0, progress: 14, description: '扩大防守必须尊重的投射范围。' },
  { id: 'pressure-shot', name: '高压投手', category: '投射', level: 1, progress: 35, description: '比分胶着时减少投篮波动。' },
  { id: 'first-step', name: '第一步爆发', category: '组织', level: 1, progress: 48, description: '启动瞬间更容易撕开第一道防线。' },
  { id: 'surgeon-pass', name: '手术刀传球', category: '组织', level: 0, progress: 29, description: '提高高难度传球的到位率。' },
  { id: 'chain-lock', name: '外线锁链', category: '防守', level: 0, progress: 12, description: '持续压迫持球人的运球空间。' },
  { id: 'help-instinct', name: '协防直觉', category: '防守', level: 0, progress: 18, description: '更早识别突破和空切。' },
  { id: 'clutch', name: '大场面球员', category: '精神', level: 0, progress: 5, description: '关键比赛中提升专注和稳定。' },
  { id: 'locker-glue', name: '更衣室纽带', category: '精神', level: 0, progress: 11, description: '冲突事件中更容易保护球队关系。' },
]

export const INITIAL_RELATIONSHIPS: Relationship[] = [
  { id: 'mentor', name: '球队领袖', role: '球队大哥 · 核心球员', avatar: '队', trust: 62, respect: 56, intimacy: 38, tension: 6, unread: 1, lastMessage: '明天的挡拆我们再多练几次，我会把球传到你最舒服的位置。', messages: [{ id: 'mentor-1', from: 'contact', body: '欢迎来到联盟。训练结束后来找我，我们先从录像开始。', time: '选秀夜' }] },
  { id: 'coach', name: '主教练', role: '球队主教练', avatar: '教', trust: 48, respect: 52, intimacy: 12, tension: 14, unread: 0, lastMessage: '防守决定你下一场能打多久。', messages: [{ id: 'coach-1', from: 'contact', body: '你的上场时间不是固定的，执行力会改变轮换。', time: '训练营' }] },
  { id: 'agent', name: '叶岚', role: '经纪人', avatar: '叶', trust: 71, respect: 65, intimacy: 42, tension: 2, unread: 1, lastMessage: '有两个品牌想聊，但我建议先把轮换位置坐稳。', messages: [{ id: 'agent-1', from: 'contact', body: '合同已经签好。球场外的每一次表态也会改变你的价值。', time: '选秀夜' }] },
  { id: 'friend', name: '韩野', role: '童年好友', avatar: '韩', trust: 86, respect: 70, intimacy: 82, tension: 1, unread: 0, lastMessage: '别装大明星，休赛日上线打游戏。', messages: [{ id: 'friend-1', from: 'contact', body: '你进NBA了，但别忘了以前凌晨两点的露天球场。', time: '昨天' }] },
  { id: 'romance', name: '苏晴', role: '纪录片制片人', avatar: '苏', trust: 40, respect: 58, intimacy: 34, tension: 8, unread: 0, lastMessage: '你的故事不应该只剩下比分。', messages: [{ id: 'romance-1', from: 'contact', body: '等你客场回来，我们找一个没有镜头的晚上。', time: '昨天' }] },
]

export const MENTEE_RELATIONSHIP: Relationship = {
  id: 'mentee', name: '周辰', role: '球队新秀 · 你的小弟', avatar: '周',
  trust: 58, respect: 64, intimacy: 36, tension: 4, unread: 1,
  lastMessage: '哥，明天训练结束后能不能再陪我练半小时？',
  messages: [{ id: 'mentee-1', from: 'contact', body: '谢谢你愿意带我。我会先把你教的每个细节做到位。', time: '刚刚' }],
}

export const INITIAL_AWARDS: AwardRace[] = [
  { name: 'MVP', leader: '等待赛季开始', score: 0, playerRank: 0 },
  { name: '得分王', leader: '等待赛季开始', score: 0, playerRank: 0 },
  { name: '助攻王', leader: '等待赛季开始', score: 0, playerRank: 0 },
  { name: '抢断王', leader: '等待赛季开始', score: 0, playerRank: 0 },
  { name: '篮板王', leader: '等待赛季开始', score: 0, playerRank: 0 },
  { name: '三分王', leader: '等待赛季开始', score: 0, playerRank: 0 },
  { name: '防守一阵（DPOY）', leader: '等待赛季开始', score: 0, playerRank: 0 },
  { name: '防守二阵', leader: '等待赛季开始', score: 0, playerRank: 0 },
  { name: '最佳阵容一阵', leader: '等待赛季开始', score: 0, playerRank: 0 },
  { name: '最佳阵容二阵', leader: '等待赛季开始', score: 0, playerRank: 0 },
  { name: '最佳新秀', leader: '等待赛季开始', score: 0, playerRank: 1 },
  { name: '进步最快球员', leader: '等待赛季开始', score: 0, playerRank: 0 },
]

export function createSchedule(team: Team) {
  const opponents = TEAMS.filter((candidate) => candidate.id !== team.id)
  const monthCounts = [9, 15, 15, 14, 13, 12, 4]
  return Array.from({ length: 82 }, (_, index) => {
    let cursor = index
    let monthIndex = 0
    while (cursor >= monthCounts[monthIndex]) { cursor -= monthCounts[monthIndex]; monthIndex += 1 }
    const month = monthIndex <= 2 ? 10 + monthIndex : monthIndex - 2
    return {
      opponentId: opponents[(index * 7 + Math.floor(index / opponents.length)) % opponents.length].id,
      home: index % 2 === 0 || index % 7 === 0,
      played: false,
      gameNumber: index + 1,
      month,
      date: 2 + Math.floor((cursor * 26) / Math.max(1, monthCounts[monthIndex] - 1)),
    }
  })
}
