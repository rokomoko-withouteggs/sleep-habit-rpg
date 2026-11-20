import React, { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { GachaBanner, GachaResult } from '../../types'
import { performSingleGacha, performMultiGacha, canAffordGacha, getRemainingPity } from '../../utils/gachaCalculator'
import './GachaPage.css'

import bannersJson from '../../../data/gacha/banners.json'
import charactersJson from '../../../data/characters/characters.json'
import equipmentJson from '../../../data/equipment/equipment.json'

const bannersData = bannersJson as { banners: GachaBanner[] }
const charactersData = charactersJson as { characters: any[] }
const equipmentData = equipmentJson as { equipment: any[] }

export const GachaPage: React.FC = () => {
  const player = useGameStore((state) => state.player)
  const spendDreamStone = useGameStore((state) => state.spendDreamStone)
  const addCharacter = useGameStore((state) => state.addCharacter)
  const updatePlayer = useGameStore((state) => state.updatePlayer)

  const [selectedBanner, setSelectedBanner] = useState<GachaBanner>(
    bannersData.banners[0]
  )
  const [gachaResults, setGachaResults] = useState<GachaResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [pityCount, setPityCount] = useState(0)

  const banners = bannersData.banners

  const getItemName = (item: GachaResult['item']): string => {
    if (item.type === 'character') {
      return charactersData.characters.find((c) => c.id === item.id)?.name || item.id
    } else if (item.type === 'equipment') {
      return equipmentData.equipment.find((e) => e.id === item.id)?.name || item.id
    }
    return item.id
  }

  const getItemRarity = (item: GachaResult['item']): string => {
    if (item.type === 'character') {
      return charactersData.characters.find((c) => c.id === item.id)?.rarity || 'N'
    } else if (item.type === 'equipment') {
      return equipmentData.equipment.find((e) => e.id === item.id)?.rarity || 'N'
    }
    return 'N'
  }

  const getItemIcon = (item: GachaResult['item']): string => {
    if (item.type === 'character') {
      const char = charactersData.characters.find((c) => c.id === item.id)
      if (char) {
        switch (char.job) {
          case 'NightGuard': return '🛡️'
          case 'RemAttacker': return '⚔️'
          case 'DreamHealer': return '💚'
          case 'NapSupporter': return '✨'
        }
      }
      return '👤'
    } else if (item.type === 'equipment') {
      const equip = equipmentData.equipment.find((e) => e.id === item.id)
      return equip?.type === 'weapon' ? '🗡️' : '🛡️'
    }
    return '📦'
  }

  const handlePull = async (isMulti: boolean) => {
    if (!canAffordGacha(selectedBanner, player?.dreamStone || 0, isMulti)) {
      alert('ドリームストーンが足りません')
      return
    }

    const cost = isMulti ? selectedBanner.cost.multi : selectedBanner.cost.single
    
    // 初心者ガチャは無料
    if (selectedBanner.id !== 'banner_newbie') {
      if (!spendDreamStone(cost)) {
        alert('ドリームストーンが足りません')
        return
      }
    }

    setIsAnimating(true)

    // アニメーション待機
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const ownedItems = [
      ...(player?.ownedCharacters.map((c) => c.characterId) || []),
      ...(player?.ownedEquipment || []),
    ]

    let results: GachaResult[]
    let newPity: number

    if (isMulti) {
      const multiResult = performMultiGacha(selectedBanner, pityCount, ownedItems)
      results = multiResult.results
      newPity = multiResult.newPity
    } else {
      const singleResult = performSingleGacha(selectedBanner, pityCount, ownedItems)
      results = [singleResult.result]
      newPity = singleResult.newPity
    }

    setPityCount(newPity)

    // 獲得アイテムを追加
    results.forEach((result) => {
      if (result.item.type === 'character') {
        addCharacter(result.item.id)
      } else if (result.item.type === 'equipment') {
        const currentEquipment = player?.ownedEquipment || []
        if (!currentEquipment.includes(result.item.id)) {
          updatePlayer({ ownedEquipment: [...currentEquipment, result.item.id] })
        }
      }
    })

    setGachaResults(results)
    setIsAnimating(false)
    setShowResults(true)
  }

  const handleCloseResults = () => {
    setShowResults(false)
    setGachaResults([])
  }

  const getRarityClass = (rarity: string): string => {
    return `rarity-${rarity.toLowerCase()}`
  }

  return (
    <div className="gacha-page">
      <h1 className="page-title">🎰 ガチャ</h1>

      {/* バナー選択 */}
      <div className="banner-selector">
        {banners.map((banner) => (
          <button
            key={banner.id}
            className={`banner-tab ${selectedBanner.id === banner.id ? 'active' : ''}`}
            onClick={() => setSelectedBanner(banner)}
          >
            {banner.type === 'pickup' && '⭐ '}
            {banner.name}
          </button>
        ))}
      </div>

      {/* 選択中のバナー */}
      <div className="banner-display card">
        <div className="banner-header">
          <h2>{selectedBanner.name}</h2>
          {selectedBanner.type === 'pickup' && (
            <span className="pickup-badge">ピックアップ中</span>
          )}
        </div>
        
        <p className="banner-description">{selectedBanner.description}</p>

        <div className="banner-visual">
          <div className="banner-image">
            {selectedBanner.type === 'pickup' ? '🌟' : selectedBanner.type === 'limited' ? '🎁' : '✨'}
          </div>
        </div>

        {/* 天井情報 */}
        <div className="pity-info">
          <span>天井まで: {getRemainingPity(pityCount)}回</span>
          <div className="pity-bar">
            <div 
              className="pity-bar-fill"
              style={{ width: `${(pityCount / 100) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ガチャボタン */}
      <div className="gacha-buttons">
        <button
          className="gacha-btn single"
          onClick={() => handlePull(false)}
          disabled={isAnimating || (selectedBanner.id !== 'banner_newbie' && !canAffordGacha(selectedBanner, player?.dreamStone || 0, false))}
        >
          <span className="btn-label">単発</span>
          <span className="btn-cost">
            {selectedBanner.id === 'banner_newbie' ? '無料' : `💎 ${selectedBanner.cost.single}`}
          </span>
        </button>

        <button
          className="gacha-btn multi"
          onClick={() => handlePull(true)}
          disabled={isAnimating || (selectedBanner.id !== 'banner_newbie' && !canAffordGacha(selectedBanner, player?.dreamStone || 0, true))}
        >
          <span className="btn-label">10連</span>
          <span className="btn-cost">
            {selectedBanner.id === 'banner_newbie' ? '無料' : `💎 ${selectedBanner.cost.multi}`}
          </span>
          <span className="btn-bonus">SR以上1体確定</span>
        </button>
      </div>

      {/* 所持ドリームストーン */}
      <div className="dreamstone-info">
        <span>所持ドリームストーン:</span>
        <span className="dreamstone-value">💎 {player?.dreamStone || 0}</span>
      </div>

      {/* 排出率 */}
      <div className="rate-info card">
        <h3>排出率</h3>
        <div className="rate-list">
          <div className="rate-item">
            <span className="rarity-ssr">SSR</span>
            <span>3%</span>
          </div>
          <div className="rate-item">
            <span className="rarity-sr">SR</span>
            <span>12%</span>
          </div>
          <div className="rate-item">
            <span className="rarity-r">R</span>
            <span>35%</span>
          </div>
          <div className="rate-item">
            <span className="rarity-n">N</span>
            <span>50%</span>
          </div>
        </div>
        <p className="rate-note">※100連で天井（SSR確定）</p>
      </div>

      {/* ガチャアニメーション */}
      {isAnimating && (
        <div className="gacha-animation-overlay">
          <div className="gacha-animation">
            <div className="gacha-orb">✨</div>
            <p>ガチャ中...</p>
          </div>
        </div>
      )}

      {/* 結果表示 */}
      {showResults && (
        <div className="gacha-results-overlay" onClick={handleCloseResults}>
          <div className="gacha-results" onClick={(e) => e.stopPropagation()}>
            <h2>ガチャ結果</h2>
            
            <div className="results-grid">
              {gachaResults.map((result, index) => {
                const rarity = getItemRarity(result.item)
                return (
                  <div 
                    key={index} 
                    className={`result-item ${getRarityClass(rarity)} ${result.isNew ? 'new' : ''}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {result.isNew && <div className="new-badge">NEW!</div>}
                    {result.isPityGuarantee && <div className="pity-badge">天井</div>}
                    <div className="result-icon">{getItemIcon(result.item)}</div>
                    <div className="result-rarity">{rarity}</div>
                    <div className="result-name">{getItemName(result.item)}</div>
                    <div className="result-type">
                      {result.item.type === 'character' ? 'キャラクター' : '装備'}
                    </div>
                  </div>
                )
              })}
            </div>

            <button className="btn btn-primary btn-lg" onClick={handleCloseResults}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}