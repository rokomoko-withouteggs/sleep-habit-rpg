// ========================================
// 睡眠スコア計算ロジック
// 仕様書に基づく計算式
// ========================================

import { SleepRecord, SleepScore, SleepRank } from '../types'

// スコア閾値
const SCORE_THRESHOLDS = {
  S: 90,
  A: 70,
  B: 50,
  C: 30,
}

// 理想的な睡眠時間（時間）
const IDEAL_SLEEP_MIN = 7
const IDEAL_SLEEP_MAX = 9

// 理想的な就寝時刻
const IDEAL_BED_TIME_START = 22 // 22:00
const IDEAL_BED_TIME_END = 24   // 24:00 (0:00)

/**
 * 睡眠時間スコアを計算（0-40点）
 */
export function calculateDurationScore(duration: number): number {
  if (duration >= IDEAL_SLEEP_MIN && duration <= IDEAL_SLEEP_MAX) {
    return 40
  }
  
  // 理想範囲から離れるほど減点
  const diff = duration < IDEAL_SLEEP_MIN 
    ? IDEAL_SLEEP_MIN - duration 
    : duration - IDEAL_SLEEP_MAX
  
  const penalty = Math.min(diff * 8, 40)
  return Math.max(0, 40 - penalty)
}

/**
 * 就寝時刻スコアを計算（0-30点）
 */
export function calculateBedTimeScore(bedTime: string): number {
  const [hours, minutes] = bedTime.split(':').map(Number)
  const bedHour = hours + minutes / 60
  
  // 22:00-24:00 の間なら満点
  if (bedHour >= IDEAL_BED_TIME_START && bedHour < IDEAL_BED_TIME_END) {
    return 30
  }
  
  // 0:00-2:00 も許容（深夜帯）
  if (bedHour >= 0 && bedHour < 2) {
    const diff = bedHour
    return Math.max(0, 30 - diff * 10)
  }
  
  // それ以外は減点
  if (bedHour < IDEAL_BED_TIME_START) {
    const diff = IDEAL_BED_TIME_START - bedHour
    return Math.max(0, 30 - diff * 5)
  }
  
  return 0
}

/**
 * 睡眠品質スコアを計算（0-30点）
 */
export function calculateQualityScore(quality: number): number {
  // 1-5の星評価を0-30点に変換
  return Math.round((quality / 5) * 30)
}

/**
 * 規則性ボーナスを計算（0-20点）
 * 直近7日間の就寝時刻の一貫性を評価
 */
export function calculateRegularityBonus(records: SleepRecord[]): number {
  if (records.length < 3) return 0
  
  const recentRecords = records.slice(-7)
  const bedTimes = recentRecords.map((r) => {
    const [h, m] = r.bedTime.split(':').map(Number)
    return h + m / 60
  })
  
  // 標準偏差を計算
  const mean = bedTimes.reduce((a, b) => a + b, 0) / bedTimes.length
  const variance = bedTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / bedTimes.length
  const stdDev = Math.sqrt(variance)
  
  // 標準偏差が小さいほど高スコア（1時間以内なら満点）
  if (stdDev <= 0.5) return 20
  if (stdDev <= 1) return 15
  if (stdDev <= 1.5) return 10
  if (stdDev <= 2) return 5
  return 0
}

/**
 * 連続記録ボーナスを計算（0-10点）
 */
export function calculateStreakBonus(records: SleepRecord[]): number {
  if (records.length === 0) return 0
  
  // 連続日数をカウント
  let streak = 1
  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date))
  
  for (let i = 0; i < sortedRecords.length - 1; i++) {
    const current = new Date(sortedRecords[i].date)
    const prev = new Date(sortedRecords[i + 1].date)
    const diffDays = Math.floor((current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }
  
  // 7日連続で満点
  if (streak >= 7) return 10
  if (streak >= 5) return 7
  if (streak >= 3) return 5
  if (streak >= 2) return 2
  return 0
}

/**
 * ランクを判定
 */
export function getRank(score: number): SleepRank {
  if (score >= SCORE_THRESHOLDS.S) return 'S'
  if (score >= SCORE_THRESHOLDS.A) return 'A'
  if (score >= SCORE_THRESHOLDS.B) return 'B'
  if (score >= SCORE_THRESHOLDS.C) return 'C'
  return 'D'
}

/**
 * 睡眠スコアを計算
 */
export function calculateSleepScore(
  record: SleepRecord,
  historicalRecords: SleepRecord[]
): SleepScore {
  const durationScore = calculateDurationScore(record.sleepDuration)
  const bedTimeScore = calculateBedTimeScore(record.bedTime)
  const qualityScore = calculateQualityScore(record.quality)
  
  const baseScore = durationScore + bedTimeScore + qualityScore
  const regularityBonus = calculateRegularityBonus([...historicalRecords, record])
  const streakBonus = calculateStreakBonus([...historicalRecords, record])
  const qualityBonus = streakBonus
  
  const totalScore = Math.min(100, baseScore + regularityBonus + qualityBonus)
  
  return {
    date: record.date,
    baseScore: Math.round(baseScore),
    regularityBonus: Math.round(regularityBonus),
    qualityBonus: Math.round(qualityBonus),
    totalScore: Math.round(totalScore),
    rank: getRank(totalScore),
  }
}

/**
 * 睡眠スコアに基づくゲーム報酬を計算
 */
export function calculateSleepRewards(score: SleepScore): {
  dreamStone: number
  exp: number
  stamina: number
  sleepBuff: number  // バトル時のステータス倍率
} {
  const baseRewards = {
    S: { dreamStone: 50, exp: 100, stamina: 20, sleepBuff: 1.2 },
    A: { dreamStone: 30, exp: 70, stamina: 15, sleepBuff: 1.1 },
    B: { dreamStone: 20, exp: 50, stamina: 10, sleepBuff: 1.0 },
    C: { dreamStone: 10, exp: 30, stamina: 5, sleepBuff: 0.9 },
    D: { dreamStone: 5, exp: 10, stamina: 0, sleepBuff: 0.8 },
  }
  
  return baseRewards[score.rank]
}