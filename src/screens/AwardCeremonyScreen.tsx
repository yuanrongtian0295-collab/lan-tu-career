import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronsRight, Medal, ShieldCheck, Sparkles, Star, TrendingUp, Trophy } from 'lucide-react'
import type { AwardName, AwardResult, SaveGame } from '../types'
import { StickerNumber } from '../components/Typography'

type CeremonyStage = 'nomination' | 'finalists' | 'reveal' | 'complete'

const stages: Array<{ id: CeremonyStage; label: string }> = [
  { id: 'nomination', label: '提名' },
  { id: 'finalists', label: '入围' },
  { id: 'reveal', label: '揭晓' },
  { id: 'complete', label: '完成' },
]

const stageIndex = (stage: CeremonyStage) => stages.findIndex((item) => item.id === stage)
const teamLogo = (short: string) => short === 'FA' || short === 'NBA' ? null : `/logos/${short.toLowerCase()}.svg`

function AwardIcon({ name }: { name: AwardName }) {
  if (name === '防守一阵（DPOY）' || name === '防守二阵') return <ShieldCheck />
  if (name === '最佳新秀') return <Star />
  if (name === '进步最快球员') return <TrendingUp />
  if (name === 'MVP') return <Trophy />
  return <Medal />
}

function FinalistRail({ result, revealed }: { result: AwardResult; revealed: boolean }) {
  return <section className={`award-finalists ${result.isLineup ? 'lineup' : ''}`} aria-label={`${result.name}${result.isLineup ? '入选名单' : '最终候选'}`}>
    <h2>{result.isLineup ? '本赛季入选五人' : '入围最终三人'}</h2>
    <div>
      {result.finalists.map((candidate, index) => {
        const logo = teamLogo(candidate.teamShort)
        const isFeatured = !result.isLineup
          ? index === 0
          : result.name === '防守一阵（DPOY）'
            ? index === 0
            : candidate.isPlayer
        return <motion.article
          key={candidate.id}
          className={`${revealed && isFeatured ? 'winner' : ''} ${candidate.isPlayer ? 'player-candidate' : ''}`}
          initial={{ opacity: 0, y: 24, rotate: index === 0 ? -1.5 : index === 2 ? 1.5 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * .12, duration: .42 }}
        >
          <span className="award-finalist-rank"><StickerNumber value={index + 1} size="md" /></span>
          <div className="award-finalist-logo">{logo ? <img src={logo} alt="" /> : <Medal />}</div>
          <strong>{candidate.name}</strong>
          <small>{candidate.teamShort} · {candidate.isPlayer ? '你的球员' : '联盟候选'}</small>
          <div className="award-vote-track"><motion.i initial={{ width: 0 }} animate={{ width: revealed ? `${candidate.votes}%` : '10%' }} transition={{ delay: .18 + index * .1, duration: .72, ease: [0.22, 1, 0.36, 1] }} /></div>
          <b>{revealed ? <>{result.isLineup ? '入选指数 ' : ''}<StickerNumber value={candidate.votes} size="sm" /> / 100</> : result.isLineup ? '名单封存' : '票数封存'}</b>
        </motion.article>
      })}
    </div>
  </section>
}

