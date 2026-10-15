import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, AtSign, ChevronRight, Heart, MessageCircle, Send, ShieldCheck, Smartphone, Sparkles, Users } from 'lucide-react'
import type { CoachTrack, MenteeTrack, MentorTrack } from '../engine/careerState'
import type { FeedItem, SaveGame } from '../types'
import { PartyChoiceCard, PartyDialog } from '../components/PartyDialog'

const postOptions = [
  { body: '胜利属于整支球队。录像已经看完，下一场继续。', tone: 'positive' as const, label: '职业回应' },
  { body: '我知道外界在说什么。等比赛开始，答案自然会出现。', tone: 'neutral' as const, label: '保持神秘' },
  { body: '有人只负责说，而我负责在场上解决问题。', tone: 'negative' as const, label: '强硬反击' },
]

const quickReplies: Record<string, string[]> = {
  mentor: ['我会早点到训练馆。', '能再帮我看一遍比赛录像吗？', '下一场我想承担关键回合。'],
  coach: ['我会先把防守做到位。', '我想争取更多持球回合。', '请告诉我轮换里最需要改进的地方。'],
  agent: ['先把篮球打好，商务慢一点。', '帮我了解市场上的球队兴趣。', '安排一次社区活动。'],
  friend: ['休赛日一定上线。', '最近比赛压力确实很大。', '有空来主场看球。'],
  romance: ['我会留出完整的时间。', '下一次客场你愿意一起去吗？', '最近我需要先专注比赛。'],
  mentee: ['训练结束后我陪你加练。', '先把比赛录像发给我。', '别急着看数据，先做好每个回合。'],
}

