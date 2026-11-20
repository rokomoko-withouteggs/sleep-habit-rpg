// ========================================
// 睡眠データ取得の抽象化レイヤー
// 将来的に外部連携（Fitbit, Apple Health等）に差し替え可能
// ========================================

import { SleepRecord } from '@/types'

export interface ISleepDataSource {
  /**
   * 指定日の睡眠データを取得
   */
  getSleepRecord(date: string): Promise<SleepRecord | null>
  
  /**
   * 睡眠データを保存
   */
  saveSleepRecord(record: SleepRecord): Promise<void>
  
  /**
   * 期間内の睡眠データを取得
   */
  getSleepRecords(startDate: string, endDate: string): Promise<SleepRecord[]>
  
  /**
   * 外部サービスと同期（将来用）
   */
  sync?(): Promise<void>
  
  /**
   * データソースの種類を取得
   */
  getSourceType(): string
}

// 手動入力実装（MVP用）
export class ManualSleepDataSource implements ISleepDataSource {
  private records: Map<string, SleepRecord> = new Map()
  private storageKey = 'manual_sleep_records'
  
  constructor() {
    this.loadFromStorage()
  }
  
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.storageKey)
      if (data) {
        const parsed = JSON.parse(data) as SleepRecord[]
        parsed.forEach((record) => this.records.set(record.date, record))
      }
    } catch {
      console.error('Failed to load sleep records from storage')
    }
  }
  
  private saveToStorage(): void {
    const data = Array.from(this.records.values())
    localStorage.setItem(this.storageKey, JSON.stringify(data))
  }
  
  async getSleepRecord(date: string): Promise<SleepRecord | null> {
    return this.records.get(date) || null
  }
  
  async saveSleepRecord(record: SleepRecord): Promise<void> {
    this.records.set(record.date, record)
    this.saveToStorage()
  }
  
  async getSleepRecords(startDate: string, endDate: string): Promise<SleepRecord[]> {
    const result: SleepRecord[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    this.records.forEach((record) => {
      const recordDate = new Date(record.date)
      if (recordDate >= start && recordDate <= end) {
        result.push(record)
      }
    })
    
    return result.sort((a, b) => a.date.localeCompare(b.date))
  }
  
  getSourceType(): string {
    return 'manual'
  }
}

// 将来のFitbit連携用スタブ
export class FitbitSleepDataSource implements ISleepDataSource {
  async getSleepRecord(_date: string): Promise<SleepRecord | null> {
    throw new Error('Fitbit integration not implemented')
  }
  
  async saveSleepRecord(_record: SleepRecord): Promise<void> {
    throw new Error('Fitbit integration not implemented')
  }
  
  async getSleepRecords(_startDate: string, _endDate: string): Promise<SleepRecord[]> {
    throw new Error('Fitbit integration not implemented')
  }
  
  async sync(): Promise<void> {
    // OAuth認証とデータ同期
    throw new Error('Fitbit integration not implemented')
  }
  
  getSourceType(): string {
    return 'fitbit'
  }
}

// デフォルトのデータソース
export const sleepDataSource: ISleepDataSource = new ManualSleepDataSource()