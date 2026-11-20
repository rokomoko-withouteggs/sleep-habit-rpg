// ========================================
// Zustand ゲーム状態管理ストア
// ========================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import {
  PlayerData,
  OwnedCharacter,
  SleepRecord,
  SleepScore,
  Formation,
  BattleState,
  BattleUnit,
  GameEvent,
} from '@/types'
import { calculateSleepScore, calculateSleepRewards } from '@/utils/sleepScore'

interface GameState {
  // プレイヤーデータ
  player: PlayerData | null
  
  // 現在のバトル状態
  battleState: BattleState | null
  
  // 通知/イベント
  events: GameEvent[]
  
  // ローディング状態
  isLoading: boolean
  
  // エラー
  error: string | null
}

interface GameActions {
  // プレイヤー関連
  initializePlayer: (nickname: string) => void
  updatePlayer: (updates: Partial<PlayerData>) => void
  addDreamStone: (amount: number) => void
  spendDreamStone: (amount: number) => boolean
  addStamina: (amount: number) => void
  spendStamina: (amount: number) => boolean
  addExp: (amount: number) => void
  
  // キャラクター関連
  addCharacter: (characterId: string) => void
  levelUpCharacter: (characterId: string, expGain: number) => void
  equipItem: (characterId: string, equipmentId: string, slot: number) => void
  
  // 睡眠関連
  recordSleep: (record: SleepRecord) => SleepScore
  getSleepRecords: (days: number) => SleepRecord[]
  getLatestSleepScore: () => SleepScore | null
  
  // 編成関連
  updateFormation: (formation: Formation) => void
  getFormation: (formationId: string) => Formation | null
  
  // バトル関連
  initBattle: (playerUnits: BattleUnit[], enemyUnits: BattleUnit[]) => void
  updateBattleState: (updates: Partial<BattleState>) => void
  endBattle: () => void
  
  // 進行関連
  completeStage: (chapterId: string, stageId: string) => void
  isStageCompleted: (chapterId: string, stageId: string) => boolean
  completeTutorial: () => void
  
  // イベント関連
  addEvent: (event: Omit<GameEvent, 'id' | 'timestamp'>) => void
  clearEvents: () => void
  
  // ユーティリティ
  resetGame: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

const initialPlayerData = (nickname: string): PlayerData => ({
  id: uuidv4(),
  nickname,
  level: 1,
  exp: 0,
  dreamStone: 1000,  // 初期ボーナス
  gold: 5000,
  stamina: 100,
  maxStamina: 100,
  lastStaminaRecovery: new Date().toISOString(),
  ownedCharacters: [],
   ownedEquipment: [],
   ownedSkillCards: [],
   storyProgress: {},
   sleepRecords: [],
   sleepScores: [],
   formations: [
     {
       id: 'story-1',
       name: 'ストーリー編成1',
       characterIds: [null, null, null, null],
       isStory: true,
       isWeekendBoss: false,
     },
     {
       id: 'weekend-1',
       name: '週末ボス編成',
       characterIds: [null, null, null, null],
       isStory: false,
       isWeekendBoss: true,
     },
   ],
   tutorialCompleted: false,
   createdAt: new Date().toISOString(),
   lastLoginAt: new Date().toISOString(),
 })
 
 // 経験値テーブル（レベルごとの必要経験値）
 const EXP_TABLE = [
   0, 100, 200, 350, 500, 700, 900, 1200, 1500, 2000,
   2500, 3000, 3600, 4200, 5000, 6000, 7000, 8500, 10000, 12000,
   14000, 16500, 19000, 22000, 25000, 28500, 32000, 36000, 40000, 45000,
 ]
 