export function PhoneScreen({ game, initialApp = 'messages', onPublish, onReply, onMentor, onCoach, onMentee }: { game: SaveGame; initialApp?: 'messages' | 'social'; onPublish: (body: string, tone: FeedItem['tone']) => void; onReply: (id: string, body: string) => void; onMentor: (track: MentorTrack) => void; onCoach: (track: CoachTrack) => void; onMentee: (track: MenteeTrack) => void }) {
  const [app, setApp] = useState<'messages' | 'social'>(initialApp)
  const [composer, setComposer] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [tone, setTone] = useState<FeedItem['tone']>('neutral')
  const [replyingTo, setReplyingTo] = useState<FeedItem | null>(null)
  const selected = useMemo(() => game.relationships.find((item) => item.id === selectedId), [game.relationships, selectedId])
  const publish = (body: string, selectedTone: FeedItem['tone']) => { onPublish(body, selectedTone); setDraft(''); setReplyingTo(null); setComposer(false) }
  const openComposer = () => { setDraft(''); setReplyingTo(null); setComposer(true) }
  const openReply = (item: FeedItem) => { setDraft(`@${item.author} `); setTone('neutral'); setReplyingTo(item); setComposer(true) }
  const closeComposer = () => { setDraft(''); setReplyingTo(null); setComposer(false) }

  return <div className={`screen phone-screen phone-v3 ${app === 'social' ? 'is-social' : 'is-messages'}`}>
    <header className={`phone-header ${app === 'social' ? 'social-app-header' : ''}`}>
      {app === 'social' ? <><div><strong>场边</strong></div><time>FOR YOU</time></> : <><div><Smartphone /><span>{selected ? '联系人' : '全部联系人'}</span></div><time>篮途</time></>}
      <span className="phone-season-meta">生涯第 <b>{game.careerYear}</b> 年</span>
    </header>
    <div className="phone-tabs segmented-control" role="tablist" aria-label="手机应用切换"><button role="tab" aria-selected={app === 'messages'} className={app === 'messages' ? 'active' : ''} onClick={() => { setApp('messages'); setSelectedId(null) }}>联系人<span>{game.relationships.reduce((sum, item) => sum + item.unread, 0)}</span></button><button role="tab" aria-selected={app === 'social'} className={app === 'social' ? 'active' : ''} onClick={() => { setApp('social'); setSelectedId(null) }}>场边动态</button></div>
    <AnimatePresence mode="wait">
      {app === 'messages' && !selected ? <motion.div className="contacts" key="messages" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>{game.relationships.map((relationship) => <button key={relationship.id} onClick={() => setSelectedId(relationship.id)}><span className="contact-avatar">{relationship.avatar}<i className={relationship.unread ? 'online' : ''} /></span><span className="contact-copy"><span><strong>{relationship.name}</strong><time>{relationship.unread ? '刚刚' : '昨天'}</time></span><small>{relationship.role}</small><p>{relationship.lastMessage}</p></span><ChevronRight /></button>)}</motion.div> : null}
      {app === 'messages' && selected ? <motion.div className={`chat-view ${selected.id === 'mentor' ? 'mentor-chat' : ''}`} key={selected.id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}><header><button onClick={() => setSelectedId(null)}><ArrowLeft /></button>{selected.id === 'mentor' ? <img className="mentor-contact-art" src="/assets/v3-pages/phone/mentor-portrait.png" alt="导师头像" /> : <span className="contact-avatar">{selected.avatar}</span>}<div><strong>{selected.name}</strong><small>{selected.role}</small></div></header><div className="relationship-bars">{[['信任', selected.trust], ['尊重', selected.respect], ['亲密', selected.intimacy], ['紧张', selected.tension]].map(([label, value]) => <div key={label}><span>{label}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}</strong></div>)}</div><div className="message-thread">{selected.messages.map((message) => <div key={message.id} className={message.from}><p>{message.body}</p><time>{message.time}</time></div>)}</div>
        {selected.id === 'mentor' ? <section className="mentor-hub"><div><Sparkles /><span><strong>大哥默契 Lv.{game.mentor.level}</strong><small>{game.mentor.xp % 100}/100 · 已共同训练 {game.mentor.sessions} 次</small></span></div><p>和球队大哥训练会提升球场默契、属性与对应徽章，不再重复触发“正式拜师”。</p><div>{([['shooting', '投篮脚步'], ['playmaking', '挡拆阅读'], ['defense', '协防站位'], ['leadership', '领袖课程']] as Array<[MentorTrack, string]>).map(([id, label]) => <button disabled={Boolean(game.injury) || (game.player?.energy ?? 0) < 12} onClick={() => onMentor(id)} key={id}>{label}</button>)}</div></section> : null}
        {selected.id === 'coach' ? <section className="mentor-hub coach-hub"><div><ShieldCheck /><span><strong>教练关系 · {selected.trust >= 75 ? '战术核心' : selected.trust >= 58 ? '稳定轮换' : selected.trust >= 42 ? '观察期' : '信任危机'}</strong><small>球员教练信任 {game.player?.coachTrust ?? 0} · 关系信任 {selected.trust}</small></span></div><p>沟通会真实改变轮换信任、属性、体能与教练对你的后续剧情态度。</p><div>{([['film', '参加战术录像会'], ['role', '沟通轮换角色'], ['recovery', '申请负荷管理']] as Array<[CoachTrack, string]>).map(([id, label]) => <button disabled={id !== 'recovery' && (Boolean(game.injury) || (game.player?.energy ?? 0) < (id === 'film' ? 6 : 3))} onClick={() => onCoach(id)} key={id}>{label}</button>)}</div></section> : null}
        {selected.id === 'mentee' ? <section className="mentor-hub mentee-hub"><div><Users /><span><strong>小弟成长关系</strong><small>信任 {selected.trust} · 尊重 {selected.respect}</small></span></div><p>指导小弟会消耗8点体能，提升领导能力、传承与更衣室徽章。</p><div>{([['shooting', '陪练投篮脚步'], ['film', '一起复盘录像'], ['leadership', '谈责任与担当']] as Array<[MenteeTrack, string]>).map(([id, label]) => <button disabled={(game.player?.energy ?? 0) < 8} onClick={() => onMentee(id)} key={id}>{label}</button>)}</div></section> : null}
        <div className="quick-replies">{(quickReplies[selected.id] ?? []).map((reply) => <button onClick={() => onReply(selected.id, reply)} key={reply}>{reply}<Send /></button>)}</div>
      </motion.div> : null}
      {app === 'social' ? <motion.div className="social-feed" key="social" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}><div className="social-compose"><span>{game.player?.name.slice(0, 1)}</span><button onClick={openComposer}>分享此刻……</button></div>{game.feed.map((item) => <article key={item.id}><header><span>{item.author.slice(0, 1)}</span><div><strong>{item.author}</strong><small>{item.handle} · {item.time}</small></div></header><p>{item.body}</p><footer><span><Heart size={15} />{item.likes.toLocaleString()}</span><span><MessageCircle size={15} />{item.comments.toLocaleString()}</span><button onClick={() => openReply(item)} aria-label={`回应 ${item.author}`}><AtSign size={15} /></button></footer></article>)}</motion.div> : null}
    </AnimatePresence>
    <AnimatePresence>{composer ? <PartyDialog
      className="party-composer-dialog"
      label="场边动态"
      title={replyingTo ? `回应 ${replyingTo.author}` : '发布动态'}
      description="内容会同时改变媒体、球迷、职业形象与风险倾向。"
      onClose={closeComposer}
      footer="你发布的每一句话，都会影响外界评价"
    >
      <div className="party-composer-form">
        {replyingTo ? <blockquote className="composer-context"><strong>{replyingTo.handle}</strong><span>{replyingTo.body}</span></blockquote> : null}
        <label className="party-composer-input"><span>动态内容</span><textarea aria-label="动态内容" maxLength={160} placeholder="输入你真正想发布的内容…" value={draft} onChange={(event) => setDraft(event.target.value)} /><small>{draft.length}/160</small></label>
        <div className="tone-selector segmented-control segmented-control--compact" role="group" aria-label="动态语气">{([['positive', '积极'], ['neutral', '克制'], ['negative', '挑衅']] as Array<[FeedItem['tone'], string]>).map(([id, label]) => <button type="button" className={tone === id ? 'selected' : ''} onClick={() => setTone(id)} key={id}>{label}</button>)}</div>
      </div>
      <div className="party-composer-actions">
        <PartyChoiceCard compact recommended index={1} title={replyingTo ? '发布回应' : '发布自定义动态'} description={draft.trim() ? '使用当前输入的内容立即发布' : '先输入内容，再发布你的态度'} disabled={!draft.trim()} onClick={() => publish(draft, tone)}><Send /></PartyChoiceCard>
        {postOptions.map((post, index) => <PartyChoiceCard compact index={index + 2} key={post.label} title={post.label} description={replyingTo ? `@${replyingTo.author} ${post.body}` : post.body} onClick={() => publish(replyingTo ? `@${replyingTo.author} ${post.body}` : post.body, post.tone)}><Send /></PartyChoiceCard>)}
      </div>
    </PartyDialog> : null}</AnimatePresence>
  </div>
}
