import { describe, it, expect } from 'vitest'
import {
  calculateDurationScore,
  calculateBedTimeScore,
  calculateQualityScore,
  calculateRegularityBonus,
  calculateSleepScore,
  getRank,
} from '../src/utils/sleepScore'
import { SleepRecord } from '../src/types'

describe('睡眠スコア計算', () => {
  describe('calculateDurationScore', () => {
    it('理想的な睡眠時間(7-9時間)で満点を返す', () => {
      expect(calculateDurationScore(7)).toBe(40)
      expect(calculateDurationScore(7.5)).toBe(40)
      expect(calculateDurationScore(8)).toBe(40)
      expect(calculateDurationScore(9)).toBe(40)
    })

    it('短い睡眠時間でペナルティを受ける', () => {
      expect(calculateDurationScore(6)).toBe(32)
      expect(calculateDurationScore(5)).toBe(24)
      expect(calculateDurationScore(4)).toBe(16)
    })

    it('長すぎる睡眠時間でもペナルティを受ける', () => {
      expect(calculateDurationScore(10)).toBe(32)
      expect(calculateDurationScore(11)).toBe(24)
    })
  })

  describe('calculateBedTimeScore', () => {
    it('理想的な就寝時刻(22:00-24:00)で満点を返す', () => {
      expect(calculateBedTimeScore('22:00')).toBe(30)
      expect(calculateBedTimeScore('23:00')).toBe(30)
      expect(calculateBedTimeScore('23:30')).toBe(30)
    })

    it('深夜0時以降は減点される', () => {
      expect(calculateBedTimeScore('00:30')).toBe(25)
      expect(calculateBedTimeScore('01:00')).toBe(20)
    })

    it('早すぎる就寝時刻でも減点される', () => {
      expect(calculateBedTimeScore('20:00')).toBe(20)
      expect(calculateBedTimeScore('21:00')).toBe(25)
    })
  })

  describe('calculateQualityScore', () => {
    it('品質評価に応じたスコアを返す', () => {
      expect(calculateQualityScore(1)).toBe(6)
      expect(calculateQualityScore(2)).toBe(12)
      expect(calculateQualityScore(3)).toBe(18)
      expect(calculateQualityScore(4)).toBe(24)
      expect(calculateQualityScore(5)).toBe(30)
    })
  })

  describe('getRank', () => {
    it('スコアに応じた正しいランクを返す', () => {
      expect(getRank(95)).toBe('S')
      expect(getRank(90)).toBe('S')
      expect(getRank(89)).toBe('A')
      expect(getRank(70)).toBe('A')
      expect(getRank(69)).toBe('B')
      expect(getRank(50)).toBe('B')
      expect(getRank(49)).toBe('C')
      expect(getRank(30)).toBe('C')
      expect(getRank(29)).toBe('D')
      expect(getRank(0)).toBe('D')
    })
  })

  describe('calculateSleepScore', () => {
    it('完璧な睡眠記録でSランクを達成できる', () => {
      const record: SleepRecord = {
        date: '2024-01-07',
        sleepDuration: 7.5,
        bedTime: '23:00',
        quality: 5,
      }
      
      const history: SleepRecord[] = Array.from({ length: 6 }, (_, i) => ({
        date: `2024-01-0${i + 1}`,
        sleepDuration: 7.5,
        bedTime: '23:00',
        quality: 5,
      }))

      const score = calculateSleepScore(record, history)
      
      expect(score.baseScore).toBe(100)
      expect(score.rank).toBe('S')
    })

    it('悪い睡眠記録でDランクになる', () => {
      const record: SleepRecord = {
        date: '2024-01-01',
        sleepDuration: 4,
        bedTime: '03:00',
        quality: 1,
      }

      const score = calculateSleepScore(record, [])
      
      expect(score.totalScore).toBeLessThan(30)
      expect(score.rank).toBe('D')
    })
  })

  describe('calculateRegularityBonus', () => {
    it('規則正しい睡眠で高いボーナスを得る', () => {
      const records: SleepRecord[] = Array.from({ length: 7 }, (_, i) => ({
        date: `2024-01-0${i + 1}`,
        sleepDuration: 7.5,
        bedTime: '23:00',
        quality: 4,
      }))

      const bonus = calculateRegularityBonus(records)
      expect(bonus).toBe(20)
    })

    it('不規則な睡眠でボーナスが低くなる', () => {
      const records: SleepRecord[] = [
        { date: '2024-01-01', sleepDuration: 7, bedTime: '21:00', quality: 3 },
        { date: '2024-01-02', sleepDuration: 7, bedTime: '01:00', quality: 3 },
        { date: '2024-01-03', sleepDuration: 7, bedTime: '23:00', quality: 3 },
        { date: '2024-01-04', sleepDuration: 7, bedTime: '02:00', quality: 3 },
      ]

      const bonus = calculateRegularityBonus(records)
      expect(bonus).toBeLessThan(20)
    })

    it('記録が3日未満の場合は0を返す', () => {
      const records: SleepRecord[] = [
        { date: '2024-01-01', sleepDuration: 7, bedTime: '23:00', quality: 4 },
        { date: '2024-01-02', sleepDuration: 7, bedTime: '23:00', quality: 4 },
      ]

      const bonus = calculateRegularityBonus(records)
      expect(bonus).toBe(0)
    })
  })
})