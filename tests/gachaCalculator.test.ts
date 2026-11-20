import { describe, it, expect } from 'vitest'
import {
  performSingleGacha,
  performMultiGacha,
  canAffordGacha,
  getRemainingPity,
  calculateGachaCost,
} from '../src/utils/gachaCalculator'
import { GachaBanner } from '../src/types'

const mockBanner: GachaBanner = {
  id: 'test_banner',
  name: 'テストバナー',
  description: 'テスト用バナー',
  type: 'standard',
  items: [
    { type: 'character', id: 'char_ssr', rate: 3 },
    { type: 'character', id: 'char_sr', rate: 12 },
    { type: 'character', id: 'char_r', rate: 35 },
    { type: 'character', id: 'char_n', rate: 50 },
  ],
  cost: {
    single: 150,
    multi: 1350,
  },
  imageKey: 'test_banner',
}

describe('ガチャ計算', () => {
  describe('performSingleGacha', () => {
    it('結果が正しく返される', () => {
      const { result, newPity } = performSingleGacha(mockBanner, 0, [])
      
      expect(result).toHaveProperty('item')
      expect(result).toHaveProperty('isNew')
      expect(result).toHaveProperty('isPityGuarantee')
      expect(result.item).toHaveProperty('type')
      expect(result.item).toHaveProperty('id')
      expect(result.item).toHaveProperty('rate')
      expect(newPity).toBe(1)
    })

    it('天井(100回)でSSR確定', () => {
      const { result, newPity } = performSingleGacha(mockBanner, 99, [])
      
      expect(result.isPityGuarantee).toBe(true)
      expect(newPity).toBe(0) // 天井リセット
    })

    it('所持済みアイテムはisNew: falseになる', () => {
      const ownedItems = ['char_n']
      
      // 100回試行して、char_nが出た時にisNew: falseになることを確認
      let foundOwned = false
      for (let i = 0; i < 100; i++) {
        const { result } = performSingleGacha(mockBanner, 0, ownedItems)
        if (result.item.id === 'char_n') {
          expect(result.isNew).toBe(false)
          foundOwned = true
          break
        }
      }
      // N確率50%なので、100回で必ず1回は出るはず
      expect(foundOwned).toBe(true)
    })

    it('新規アイテムはisNew: trueになる', () => {
      const { result } = performSingleGacha(mockBanner, 0, [])
      
      // 所持なしなので必ずisNew: true
      expect(result.isNew).toBe(true)
    })
  })

  describe('performMultiGacha', () => {
    it('10連で10個の結果が返される', () => {
      const { results, newPity } = performMultiGacha(mockBanner, 0, [])
      
      expect(results).toHaveLength(10)
      expect(newPity).toBe(10)
    })

    it('天井をまたいだ場合、天井がリセットされる', () => {
      const { results, newPity } = performMultiGacha(mockBanner, 95, [])
      
      // 95 + 10 = 105 だが、天井(100)で1回リセットされるので 5
      // ただし、天井で1回分消費されるので実質的には newPity <= 10
      expect(newPity).toBeLessThanOrEqual(10)
      
      // 天井確定が含まれるはず
      const hasPityGuarantee = results.some((r) => r.isPityGuarantee)
      expect(hasPityGuarantee).toBe(true)
    })
  })

  describe('canAffordGacha', () => {
    it('単発の場合、150個以上で引ける', () => {
      expect(canAffordGacha(mockBanner, 150, false)).toBe(true)
      expect(canAffordGacha(mockBanner, 149, false)).toBe(false)
    })

    it('10連の場合、1350個以上で引ける', () => {
      expect(canAffordGacha(mockBanner, 1350, true)).toBe(true)
      expect(canAffordGacha(mockBanner, 1349, true)).toBe(false)
    })
  })

  describe('getRemainingPity', () => {
    it('天井までの残り回数が正しく計算される', () => {
      expect(getRemainingPity(0)).toBe(100)
      expect(getRemainingPity(50)).toBe(50)
      expect(getRemainingPity(99)).toBe(1)
    })
  })

  describe('calculateGachaCost', () => {
    it('単発と10連のコストが正しく返される', () => {
      expect(calculateGachaCost(mockBanner, false)).toBe(150)
      expect(calculateGachaCost(mockBanner, true)).toBe(1350)
    })
  })

  describe('排出率テスト', () => {
    it('1000回試行で排出率が期待値に近い', () => {
      const counts: { [key: string]: number } = {
        char_ssr: 0,
        char_sr: 0,
        char_r: 0,
        char_n: 0,
      }

      const iterations = 1000
      let pity = 0

      for (let i = 0; i < iterations; i++) {
        const { result, newPity } = performSingleGacha(mockBanner, pity, [])
        counts[result.item.id]++
        pity = newPity
      }

      // 許容誤差を考慮（統計的変動があるため）
      const ssrRate = counts.char_ssr / iterations
      const srRate = counts.char_sr / iterations
      const rRate = counts.char_r / iterations
      const nRate = counts.char_n / iterations

      // 天井によりSSRは3%より高くなることがある
      expect(ssrRate).toBeGreaterThanOrEqual(0.01) // 最低1%
      expect(ssrRate).toBeLessThanOrEqual(0.10)    // 最大10%

      expect(srRate).toBeGreaterThanOrEqual(0.05)  // 最低5%
      expect(srRate).toBeLessThanOrEqual(0.25)     // 最大25%

      expect(rRate).toBeGreaterThanOrEqual(0.20)   // 最低20%
      expect(rRate).toBeLessThanOrEqual(0.50)      // 最大50%

      expect(nRate).toBeGreaterThanOrEqual(0.30)   // 最低30%
      expect(nRate).toBeLessThanOrEqual(0.65)      // 最大65%
    })
  })
})