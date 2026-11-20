import React, { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import './WeekendBossPage.css'

import weekendBossJson from '../../../data/stages/weekendBoss.json'

interface WeekendBoss {
  id: string
  name: string
  description: string
  hp: number
  attack: number
  defense: number
  speed: number
  imageKey: string
  rewards: {
    exp: number
    gold: number
    dreamStone: number
    materials: { itemId: string; count: number; dropRate: number }[]
  }
  availableDay: string
  minPlayers: number
  maxPlayers: number
}

interface RoomMember {
  odId: string
  nickname: string
  avatarCharacterId: string
  isReady: boolean
}

const weekendBossData = weekendBossJson as { weekendBosses: WeekendBoss[] }

export const WeekendBossPage: React.FC = () => {
  const player = useGameStore((state) => state.player)
  
  const [activeTab, setActiveTab] = useState<'boss' | 'room'>('boss')
  const [roomCode, setRoomCode] = useState('')
  const [currentRoom, setCurrentRoom] = useState<{
    code: string
    members: RoomMember[]
    bossId: string
  } | null>(null)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)

  const bosses = weekendBossData.weekendBosses

  // 今日が週末かチェック
  const today = new Date()
  const dayOfWeek = today.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const currentDay = dayOfWeek === 6 ? 'saturday' : dayOfWeek === 0 ? 'sunday' : ''

  // 利用可能なボス
  const availableBoss = bosses.find((b) => b.availableDay === currentDay)

  // ルームコード生成
  const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // ルーム作成
  const handleCreateRoom = (bossId: string) => {
    setIsCreatingRoom(true)
    
    setTimeout(() => {
      const code = generateRoomCode()
      setCurrentRoom({
        code,
        members: [
          {
            odId: player?.id || '',
            nickname: player?.nickname || 'プレイヤー',
            avatarCharacterId: player?.ownedCharacters[0]?.characterId || '',
            isReady: false,
          },
        ],
        bossId,
      })
      setIsCreatingRoom(false)
      setActiveTab('room')
    }, 1000)
  }

  // ルーム参加
  const handleJoinRoom = () => {
    if (roomCode.length !== 6) {
      alert('ルームコードは6文字です')
      return
    }

    setCurrentRoom({
      code: roomCode,
      members: [
        {
          odId: 'other_player',
          nickname: 'ホスト',
          avatarCharacterId: 'char_luna',
          isReady: true,
        },
        {
          odId: player?.id || '',
          nickname: player?.nickname || 'プレイヤー',
          avatarCharacterId: player?.ownedCharacters[0]?.characterId || '',
          isReady: false,
        },
      ],
      bossId: bosses[0].id,
    })
    setActiveTab('room')
  }

  // ルーム退出
  const handleLeaveRoom = () => {
    setCurrentRoom(null)
    setActiveTab('boss')
  }

  // 準備完了トグル
  const handleToggleReady = () => {
    if (!currentRoom || !player) return

    setCurrentRoom({
      ...currentRoom,
      members: currentRoom.members.map((m) =>
        m.odId === player.id ? { ...m, isReady: !m.isReady } : m
      ),
    })
  }

  // バトル開始
  const handleStartBattle = () => {
    alert('週末ボスバトルはMVP段階では擬似実装です。将来的にリアルタイムマルチプレイヤーバトルが実装されます。')
  }

  return (
    <div className="weekend-boss-page">
      <h1 className="page-title">🐉 週末ボス</h1>

      {!isWeekend && (
        <div className="not-weekend-notice card">
          <div className="notice-icon">📅</div>
          <h3>週末限定コンテンツ</h3>
          <p>週末ボスは土曜日・日曜日のみ挑戦できます。</p>
          <div className="boss-schedule">
            <div className="schedule-item">
              <span className="day">土曜日</span>
              <span className="boss-name">{bosses.find((b) => b.availableDay === 'saturday')?.name}</span>
            </div>
            <div className="schedule-item">
              <span className="day">日曜日</span>
              <span className="boss-name">{bosses.find((b) => b.availableDay === 'sunday')?.name}</span>
            </div>
          </div>
        </div>
      )}

      {isWeekend && (
        <>
          {/* タブ切り替え */}
          <div className="tab-buttons">
            <button
              className={`tab-btn ${activeTab === 'boss' ? 'active' : ''}`}
              onClick={() => setActiveTab('boss')}
            >
              ボス情報
            </button>
            <button
              className={`tab-btn ${activeTab === 'room' ? 'active' : ''}`}
              onClick={() => setActiveTab('room')}
            >
              ルーム
            </button>
          </div>

          {/* ボス情報タブ */}
          {activeTab === 'boss' && availableBoss && (
            <div className="boss-info-section">
              <div className="boss-card card">
                <div className="boss-header">
                  <span className="boss-icon">🐉</span>
                  <div className="boss-title">
                    <h2>{availableBoss.name}</h2>
                    <span className="boss-day">
                      {currentDay === 'saturday' ? '土曜日限定' : '日曜日限定'}
                    </span>
                  </div>
                </div>

                <p className="boss-description">{availableBoss.description}</p>

                <div className="boss-stats">
                  <div className="stat">
                    <span className="stat-label">HP</span>
                    <span className="stat-value">{availableBoss.hp.toLocaleString()}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">ATK</span>
                    <span className="stat-value">{availableBoss.attack}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">DEF</span>
                    <span className="stat-value">{availableBoss.defense}</span>
                  </div>
                </div>

                <div className="boss-rewards">
                  <h3>報酬</h3>
                  <div className="rewards-list">
                    <span>💎 {availableBoss.rewards.dreamStone}</span>
                    <span>✨ {availableBoss.rewards.exp} EXP</span>
                    <span>🪙 {availableBoss.rewards.gold}</span>
                  </div>
                </div>

                <div className="boss-actions">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => handleCreateRoom(availableBoss.id)}
                    disabled={isCreatingRoom}
                  >
                    {isCreatingRoom ? 'ルーム作成中...' : 'ルームを作成'}
                  </button>
                </div>
              </div>

              {/* ルーム参加 */}
              <div className="join-room card">
                <h3>ルームに参加</h3>
                <div className="join-form">
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="ルームコードを入力"
                    maxLength={6}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={handleJoinRoom}
                    disabled={roomCode.length !== 6}
                  >
                    参加
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ルームタブ */}
          {activeTab === 'room' && currentRoom && (
            <div className="room-section">
              <div className="room-info card">
                <div className="room-header">
                  <h3>ルームコード</h3>
                  <div className="room-code">{currentRoom.code}</div>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => navigator.clipboard.writeText(currentRoom.code)}
                  >
                    コピー
                  </button>
                </div>

                <div className="room-members">
                  <h4>参加者 ({currentRoom.members.length}/4)</h4>
                  <div className="members-grid">
                    {currentRoom.members.map((member) => (
                      <div
                        key={member.odId}
                        className={`member-card ${member.isReady ? 'ready' : ''}`}
                      >
                        <div className="member-avatar">
                          {member.odId === player?.id ? '🧙' : '👤'}
                        </div>
                        <div className="member-name">{member.nickname}</div>
                        <div className={`member-status ${member.isReady ? 'ready' : 'waiting'}`}>
                          {member.isReady ? '準備完了' : '待機中'}
                        </div>
                        {member.odId === player?.id && (
                          <span className="you-badge">あなた</span>
                        )}
                      </div>
                    ))}
                    
                    {/* 空きスロット */}
                    {Array.from({ length: 4 - currentRoom.members.length }).map((_, index) => (
                      <div key={`empty-${index}`} className="member-card empty">
                        <div className="member-avatar">➕</div>
                        <div className="member-name">待機中...</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="room-actions">
                  <button
                    className={`btn ${currentRoom.members.find((m) => m.odId === player?.id)?.isReady ? 'btn-secondary' : 'btn-success'}`}
                    onClick={handleToggleReady}
                  >
                    {currentRoom.members.find((m) => m.odId === player?.id)?.isReady ? '準備解除' : '準備完了'}
                  </button>
                  
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleStartBattle}
                    disabled={!currentRoom.members.every((m) => m.isReady) || currentRoom.members.length < 1}
                  >
                    バトル開始
                  </button>
                  
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleLeaveRoom}
                  >
                    ルームを退出
                  </button>
                </div>
              </div>

              {/* チャット（将来実装） */}
              <div className="room-chat card">
                <h3>チャット</h3>
                <div className="chat-placeholder">
                  <p>チャット機能は将来実装予定です</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'room' && !currentRoom && (
            <div className="no-room card">
              <p>現在参加しているルームはありません</p>
              <button
                className="btn btn-secondary"
                onClick={() => setActiveTab('boss')}
              >
                ボス情報へ戻る
              </button>
            </div>
          )}
        </>
      )}

      {/* 注意事項 */}
      <div className="weekend-boss-notice card">
        <h3>⚠️ 注意事項</h3>
        <ul>
          <li>週末ボスは土曜日・日曜日の00:00〜23:59に挑戦可能</li>
          <li>1〜4人のチームで挑戦できます</li>
          <li>各プレイヤーは自分のキャラクター1体を操作</li>
          <li>報酬は参加者全員が獲得できます</li>
          <li>現在のバージョンでは擬似オンライン（ローカル）実装です</li>
        </ul>
      </div>
    </div>
  )
}
EOF