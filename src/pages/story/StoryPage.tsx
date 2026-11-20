import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'
import { Chapter, Stage } from '../../types'
import './StoryPage.css'

import chaptersJson from '../../../data/stages/chapters.json'
import stagesJson from '../../../data/stages/stages.json'

const chaptersData = chaptersJson as { chapters: Chapter[] }
const stagesData = stagesJson as { stages: Stage[] }

export const StoryPage: React.FC = () => {
  const navigate = useNavigate()
  const player = useGameStore((state) => state.player)
  const isStageCompleted = useGameStore((state) => state.isStageCompleted)
  
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(
    chaptersData.chapters[0]
  )

  const chapters = chaptersData.chapters
  const stages = stagesData.stages

  const getChapterStages = (chapterId: string): Stage[] => {
    return stages.filter((s) => s.chapterId === chapterId)
  }

  const isStageUnlocked = (stage: Stage): boolean => {
    if (!stage.unlockConditions) return true
    
    const { previousStageId, playerLevel } = stage.unlockConditions
    
    if (previousStageId) {
      const prevStage = stages.find((s) => s.id === previousStageId)
      if (prevStage && !isStageCompleted(prevStage.chapterId, previousStageId)) {
        return false
      }
    }
    
    if (playerLevel && (player?.level || 1) < playerLevel) {
      return false
    }
    
    return true
  }

  const getChapterProgress = (chapterId: string): { completed: number; total: number } => {
    const chapterStages = getChapterStages(chapterId)
    const completed = chapterStages.filter((s) => isStageCompleted(chapterId, s.id)).length
    return { completed, total: chapterStages.length }
  }

  const handleStageSelect = (stage: Stage) => {
    if (!isStageUnlocked(stage)) {
      alert('このステージはまだ解放されていません')
      return
    }
    
    if ((player?.stamina || 0) < stage.staminaCost) {
      alert('スタミナが足りません')
      return
    }
    
    navigate(`/story/battle/${stage.id}`)
  }

  return (
    <div className="story-page">
      <h1 className="page-title">📖 ストーリー</h1>

      {/* チャプター選択 */}
      <div className="chapter-selector">
        {chapters.map((chapter) => {
          const progress = getChapterProgress(chapter.id)
          const isActive = selectedChapter?.id === chapter.id
          
          return (
            <button
              key={chapter.id}
              className={`chapter-tab ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedChapter(chapter)}
            >
              <span className="chapter-number">第{chapter.number}章</span>
              <span className="chapter-progress">
                {progress.completed}/{progress.total}
              </span>
            </button>
          )
        })}
      </div>

      {/* 選択中のチャプター情報 */}
      {selectedChapter && (
        <div className="chapter-info card">
          <h2 className="chapter-title">{selectedChapter.name}</h2>
          <p className="chapter-description">{selectedChapter.description}</p>
        </div>
      )}

      {/* ステージリスト */}
      {selectedChapter && (
        <div className="stage-list">
          {getChapterStages(selectedChapter.id).map((stage) => {
            const unlocked = isStageUnlocked(stage)
            const completed = isStageCompleted(selectedChapter.id, stage.id)
            
            return (
              <button
                key={stage.id}
                id={`stage-${stage.id.replace('stage_', '')}`}
                className={`stage-card ${!unlocked ? 'locked' : ''} ${completed ? 'completed' : ''} ${stage.isBoss ? 'boss' : ''} ${stage.isMiniBoss ? 'mini-boss' : ''}`}
                onClick={() => handleStageSelect(stage)}
                disabled={!unlocked}
              >
                <div className="stage-header">
                  <span className="stage-number">
                    {stage.isBoss ? '👑' : stage.isMiniBoss ? '⚔️' : `${stage.stageNumber}`}
                  </span>
                  <span className="stage-name">{stage.name}</span>
                  {completed && <span className="stage-clear">✓</span>}
                </div>
                
                <p className="stage-description">{stage.description}</p>
                
                <div className="stage-info">
                  <span className="stage-stamina">
                    ⚡ {stage.staminaCost}
                  </span>
                  <span className="stage-rewards">
                    💎 {stage.rewards.dreamStone} | ✨ {stage.rewards.exp}EXP
                  </span>
                </div>
                
                {!unlocked && (
                  <div className="stage-lock-overlay">
                    <span className="lock-icon">🔒</span>
                    <span className="lock-text">前のステージをクリアしてください</span>
                  </div>
                )}
                
                {stage.rewards.firstClearBonus && !completed && (
                  <div className="first-clear-badge">
                    初回報酬あり！
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}