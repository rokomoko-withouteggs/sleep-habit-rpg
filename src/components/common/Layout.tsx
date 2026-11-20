import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'
import './Layout.css'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const player = useGameStore((state) => state.player)

  const navItems = [
    { id: 'sleep', path: '/sleep', label: '睡眠', icon: '🌙' },
    { id: 'story', path: '/story', label: 'ストーリー', icon: '📖' },
    { id: 'weekend-boss', path: '/weekend-boss', label: '週ボス', icon: '🐉' },
    { id: 'formation', path: '/formation', label: '編成', icon: '👥' },
    { id: 'gacha', path: '/gacha', label: 'ガチャ', icon: '🎰' },
  ]

  const isActive = (path: string) => location.pathname === path

  // バトル中はナビゲーション非表示
  const isBattle = location.pathname.includes('/battle')

  return (
    <div className="layout">
      {/* ヘッダー */}
      <header className="header">
        <button 
          className="home-button"
          onClick={() => navigate('/')}
          aria-label="ホームに戻る"
        >
          🏠
        </button>
        
        <div className="player-info">
          <div className="player-level">
            <span className="level-label">Lv</span>
            <span className="level-value">{player?.level || 1}</span>
          </div>
          
          <div className="resource dream-stone">
            <span className="resource-icon">💎</span>
            <span className="resource-value">{player?.dreamStone || 0}</span>
          </div>
          
          <div className="resource stamina">
            <span className="resource-icon">⚡</span>
            <span className="resource-value">
              {player?.stamina || 0}/{player?.maxStamina || 100}
            </span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="main-content">
        {children}
      </main>

      {/* ナビゲーション */}
      {!isBattle && (
        <nav className="bottom-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}