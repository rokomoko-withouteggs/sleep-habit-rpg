import React, { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { Character, OwnedCharacter } from '../../types'
import './FormationPage.css'

import charactersJson from '../../../data/characters/characters.json'

const charactersData = charactersJson as { characters: Character[] }

export const FormationPage: React.FC = () => {
  const player = useGameStore((state) => state.player)
  const getFormation = useGameStore((state) => state.getFormation)
  const updateFormation = useGameStore((state) => state.updateFormation)

  const [activeFormationType, setActiveFormationType] = useState<'story' | 'weekend'>('story')
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)

  const characters = charactersData.characters
  
  const currentFormation = activeFormationType === 'story' 
    ? getFormation('story-1') 
    : getFormation('weekend-1')

  const getCharacterData = (characterId: string): Character | undefined => {
    return characters.find((c) => c.id === characterId)
  }

  const getOwnedCharacter = (characterId: string): OwnedCharacter | undefined => {
    return player?.ownedCharacters.find((c) => c.characterId === characterId)
  }

  const handleSlotClick = (slotIndex: number) => {
    setSelectedSlot(slotIndex === selectedSlot ? null : slotIndex)
  }

  const handleCharacterSelect = (characterId: string) => {
    if (selectedSlot === null || !currentFormation) return

    // 既に編成されているかチェック
    const existingSlot = currentFormation.characterIds.indexOf(characterId)
    
    const newCharacterIds = [...currentFormation.characterIds]
    
    // 既に別のスロットにいる場合、スワップ
    if (existingSlot !== -1 && existingSlot !== selectedSlot) {
      newCharacterIds[existingSlot] = newCharacterIds[selectedSlot]
    }
    
    newCharacterIds[selectedSlot] = characterId

    updateFormation({
      ...currentFormation,
      characterIds: newCharacterIds,
    })

    setSelectedSlot(null)
  }

  const handleRemoveCharacter = (slotIndex: number) => {
    if (!currentFormation) return

    const newCharacterIds = [...currentFormation.characterIds]
    newCharacterIds[slotIndex] = null

    updateFormation({
      ...currentFormation,
      characterIds: newCharacterIds,
    })
  }

  const getRarityClass = (rarity: string): string => {
    return `rarity-${rarity.toLowerCase()}`
  }

  const getJobIcon = (job: string): string => {
    switch (job) {
      case 'NightGuard': return '🛡️'
      case 'RemAttacker': return '⚔️'
      case 'DreamHealer': return '💚'
      case 'NapSupporter': return '✨'
      default: return '👤'
    }
  }

  return (
    <div className="formation-page">
      <h1 className="page-title">👥 編成</h1>

      {/* 編成タイプ切り替え */}
      <div className="formation-tabs">
        <button
          className={`tab-btn ${activeFormationType === 'story' ? 'active' : ''}`}
          onClick={() => setActiveFormationType('story')}
        >
          📖 ストーリー
        </button>
        <button
          className={`tab-btn ${activeFormationType === 'weekend' ? 'active' : ''}`}
          onClick={() => setActiveFormationType('weekend')}
        >
          🐉 週末ボス
        </button>
      </div>

      {/* 編成スロット */}
      <div className="formation-slots card">
        <h2 className="card-title">編成スロット</h2>
        <div className="slots-grid">
          {[0, 1, 2, 3].map((slotIndex) => {
            const characterId = currentFormation?.characterIds[slotIndex]
            const charData = characterId ? getCharacterData(characterId) : null
            const ownedChar = characterId ? getOwnedCharacter(characterId) : null
            const isSelected = selectedSlot === slotIndex

            return (
              <div
                key={slotIndex}
                className={`formation-slot ${isSelected ? 'selected' : ''} ${charData ? 'filled' : 'empty'}`}
                onClick={() => handleSlotClick(slotIndex)}
              >
                {charData ? (
                  <>
                    <div className={`slot-rarity ${getRarityClass(charData.rarity)}`}>
                      {charData.rarity}
                    </div>
                    <div className="slot-icon">
                      {getJobIcon(charData.job)}
                    </div>
                    <div className="slot-name">{charData.name}</div>
                    <div className="slot-level">Lv.{ownedChar?.level || 1}</div>
                    <button
                      className="slot-remove"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveCharacter(slotIndex)
                      }}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <div className="slot-empty-icon">+</div>
                    <div className="slot-empty-text">空きスロット</div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* キャラクター選択 */}
      {selectedSlot !== null && (
        <div className="character-selector card">
          <div className="card-header">
            <h2 className="card-title">キャラクター選択</h2>
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => setSelectedSlot(null)}
            >
              キャンセル
            </button>
          </div>
          
          <div className="character-grid">
            {player?.ownedCharacters.map((ownedChar) => {
              const charData = getCharacterData(ownedChar.characterId)
              if (!charData) return null

              const isInFormation = currentFormation?.characterIds.includes(ownedChar.characterId)

              return (
                <button
                  key={ownedChar.characterId}
                  className={`character-card ${isInFormation ? 'in-formation' : ''} ${getRarityClass(charData.rarity)}`}
                  onClick={() => handleCharacterSelect(ownedChar.characterId)}
                >
                  <div className="char-rarity">{charData.rarity}</div>
                  <div className="char-icon">{getJobIcon(charData.job)}</div>
                  <div className="char-name">{charData.name}</div>
                  <div className="char-level">Lv.{ownedChar.level}</div>
                  {isInFormation && <div className="in-formation-badge">編成中</div>}
                </button>
              )
            })}
          </div>

          {(!player?.ownedCharacters || player.ownedCharacters.length === 0) && (
            <div className="no-characters">
              <p>キャラクターがいません</p>
              <p className="text-muted">ガチャを引いてキャラクターを入手しましょう</p>
            </div>
          )}
        </div>
      )}

      {/* 所持キャラクター一覧 */}
      <div className="owned-characters card">
        <h2 className="card-title">所持キャラクター ({player?.ownedCharacters.length || 0})</h2>
        
        <div className="character-list">
          {player?.ownedCharacters.map((ownedChar) => {
            const charData = getCharacterData(ownedChar.characterId)
            if (!charData) return null

            return (
              <div key={ownedChar.characterId} className={`character-list-item ${getRarityClass(charData.rarity)}`}>
                <div className="char-info">
                  <span className="char-icon">{getJobIcon(charData.job)}</span>
                  <div className="char-details">
                    <span className="char-name">{charData.name}</span>
                    <span className="char-rarity-badge">{charData.rarity}</span>
                  </div>
                </div>
                <div className="char-stats">
                  <span className="char-level">Lv.{ownedChar.level}</span>
                  <div className="stat-row">
                    <span>HP: {Math.round(charData.baseStats.hp * (1 + (ownedChar.level - 1) * 0.1))}</span>
                    <span>ATK: {Math.round(charData.baseStats.attack * (1 + (ownedChar.level - 1) * 0.1))}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {(!player?.ownedCharacters || player.ownedCharacters.length === 0) && (
          <div className="no-characters">
            <p>キャラクターがいません</p>
          </div>
        )}
      </div>
    </div>
  )
}