import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'
import { calculateSleepRewards } from '../../utils/sleepScore'
import './HomePage.css'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const player = useGameStore((state) => state.player)
  const getLatestSleepScore = useGameStore((state) => state.getLatestSleepScore)
  const events = useGameStore((state) => state.events)
  const clearEvents = useGameStore((state) => state.clearEvents)

  const latestScore = getLatestSleepScore()
  const sleepRewards = latestScore ? calculateSleepRewards(latestScore) : null

  // 今日の睡眠記録があるかチェック
  const today = new Date().toISOString().split('T')[0]
  const hasTodaySleep = player?.sleepRecords.some((r) => r.date === today)

  const quickActions = [
    {
      id: 'sleep',
      icon: '🌙',
      label: hasTodaySleep ? '睡眠履歴' : '睡眠記録',
      path: '/sleep',
      highlight: !hasTodaySleep,
    },
    {
      id: 'story',
      icon: '📖',
      label: 'ストーリー',
      path: '/story',
      highlight: false,
    },
    {
      id: 'gacha',
      icon: '🎰',
      label: 'ガチャ',
      path: '/gacha',
      highlight:false,
    },
    {
           id: 'formation',
           icon: '👥',
           label: '編成',
           path: '/formation',
           highlight: false,
    },
       ]
     
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
         <div className="home-page">
           {/* ウェルカムセクション */}
           <section className="welcome-section">
             <h1 className="welcome-title">
               おかえりなさい、{player?.nickname}さん
             </h1>
             <p className="welcome-subtitle">
               今日も良い睡眠を目指しましょう
             </p>
           </section>
     
           {/* 睡眠ステータス */}
           <section className="sleep-status card">
             <div className="card-header">
               <h2 className="card-title">💤 睡眠ステータス</h2>
               {!hasTodaySleep && (
                 <span className="badge badge-warning">未記録</span>
               )}
             </div>
             
             {latestScore ? (
               <div className="sleep-summary">
                 <div className="sleep-rank-display">
                   <span className={`rank-badge ${getRankColor(latestScore.rank)}`}>
                     {latestScore.rank}
                   </span>
                   <span className="rank-score">{latestScore.totalScore}点</span>
                 </div>
                 
                 <div className="sleep-buffs">
                   <div className="buff-item">
                     <span className="buff-label">バトルバフ</span>
                     <span className="buff-value">
                       {sleepRewards ? `${Math.round((sleepRewards.sleepBuff - 1) * 100)}%` : '0%'}
                     </span>
                   </div>
                   <div className="buff-item">
                     <span className="buff-label">最終記録</span>
                     <span className="buff-value">{latestScore.date}</span>
                   </div>
                 </div>
               </div>
             ) : (
               <div className="no-sleep-record">
                 <p>まだ睡眠記録がありません</p>
                 <button 
                   className="btn btn-primary"
                   onClick={() => navigate('/sleep')}
                 >
                   睡眠を記録する
                 </button>
               </div>
             )}
           </section>
     
           {/* プレイヤーステータス */}
           <section className="player-status card">
             <div className="card-header">
               <h2 className="card-title">📊 ステータス</h2>
             </div>
             
             <div className="status-grid">
               <div className="status-item">
                 <span className="status-label">レベル</span>
                 <span className="status-value">{player?.level}</span>
               </div>
               <div className="status-item">
                 <span className="status-label">所持キャラ</span>
                 <span className="status-value">{player?.ownedCharacters.length}体</span>
               </div>
               <div className="status-item">
                 <span className="status-label">ゴールド</span>
                 <span className="status-value gold">{player?.gold?.toLocaleString()}</span>
               </div>
               <div className="status-item">
                 <span className="status-label">進行度</span>
                 <span className="status-value">
                   第{Object.keys(player?.storyProgress || {}).length || 1}章
                 </span>
               </div>
             </div>
     
             {/* 経験値バー */}
             <div className="exp-bar-container">
               <div className="exp-label">
                 <span>EXP</span>
                 <span>{player?.exp} / {(player?.level || 1) * 100 + 100}</span>
               </div>
               <div className="progress-bar">
                 <div 
                   className="progress-bar-fill progress-bar-exp"
                   style={{ 
                     width: `${Math.min(100, ((player?.exp || 0) / ((player?.level || 1) * 100 + 100)) * 100)}%` 
                   }}
                 />
               </div>
             </div>
           </section>
     
           {/* クイックアクション */}
           <section className="quick-actions">
             <h2 className="section-title">クイックアクション</h2>
             <div className="action-grid">
               {quickActions.map((action) => (
                 <button
                   key={action.id}
                   className={`action-card ${action.highlight ? 'highlight' : ''}`}
                   onClick={() => navigate(action.path)}
                 >
                   <span className="action-icon">{action.icon}</span>
                   <span className="action-label">{action.label}</span>
                   {action.highlight && <span className="action-badge">!</span>}
                 </button>
               ))}
             </div>
           </section>
     
           {/* イベント通知 */}
           {events.length > 0 && (
             <section className="events-section card">
               <div className="card-header">
                 <h2 className="card-title">🔔 通知</h2>
                 <button className="btn btn-sm btn-secondary" onClick={clearEvents}>
                   クリア
                 </button>
               </div>
               <div className="events-list">
                 {events.slice(-5).reverse().map((event) => (
                   <div key={event.id} className={`event-item event-${event.type}`}>
                     <span className="event-title">{event.title}</span>
                     <span className="event-message">{event.message}</span>
                   </div>
                 ))}
               </div>
             </section>
           )}
     
           {/* 週末ボス告知 */}
           <section className="weekend-boss-banner" onClick={() => navigate('/weekend-boss')}>
             <div className="banner-content">
               <span className="banner-icon">🐉</span>
               <div className="banner-text">
                 <span className="banner-title">週末ボス挑戦</span>
                 <span className="banner-subtitle">チームで協力して討伐しよう！</span>
               </div>
               <span className="banner-arrow">→</span>
             </div>
           </section>
         </div>
       )
     }