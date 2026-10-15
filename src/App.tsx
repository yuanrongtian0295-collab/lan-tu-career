import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AppShell } from './components/AppShell'
import { StoryModal } from './components/StoryModal'
import { useCareerGame } from './engine/careerState'
import { CareerScreen } from './screens/CareerScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { GameScreen } from './screens/GameScreen'
import { LeagueScreen } from './screens/LeagueScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { OffseasonScreen } from './screens/OffseasonScreen'
import { PhoneScreen } from './screens/PhoneScreen'
import { PlayerScreen } from './screens/PlayerScreen'
import { RetiredScreen } from './screens/RetiredScreen'
import { AwardCeremonyScreen } from './screens/AwardCeremonyScreen'

export default function App() {
  const career = useCareerGame()
  const { game } = career

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [game.activeTab])

  if (game.phase === 'onboarding') return <OnboardingScreen onStart={career.startCareer} />
  if (game.phase === 'retired') return <RetiredScreen game={game} onChoose={career.chooseRetirement} onReset={career.resetGame} />
  if (game.awardCeremony) return <AwardCeremonyScreen game={game} onComplete={career.completeAwards} />
  if (game.activeTab === 'game') return <GameScreen game={game} onBack={() => career.setTab('home')} onPlay={career.playNextGame} />

  const screen = (() => {
    switch (game.activeTab) {
      case 'career': return <CareerScreen game={game} onPlay={() => career.setTab('game')} onSimulate={career.simulateGames} onStartAuto={career.startRegularSeasonSimulation} onStartPlayoffRound={career.startPlayoffRoundSimulation} onStopAuto={career.stopRegularSeasonSimulation} />
      case 'league': return <LeagueScreen game={game} />
      case 'phone-social': return <PhoneScreen game={game} initialApp="social" onPublish={career.publishPost} onReply={career.sendContactReply} onMentor={career.mentorSession} onCoach={career.coachMeeting} onMentee={career.menteeSession} />
      case 'phone': return <PhoneScreen game={game} onPublish={career.publishPost} onReply={career.sendContactReply} onMentor={career.mentorSession} onCoach={career.coachMeeting} onMentee={career.menteeSession} />
      case 'player-contract': return <PlayerScreen game={game} initialSection="career" initialDetail="contract" onTrain={career.trainAttribute} onPosition={career.changePosition} onTrade={career.requestTrade} onRecover={career.recover} onRetire={career.retire} />
      case 'player-career': return <PlayerScreen game={game} initialSection="career" onTrain={career.trainAttribute} onPosition={career.changePosition} onTrade={career.requestTrade} onRecover={career.recover} onRetire={career.retire} />
      case 'player': return <PlayerScreen game={game} onTrain={career.trainAttribute} onPosition={career.changePosition} onTrade={career.requestTrade} onRecover={career.recover} onRetire={career.retire} />
      default: return game.seasonStage === 'offseason'
        ? <OffseasonScreen game={game} onChoose={career.completeOffseason} />
        : <DashboardScreen game={game} onEnterGame={() => game.schedule.some((item) => !item.played) ? career.setTab('game') : career.playNextGame()} onTab={career.setTab} onRecover={career.recover} />
    }
  })()

  return <>
    <AppShell active={game.activeTab} onChange={career.setTab}>
      <AnimatePresence mode="wait">
        <motion.div key={game.activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
          {screen}
        </motion.div>
      </AnimatePresence>
    </AppShell>
    {game.pendingStory ? <StoryModal story={game.pendingStory} onResolve={career.resolveStory} /> : null}
  </>
}
