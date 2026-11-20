// ========================================
// Storage抽象化レイヤー
// 将来的にサーバーやDBに差し替え可能
// ========================================

export interface IStorage {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>
}

// localStorage実装
export class LocalStorageAdapter implements IStorage {
  private prefix: string

  constructor(prefix: string = 'sleep_rpg_') {
    this.prefix = prefix
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.getKey(key))
      if (item === null) return null
      return JSON.parse(item) as T
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(this.getKey(key), JSON.stringify(value))
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(this.getKey(key))
  }

  async clear(): Promise<void> {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }

  async keys(): Promise<string[]> {
    const result: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        result.push(key.substring(this.prefix.length))
      }
    }
    return result
  }
}

// 将来のサーバー実装用のスタブ
export class ServerStorageAdapter implements IStorage {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async get<T>(key: string): Promise<T | null> {
    // 将来実装: fetch(`${this.baseUrl}/storage/${key}`)
    throw new Error('Server storage not implemented')
  }

  async set<T>(key: string, _value: T): Promise<void> {
    // 将来実装: fetch(`${this.baseUrl}/storage/${key}`, { method: 'PUT', body: JSON.stringify(value) })
    throw new Error(`Server storage not implemented for key: ${key}`)
  }

  async remove(key: string): Promise<void> {
    throw new Error(`Server storage not implemented for key: ${key}`)
  }

  async clear(): Promise<void> {
    throw new Error('Server storage not implemented')
  }

  async keys(): Promise<string[]> {
    throw new Error('Server storage not implemented')
  }
}

// デフォルトストレージインスタンス
export const storage: IStorage = new LocalStorageAdapter()