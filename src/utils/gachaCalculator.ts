// ========================================
// ガチャ抽選ロジック
// ========================================

import { GachaBanner, GachaBannerItem, Rarity } from '@/types'

export interface GachaResult {
  item: GachaBannerItem
  isNew: boolean
  isPityGuarantee: boolean
}

// レアリティごとの基本排出率
const BASE_RATES: { [key in Rarity]: number } = {
  SSR: 3,
  SR: 12,
  R: 35,
  N: 50,
}

// 天井までの回数
const PITY_COUNT = 100

/**
 * 加重ランダム選択
 */
function weightedRandom<T extends { rate: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.rate, 0)
  let random = Math.random() * totalWeight
  
  for (const item of items) {
    random -= item.rate
    if (random <= 0) {
      return item
    }
  }
  
  return items[items.length - 1]
}

/**
 * 単発ガチャを実行
 */
export function performSingleGacha(
  banner: GachaBanner,
  currentPity: number,
  ownedItems: string[]
): { result: GachaResult; newPity: number } {
  const newPity = currentPity + 1
  
  // 天井判定（100回で確定SSR）
  const isPityGuarantee = newPity >= PITY_COUNT
  
  let selectedItem: GachaBannerItem
  
  if (isPityGuarantee) {
    // 天井: SSRから抽選
    const ssrItems = banner.items.filter((item) => {
      // SSRアイテムを特定（レアリティ情報がないため、rate が低いものをSSRとみなす）
      return item.rate <= BASE_RATES.SSR
    })
    
    if (ssrItems.length > 0) {
      selectedItem = weightedRandom(ssrItems)
    } else {
      selectedItem = weightedRandom(banner.items)
    }
  } else {
    // 通常抽選
    selectedItem = weightedRandom(banner.items)
  }
  
  const isNew = !ownedItems.includes(selectedItem.id)
  
  return {
    result: {
      item: selectedItem,
      isNew,
      isPityGuarantee,
    },
    newPity: isPityGuarantee ? 0 : newPity,
  }
}

/**
 * 10連ガチャを実行
 */
export function performMultiGacha(
  banner: GachaBanner,
  currentPity: number,
  ownedItems: string[]
): { results: GachaResult[]; newPity: number } {
  const results: GachaResult[] = []
  let pity = currentPity
  const owned = [...ownedItems]
  
  // 10連でSR以上1体確定
  let hasGuaranteedSR = false
  
  for (let i = 0; i < 10; i++) {
    const { result, newPity } = performSingleGacha(banner, pity, owned)
    
    // 9回目までにSR以上が出ていない場合、10回目はSR以上確定
    if (i === 9 && !hasGuaranteedSR) {
      const srOrHigher = banner.items.filter((item) => item.rate <= BASE_RATES.SR)
      if (srOrHigher.length > 0) {
        const guaranteedItem = weightedRandom(srOrHigher)
        results.push({
          item: guaranteedItem,
          isNew: !owned.includes(guaranteedItem.id),
          isPityGuarantee: false,
        })
        if (!owned.includes(guaranteedItem.id)) {
          owned.push(guaranteedItem.id)
        }
        pity = newPity
        continue
      }
    }
    
    // SR以上が出たかチェック
    if (result.item.rate <= BASE_RATES.SR) {
      hasGuaranteedSR = true
    }
    
    results.push(result)
    if (result.isNew) {
      owned.push(result.item.id)
    }
    pity = newPity
  }
  
  return { results, newPity: pity }
}

/**
 * ガチャコストを計算
 */
export function calculateGachaCost(banner: GachaBanner, isMulti: boolean): number {
  return isMulti ? banner.cost.multi : banner.cost.single
}

/**
 * ガチャが引けるかチェック
 */
export function canAffordGacha(
  banner: GachaBanner,
  dreamStone: number,
  isMulti: boolean
): boolean {
  const cost = calculateGachaCost(banner, isMulti)
  return dreamStone >= cost
}

/**
 * 天井までの残り回数を計算
 */
export function getRemainingPity(currentPity: number): number {
  return PITY_COUNT - currentPity
}

/**
 * 排出率テーブルを生成（表示用）
 */
export function generateRateTable(banner: GachaBanner): { 
  rarity: string
  rate: number
  items: { name: string; id: string }[] 
}[] {
  const grouped: { [key: string]: GachaBannerItem[] } = {}
  
  banner.items.forEach((item) => {
    const rarityKey = item.rate <= 3 ? 'SSR' : item.rate <= 15 ? 'SR' : item.rate <= 50 ? 'R' : 'N'
    if (!grouped[rarityKey]) {
      grouped[rarityKey] = []
    }
    grouped[rarityKey].push(item)
  })
  
  return Object.entries(grouped).map(([rarity, items]) => ({
    rarity,
    rate: items.reduce((sum, i) => sum + i.rate, 0),
    items: items.map((i) => ({ name: i.id, id: i.id })),
  }))
}