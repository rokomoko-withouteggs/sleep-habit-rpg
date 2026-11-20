import React, { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { SleepRecord, SleepScore } from '../../types'
import { calculateSleepRewards } from '../../utils/sleepScore'
import './SleepPage.css'

export const SleepPage: React.FC = () => {
  const player = useGameStore((state) => state.player)
  const recordSleep = useGameStore((state) => state.recordSleep)
  const getSleepRecords = useGameStore((state) => state.getSleepRecords)

  const [activeTab, setActiveTab] = useState<'input' | 'history'>('input')
  const [sleepDuration, setSleepDuration] = useState('7')
  const [bedTime, setBedTime] = useState('23:00')
  const [quality, setQuality] = useState(3)
  const [showResult, setShowResult] = useState(false)
  const [latestResult, setLatestResult] = useState<SleepScore | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const hasTodaySleep = player?.sleepRecords.some((r) => r.date === today)
  const recentRecords = getSleepRecords(7)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (hasTodaySleep) {
      alert('今日は既に睡眠を記録済みです')
      return
    }

    const record: SleepRecord = {
      date: today,
      sleepDuration: parseFloat(sleepDuration),
      bedTime,
      quality,
    }

    const score = recordSleep(record)
    setLatestResult(score)
    setShowResult(true)
  }

  const handleCloseResult = () => {
    setShowResult(false)
    setActiveTab('history')
  }

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'S': return 'rank-s'
      case 'A': return 'rank-a'
      case 'B': return 'rank-b'
      case 'C': return 'rank-c'
      default: return 'rank-d'
    }
  }

  return (
    <div className="sleep-page">
      <h1 className="page-title">🌙 睡眠記録</h1>

      {/* タブ切り替え */}
      <div className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => setActiveTab('input')}
        >
          記録する
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          履歴
        </button>
      </div>

      {/* 入力タブ */}
      {activeTab === 'input' && (
        <div className="sleep-input-section">
          {hasTodaySleep ? (
            <div className="already-recorded card">
              <div className="recorded-icon">✅</div>
              <h3>今日の睡眠は記録済みです</h3>
              <p>明日また記録しましょう！</p>
              <button 
                className="btn btn-secondary"
                onClick={() => setActiveTab('history')}
              >
                履歴を見る
              </button>
            </div>
          ) : (
            <form id="sleep-form" className="sleep-form card" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="sleep-duration">睡眠時間</label>
                <div className="duration-input">
                  <input
                    id="sleep-duration"
                    type="range"
                    min="3"
                    max="12"
                    step="0.5"
                    value={sleepDuration}
                    onChange={(e) => setSleepDuration(e.target.value)}
                  />
                  <span className="duration-value">{sleepDuration}時間</span>
                </div>
                <div className="duration-labels">
                  <span>3h</span>
                  <span>7.5h</span>
                  <span>12h</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="bed-time">就寝時刻</label>
                <input
                  id="bed-time"
                  type="time"
                  value={bedTime}
                  onChange={(e) => setBedTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>睡眠の質</label>
                <div className="quality-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${quality >= star ? 'active' : ''}`}
                      onClick={() => setQuality(star)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <div className="quality-label">
                  {quality === 1 && 'とても悪い'}
                  {quality === 2 && '悪い'}
                  {quality === 3 && '普通'}
                  {quality === 4 && '良い'}
                  {quality === 5 && 'とても良い'}
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-full">
                記録する
              </button>
            </form>
          )}

          {/* 睡眠のコツ */}
          <div className="sleep-tips card">
            <h3 className="tips-title">💡 良い睡眠のコツ</h3>
            <ul className="tips-list">
              <li>22:00〜24:00に就寝するとスコアアップ！</li>
              <li>7〜9時間の睡眠が理想的です</li>
              <li>毎日同じ時間に寝ると規則性ボーナス獲得！</li>
              <li>連続記録でさらにボーナス！</li>
            </ul>
          </div>
        </div>
      )}

      {/* 履歴タブ */}
      {activeTab === 'history' && (
        <div className="sleep-history-section">
          {recentRecords.length === 0 ? (
            <div className="no-history card">
              <p>まだ睡眠記録がありません</p>
              <button 
                className="btn btn-primary"
                onClick={() => setActiveTab('input')}
              >
                記録を始める
              </button>
            </div>
          ) : (
            <>
              {/* 週間サマリー */}
              <div className="week-summary card">
                <h3>直近7日間</h3>
                <div className="summary-stats">
                  <div className="stat">
                    <span className="stat-value">
                      {(recentRecords.reduce((sum, r) => sum + r.sleepDuration, 0) / recentRecords.length).toFixed(1)}h
                    </span>
                    <span className="stat-label">平均睡眠</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{recentRecords.length}日</span>
                    <span className="stat-label">記録日数</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">
                      {(recentRecords.reduce((sum, r) => sum + r.quality, 0) / recentRecords.length).toFixed(1)}
                    </span>
                    <span className="stat-label">平均品質</span>
                  </div>
                </div>
              </div>

              {/* 履歴リスト */}
              <div className="history-list">
                {player?.sleepScores.slice().reverse().map((score) => {
                  const record = player.sleepRecords.find((r) => r.date === score.date)
                  const rewards = calculateSleepRewards(score)
                  
                  return (
                    <div key={score.date} className="history-item card">
                      <div className="history-header">
                        <span className="history-date">{score.date}</span>
                        <span className={`history-rank ${getRankColor(score.rank)}`}>
                          {score.rank}
                        </span>
                      </div>
                      <div className="history-details">
                        <div className="detail">
                          <span className="detail-icon">🛏️</span>
                          <span>{record?.sleepDuration}時間</span>
                        </div>
                        <div className="detail">
                          <span className="detail-icon">🌙</span>
                          <span>{record?.bedTime}</span>
                        </div>
                        <div className="detail">
                          <span className="detail-icon">⭐</span>
                          <span>{'★'.repeat(record?.quality || 0)}</span>
                        </div>
                      </div>
                      <div className="history-score">
                        <span className="score-total">{score.totalScore}点</span>
                        <span className="score-breakdown">
                          (基本{score.baseScore} + ボーナス{score.regularityBonus + score.qualityBonus})
                        </span>
                      </div>
                      <div className="history-rewards">
                        <span>💎 +{rewards.dreamStone}</span>
                        <span>⚡ +{rewards.stamina}</span>
                        <span>✨ +{rewards.exp}EXP</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* 結果モーダル */}
      {showResult && latestResult && (
        <div className="modal-overlay" onClick={handleCloseResult}>
          <div className="modal-content result-modal" onClick={(e) => e.stopPropagation()}>
            <h2>睡眠記録完了！</h2>
            
            <div className={`result-rank ${getRankColor(latestResult.rank)}`}>
              <span className="rank-letter">{latestResult.rank}</span>
              <span className="rank-label">ランク</span>
            </div>
            
            <div className="result-score">
              <span className="score-number">{latestResult.totalScore}</span>
              <span className="score-unit">点</span>
            </div>
            
            <div className="score-details">
              <div className="score-row">
                <span>基本スコア</span>
                <span>{latestResult.baseScore}点</span>
              </div>
              <div className="score-row">
                <span>規則性ボーナス</span>
                <span>+{latestResult.regularityBonus}点</span>
              </div>
              <div className="score-row">
                <span>連続ボーナス</span>
                <span>+{latestResult.qualityBonus}点</span>
              </div>
            </div>
            
            <div className="result-rewards">
              <h3>獲得報酬</h3>
              <div className="rewards-grid">
                <div className="reward-item">
                  <span className="reward-icon">💎</span>
                  <span className="reward-value">+{calculateSleepRewards(latestResult).dreamStone}</span>
                </div>
                <div className="reward-item">
                  <span className="reward-icon">⚡</span>
                  <span className="reward-value">+{calculateSleepRewards(latestResult).stamina}</span>
                </div>
                <div className="reward-item">
                  <span className="reward-icon">✨</span>
                  <span className="reward-value">+{calculateSleepRewards(latestResult).exp} EXP</span>
                </div>
              </div>
            </div>
            
            <div className="battle-buff-info">
              <span className="buff-icon">⚔️</span>
              <span>バトルバフ: ステータス {Math.round((calculateSleepRewards(latestResult).sleepBuff - 1) * 100)}%</span>
            </div>
            
            <button className="btn btn-primary btn-lg w-full" onClick={handleCloseResult}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}