 export const useGameStore = create<GameState & GameActions>()(
   persist(
     (set, get) => ({
       // 初期状態
       player: null,
       battleState: null,
       events: [],
       isLoading: false,
       error: null,
 
       // プレイヤー初期化
       initializePlayer: (nickname: string) => {
         const player = initialPlayerData(nickname)
         set({ player })
       },
 
       // プレイヤー更新
       updatePlayer: (updates: Partial<PlayerData>) => {
         const { player } = get()
         if (!player) return
         set({ player: { ...player, ...updates } })
       },
 
       // ドリームストーン追加
       addDreamStone: (amount: number) => {
         const { player } = get()
         if (!player) return
         set({ player: { ...player, dreamStone: player.dreamStone + amount } })
       },
 
       // ドリームストーン消費
       spendDreamStone: (amount: number) => {
         const { player } = get()
         if (!player || player.dreamStone < amount) return false
         set({ player: { ...player, dreamStone: player.dreamStone - amount } })
         return true
       },
 
       // スタミナ追加
       addStamina: (amount: number) => {
         const { player } = get()
         if (!player) return
         const newStamina = Math.min(player.maxStamina, player.stamina + amount)
         set({ player: { ...player, stamina: newStamina } })
       },
 
       // スタミナ消費
       spendStamina: (amount: number) => {
         const { player } = get()
         if (!player || player.stamina < amount) return false
         set({ player: { ...player, stamina: player.stamina - amount } })
         return true
       },
 
       // 経験値追加とレベルアップ処理
       addExp: (amount: number) => {
         const { player, addEvent } = get()
         if (!player) return
 
         let newExp = player.exp + amount
         let newLevel = player.level
         let newMaxStamina = player.maxStamina
 
         // レベルアップ判定
         while (newLevel < EXP_TABLE.length && newExp >= EXP_TABLE[newLevel]) {
           newExp -= EXP_TABLE[newLevel]
           newLevel++
           newMaxStamina += 5
 
           addEvent({
             type: 'reward',
             title: 'レベルアップ！',
             message: `レベル ${newLevel} になりました！`,
           })
         }
 
         set({
           player: {
             ...player,
             exp: newExp,
             level: newLevel,
             maxStamina: newMaxStamina,
             stamina: newLevel > player.level ? newMaxStamina : player.stamina,
           },
         })
       },
 
       // キャラクター追加
       addCharacter: (characterId: string) => {
         const { player } = get()
         if (!player) return
 
         const existing = player.ownedCharacters.find((c) => c.characterId === characterId)
         if (existing) {
           // 既に所持している場合は重ね（将来的に凸システム）
           return
         }
 
         const newCharacter: OwnedCharacter = {
           characterId,
           level: 1,
           experience: 0,
           equipmentIds: [],
           skillCardIds: [],
         }
 
         set({
           player: {
             ...player,
             ownedCharacters: [...player.ownedCharacters, newCharacter],
           },
         })
       },
 
       // キャラクターレベルアップ
       levelUpCharacter: (characterId: string, expGain: number) => {
         const { player } = get()
         if (!player) return
 
         const updatedCharacters = player.ownedCharacters.map((char) => {
           if (char.characterId !== characterId) return char
 
           let newExp = char.experience + expGain
           let newLevel = char.level
 
           // 簡易的なキャラレベルアップ（キャラ用の経験値テーブル）
           const charExpRequired = newLevel * 100
           while (newExp >= charExpRequired && newLevel < 100) {
             newExp -= charExpRequired
             newLevel++
           }
 
           return { ...char, level: newLevel, experience: newExp }
         })
 
         set({ player: { ...player, ownedCharacters: updatedCharacters } })
       },
 
       // 装備装着
       equipItem: (characterId: string, equipmentId: string, slot: number) => {
         const { player } = get()
         if (!player) return
 
         const updatedCharacters = player.ownedCharacters.map((char) => {
           if (char.characterId !== characterId) return char
 
           const newEquipmentIds = [...char.equipmentIds]
           newEquipmentIds[slot] = equipmentId
           return { ...char, equipmentIds: newEquipmentIds }
         })
 
         set({ player: { ...player, ownedCharacters: updatedCharacters } })
       },
 
       // 睡眠記録
       recordSleep: (record: SleepRecord) => {
         const { player, addEvent, addDreamStone, addStamina, addExp } = get()
         if (!player) throw new Error('Player not initialized')
 
         // スコア計算
         const score = calculateSleepScore(record, player.sleepRecords)
         const rewards = calculateSleepRewards(score)
 
         // 記録を保存
         const updatedRecords = [...player.sleepRecords, record]
         const updatedScores = [...player.sleepScores, score]
 
         set({
           player: {
             ...player,
             sleepRecords: updatedRecords,
             sleepScores: updatedScores,
           },
         })
 
         // 報酬付与
         addDreamStone(rewards.dreamStone)
         addStamina(rewards.stamina)
         addExp(rewards.exp)
 
         addEvent({
           type: 'reward',
           title: `睡眠スコア: ${score.rank}ランク`,
           message: `スコア ${score.totalScore}点！ドリームストーン +${rewards.dreamStone}`,
         })
 
         return score
       },
 
       // 睡眠記録取得
       getSleepRecords: (days: number) => {
         const { player } = get()
         if (!player) return []
 
         const cutoffDate = new Date()
         cutoffDate.setDate(cutoffDate.getDate() - days)
 
         return player.sleepRecords.filter((r) => new Date(r.date) >= cutoffDate)
       },
 
       // 最新の睡眠スコア取得
       getLatestSleepScore: () => {
         const { player } = get()
         if (!player || player.sleepScores.length === 0) return null
         return player.sleepScores[player.sleepScores.length - 1]
       },
 
       // 編成更新
       updateFormation: (formation: Formation) => {
         const { player } = get()
         if (!player) return
 
         const updatedFormations = player.formations.map((f) =>
           f.id === formation.id ? formation : f
         )
 
         // 存在しない場合は追加
         if (!player.formations.find((f) => f.id === formation.id)) {
           updatedFormations.push(formation)
         }
 
         set({ player: { ...player, formations: updatedFormations } })
       },
 
       // 編成取得
       getFormation: (formationId: string) => {
         const { player } = get()
         if (!player) return null
         return player.formations.find((f) => f.id === formationId) || null
       },
 
       // バトル初期化
       initBattle: (playerUnits: BattleUnit[], enemyUnits: BattleUnit[]) => {
         const allUnits = [...playerUnits, ...enemyUnits]
         const turnOrder = allUnits
           .sort((a, b) => b.speed - a.speed)
           .map((u) => u.id)
 
         set({
           battleState: {
             playerUnits,
             enemyUnits,
             currentTurn: 1,
             turnOrder,
             currentActorIndex: 0,
             phase: 'action',
             isAutoMode: false,
             log: ['バトル開始！'],
           },
         })
       },
 
       // バトル状態更新
       updateBattleState: (updates: Partial<BattleState>) => {
         const { battleState } = get()
         if (!battleState) return
         set({ battleState: { ...battleState, ...updates } })
       },
 
       // バトル終了
       endBattle: () => {
         set({ battleState: null })
       },
 
       // ステージクリア
       completeStage: (chapterId: string, stageId: string) => {
         const { player } = get()
         if (!player) return
 
         const currentProgress = player.storyProgress[chapterId] || []
         if (!currentProgress.includes(stageId)) {
           set({
             player: {
               ...player,
               storyProgress: {
                 ...player.storyProgress,
                 [chapterId]: [...currentProgress, stageId],
               },
             },
           })
         }
       },
 
       // ステージクリア確認
       isStageCompleted: (chapterId: string, stageId: string) => {
         const { player } = get()
         if (!player) return false
         return player.storyProgress[chapterId]?.includes(stageId) || false
       },
 
       // チュートリアル完了
       completeTutorial: () => {
         const { player } = get()
         if (!player) return
         set({ player: { ...player, tutorialCompleted: true } })
       },
 
       // イベント追加
       addEvent: (event: Omit<GameEvent, 'id' | 'timestamp'>) => {
         const newEvent: GameEvent = {
           ...event,
           id: uuidv4(),
           timestamp: new Date().toISOString(),
         }
         set((state) => ({ events: [...state.events, newEvent] }))
       },
 
       // イベントクリア
       clearEvents: () => {
         set({ events: [] })
       },
 
       // ゲームリセット
       resetGame: () => {
         set({
           player: null,
           battleState: null,
           events: [],
           isLoading: false,
           error: null,
         })
       },
 
       // ローディング設定
       setLoading: (loading: boolean) => {
         set({ isLoading: loading })
       },
 
       // エラー設定
       setError: (error: string | null) => {
         set({ error })
       },
     }),
     {
       name: 'sleep-rpg-storage',
       partialize: (state) => ({
         player: state.player,
       }),
     }
   )
 )