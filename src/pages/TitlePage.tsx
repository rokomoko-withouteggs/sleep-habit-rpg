import React, { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import './TitlePage.css'

export const TitlePage: React.FC = () => {
  const [nickname, setNickname] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const initializePlayer = useGameStore((state) => state.initializePlayer)
  const addCharacter = useGameStore((state) => state.addCharacter)

  const handleStart = () => {
    if (nickname.trim().length < 1) {
      alert('ニックネームを入力してください')
      return
    }

    setIsStarting(true)
    
    // プレイヤー初期化
    initializePlayer(nickname.trim())
    
    // 初期キャラクター付与（Rキャラ）
    addCharacter('char_drowsy')
    addCharacter('char_snooze')
  }

  return (
    <div className="title-page">
      <div className="title-background">
        <div className="stars"></div>
        <div className="moon">🌙</div>
      </div>
      
      <div className="title-content">
        <div className="title-logo">
          <h1 className="title-main">Dream Guardian</h1>
          <p className="title-sub">睡眠習慣RPG</p>
        </div>
        
        <div className="title-tagline">
          良い睡眠が、あなたを強くする
        </div>
        
        <div className="start-form">
          <div className="form-group">
            <label htmlFor="nickname">冒険者の名前</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="ニックネームを入力"
              maxLength={12}
              disabled={isStarting}
            />
          </div>
          
          <button 
            className="btn btn-primary btn-lg start-button"
            onClick={handleStart}
            disabled={isStarting || nickname.trim().length < 1}
          >
            {isStarting ? '準備中...' : '冒険を始める'}
          </button>
        </div>
        
        <div className="title-features">
          <div className="feature">
            <span className="feature-icon">😴</span>
            <span className="feature-text">睡眠記録でパワーアップ</span>
          </div>
          <div className="feature">
            <span className="feature-icon">⚔️</span>
            <span className="feature-text">夢の世界でバトル</span>
          </div>
          <div className="feature">
            <span className="feature-icon">👥</span>
            <span className="feature-text">週末ボスを協力討伐</span>
          </div>
        </div>
      </div>
      
      <footer className="title-footer">
        <p>© 2024 Sleep Habit RPG</p>
      </footer>
    </div>
  )
}