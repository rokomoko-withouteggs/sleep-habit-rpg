import { Routes, Route, Navigate } from 'react-router-dom'
import { useGameStore } from './src/store/gameStore'
import { Layout } from './components/common/Layout'
import { HomePage } from './pages/home/HomePage'
import { SleepPage } from './pages/sleep/SleepPage'
import { StoryPage } from './pages/story/StoryPage'
import { BattlePage } from './pages/story/BattlePage'
import { FormationPage } from './pages/formation/FormationPage'
import { GachaPage } from './pages/gacha/GachaPage'
import { WeekendBossPage } from './pages/weekend-boss/WeekendBossPage'
import { TitlePage } from './pages/TitlePage'
import { TutorialOverlay } from './components/common/TutorialOverlay'

function App() {
  const player = useGameStore((state) => state.player)

  if (!player) {
    return <TitlePage />
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sleep" element={<SleepPage />} />
          <Route path="/story" element={<StoryPage />} />
          <Route path="/story/battle/:stageId" element={<BattlePage />} />
          <Route path="/formation" element={<FormationPage />} />
          <Route path="/gacha" element={<GachaPage />} />
          <Route path="/weekend-boss" element={<WeekendBossPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      {!player.tutorialCompleted && <TutorialOverlay />}
    </>
  )
}

export default App