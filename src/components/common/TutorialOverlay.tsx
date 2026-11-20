import React, { useState, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import './TutorialOverlay.css'

import tutorialJson from '../../../data/tutorial/tutorial.json'

interface TutorialStep {
  id: string
  message: string
  targetElement?: string
  action?: 'click' | 'input' | 'next'
  nextStepId?: string
}

interface Tutorial {
  id: string
  name: string
  steps: TutorialStep[]
}

const tutorialData = tutorialJson as { tutorials: Tutorial[] }

export const TutorialOverlay: React.FC = () => {
  const player = useGameStore((state) => state.player)
  const completeTutorial = useGameStore((state) => state.completeTutorial)
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const tutorial = tutorialData.tutorials[0]
  const steps: TutorialStep[] = tutorial?.steps || []
  const currentStep = steps[currentStepIndex]

  useEffect(() => {
    if (!currentStep?.targetElement) return

    const element = document.querySelector(currentStep.targetElement)
    if (element) {
      element.classList.add('tutorial-highlight')
      
      const handleClick = () => {
        if (currentStep.action === 'click') {
          goToNextStep()
        }
      }
      
      element.addEventListener('click', handleClick)
      
      return () => {
        element.classList.remove('tutorial-highlight')
        element.removeEventListener('click', handleClick)
      }
    }
  }, [currentStepIndex, currentStep])

  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      completeTutorial()
      setIsVisible(false)
    }
  }

  const skipTutorial = () => {
    completeTutorial()
    setIsVisible(false)
  }

  if (!isVisible || !currentStep || player?.tutorialCompleted) {
    return null
  }

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-backdrop" />
      
      <div className="tutorial-dialog">
        <div className="tutorial-character">
          <div className="tutorial-avatar">🧚</div>
          <span className="tutorial-name">ナビゲーター</span>
        </div>
        
        <div className="tutorial-message">
          {currentStep.message}
        </div>
        
        <div className="tutorial-actions">
          {currentStep.action === 'next' && (
            <button className="btn btn-primary" onClick={goToNextStep}>
              次へ
            </button>
          )}
          
          <button className="btn btn-secondary btn-sm" onClick={skipTutorial}>
            スキップ
          </button>
        </div>
        
        <div className="tutorial-progress">
          {currentStepIndex + 1} / {steps.length}
        </div>
      </div>
    </div>
  )
}