export function AwardCeremonyScreen({ game, onComplete }: { game: SaveGame; onComplete: () => void }) {
  const ceremony = game.awardCeremony
  const reducedMotion = useReducedMotion()
  const [awardIndex, setAwardIndex] = useState(0)
  const [stage, setStage] = useState<CeremonyStage>('nomination')
  const result = ceremony?.results[awardIndex]
  const currentStep = stageIndex(stage)
  const playerMadePlayoffs = useMemo(() => {
    if (!game.team) return false
    const conference = game.teams.filter((team) => team.conference === game.team?.conference).sort((a, b) => b.wins - a.wins)
    return conference.findIndex((team) => team.id === game.team?.id) < 8
  }, [game.team, game.teams])

  useEffect(() => {
    if (stage === 'nomination') {
      const timer = window.setTimeout(() => setStage('finalists'), reducedMotion ? 80 : 1050)
      return () => window.clearTimeout(timer)
    }
    if (stage === 'finalists') {
      const timer = window.setTimeout(() => setStage('reveal'), reducedMotion ? 80 : 1550)
      return () => window.clearTimeout(timer)
    }
  }, [awardIndex, reducedMotion, stage])

  if (!ceremony || !result) return null

  const revealNext = () => {
    if (awardIndex >= ceremony.results.length - 1) setStage('complete')
    else {
      setAwardIndex((value) => value + 1)
      setStage('nomination')
    }
  }

  return <main className="award-ceremony-screen">
    <header className="award-ceremony-header">
      <span>{ceremony.seasonYear}-{String(ceremony.seasonYear + 1).slice(2)}</span>
      <h1>赛季奖项盛典</h1>
      <button onClick={() => setStage('complete')} disabled={stage === 'complete'}>跳过动画</button>
    </header>

    <ol className="award-stage-track" aria-label="奖项评选进度">
      {stages.map((item, index) => <li key={item.id} className={index < currentStep ? 'done' : index === currentStep ? 'active' : ''}>
        <i><StickerNumber value={index + 1} size="xs" /></i><span>{item.label}</span>
      </li>)}
    </ol>

    <AnimatePresence mode="wait">
      {stage !== 'complete' ? <motion.div className="award-reveal-flow" key={`${awardIndex}-${stage}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .28 }}>
        <section className={`award-stage-card ${stage} ${result.isLineup ? 'lineup' : ''}`} aria-live="polite">
          <div className="award-spotlight left" /><div className="award-spotlight right" />
          {stage === 'reveal' ? <div className="award-confetti" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <motion.i key={index} initial={{ y: -35, x: 0, opacity: 0, rotate: 0 }} animate={{ y: 310 + index * 8, x: (index % 2 ? 1 : -1) * (18 + index * 3), opacity: [0, 1, 1, 0], rotate: index * 82 }} transition={{ duration: 2.4 + index * .04, delay: index * .035, repeat: Infinity }} />)}</div> : null}
          <motion.img className="award-stage-trophy" src="/assets/v3-pages/calendar/championship-trophy.png" alt="赛季奖项奖杯" animate={stage === 'reveal' ? { y: [0, -7, 0], filter: ['drop-shadow(0 9px 14px rgba(0,0,0,.8))', 'drop-shadow(0 0 22px rgba(233,182,74,.7))', 'drop-shadow(0 9px 14px rgba(0,0,0,.8))'] } : { y: 0 }} transition={{ duration: 2.1, repeat: Infinity }} />
          <div className="award-envelope">
            <AwardIcon name={result.name} />
            <span>{stage === 'nomination' ? '联盟选票正在统计' : stage === 'finalists' ? '最终名单已经封存' : result.name}</span>
            {stage === 'reveal' ? <>
              <motion.strong initial={{ opacity: 0, scale: .72, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 16 }}>{result.isLineup ? result.name === '防守一阵（DPOY）' ? `${result.winner.name} · DPOY` : '五人名单揭晓' : result.winner.name}</motion.strong>
              <small>{result.isLineup ? result.recipients.map((candidate) => candidate.name).join(' · ') : `${result.winner.teamShort} · 第一选票 ${result.winner.votes} / 100`}</small>
            </> : <motion.b animate={{ opacity: [.35, 1, .35] }} transition={{ duration: 1.15, repeat: Infinity }}>{stage === 'nomination' ? '审阅赛季表现与球队战绩' : '三位候选人进入最后投票'}</motion.b>}
          </div>
          {stage !== 'reveal' ? <motion.div className="award-scan-line" animate={{ y: [-45, 205] }} transition={{ duration: 1.35, repeat: Infinity, ease: 'linear' }} /> : null}
        </section>
        <FinalistRail result={result} revealed={stage === 'reveal'} />
        {stage === 'reveal' ? <motion.button className="award-next-button" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .65 }} onClick={revealNext}>
          <span><strong>{awardIndex === ceremony.results.length - 1 ? '查看完整获奖名单' : '揭晓下一奖项'}</strong><small>{awardIndex + 1} / {ceremony.results.length} · {result.isLineup ? result.playerWon ? '你入选了本赛季阵容' : '本赛季未入选' : result.playerWon ? '你赢得了这项荣誉' : result.playerRank > 0 && result.playerRank <= 50 ? `你的最终排名：第${result.playerRank}名` : '本赛季未进入候选'}</small></span><ChevronsRight />
        </motion.button> : null}
      </motion.div> : <motion.section className="award-complete" key="complete" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="award-complete-title"><Sparkles /><div><span>评选完成</span><h2>完整奖项名单</h2></div><Trophy /></div>
        <div className="award-winner-list">
          {ceremony.results.map((award, index) => <motion.article key={award.name} className={`${award.playerWon ? 'player-won' : ''} ${award.isLineup ? 'lineup' : ''}`} initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .065 }}>
            <AwardIcon name={award.name} />
            <div><small>{award.name}</small><strong>{award.isLineup ? award.recipients.map((candidate) => candidate.name).join(' · ') : award.winner.name}</strong><span>{award.isLineup ? `五人名单 · ${award.name === '防守一阵（DPOY）' ? `${award.winner.name}当选DPOY` : '按位置评选'}` : `${award.winner.teamShort} · 第一选票 ${award.winner.votes}/100`}</span></div>
            <b>{award.isLineup ? award.playerWon ? '入选' : '未入选' : award.playerWon ? '获奖' : award.playerRank > 0 && award.playerRank <= 50 ? `第${award.playerRank}名` : '未入围'}</b>
          </motion.article>)}
        </div>
        <p className="award-career-impact">获奖会永久写入生涯履历，并提升历史地位、媒体评价和球迷支持。</p>
        <button className="award-complete-button" onClick={onComplete}><span><strong>{playerMadePlayoffs ? '继续进入季后赛' : '进入休赛期'}</strong><small>{playerMadePlayoffs ? '奖项已经记录，首轮对阵即将生成' : '奖项已经记录，开始规划下个赛季'}</small></span><ChevronsRight /></button>
      </motion.section>}
    </AnimatePresence>
  </main>
}
