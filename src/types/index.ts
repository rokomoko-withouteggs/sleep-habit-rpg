// ========================================
// 睡眠習慣RPG 型定義
// ========================================

// ========== 基本型 ==========
export type Rarity = 'N' | 'R' | 'SR' | 'SSR'
export type JobType = 'NightGuard' | 'RemAttacker' | 'DreamHealer' | 'NapSupporter'
export type Difficulty = 'EASY' | 'NORMAL' | 'HARD' | 'NIGHTMARE'
export type SleepRank = 'S' | 'A' | 'B' | 'C' | 'D'
export type ActionType = 'attack' | 'skill' | 'ultimate' | 'defend'
export type TargetType = 'single' | 'all' | 'self' | 'ally' | 'allAllies'
export type EffectType = 'damage' | 'heal' | 'buff' | 'debuff'
export type BuffStatType = 'attack' | 'defense' | 'speed' | 'critRate' | 'ultimateGauge'

// ========== キャラクター ==========
export interface CharacterStats {
  hp: number
  attack: number
  defense: number
  speed: number
  critRate: number
}

export interface Character {
  id: string
  name: string
  rarity: Rarity
  job: JobType
  baseStats: CharacterStats
  skillId: string
  ultimateId: string
  passiveId: string
  imageKey: string
  description: string
}

export interface OwnedCharacter {
  characterId: string
  level: number
  experience: number
  equipmentIds: string[]
  skillCardIds: string[]
}

// ========== スキル ==========
export interface SkillEffect {
  type: EffectType
  value: number
  buffStat?: BuffStatType
  duration?: number
}

export interface Skill {
  id: string
  name: string
  description: string
  type: 'passive' | 'active' | 'ultimate'
  targetType: TargetType
  effects: SkillEffect[]
  cooldown?: number
  ultimateCost?: number
}

// ========== 装備 ==========
export interface EquipmentEffect {
  stat: keyof CharacterStats | 'ultimatePower'
  value: number
  isMultiplier: boolean
}

export interface Equipment {
  id: string
  name: string
  type: 'weapon' | 'armor'
  rarity: Rarity
  effects: EquipmentEffect[]
  imageKey: string
  description: string
}

// ========== 敵 ==========
export interface Enemy {
  id: string
  name: string
  hp: number
  attack: number
  defense: number
  speed: number
  imageKey: string
  skills?: string[]
}

// ========== ステージ ==========
export interface StageEnemy {
  enemyId: string
  count: number
}

export interface StageReward {
  exp: number
  gold: number
  dreamStone: number
  materials: { itemId: string; count: number; dropRate: number }[]
  firstClearBonus?: {
    dreamStone: number
    gachaTicket: number
    equipment?: string[]
  }
}

export interface DialogueLine {
  speaker: string
  text: string
  imageKey?: string
}

export interface Stage {
  id: string
  chapterId: string
  stageNumber: number
  name: string
  description: string
  enemies: StageEnemy[]
  rewards: StageReward
  staminaCost: number
  dialogue?: {
    before?: DialogueLine[]
    after?: DialogueLine[]
  }
  unlockConditions?: {
    previousStageId?: string
    playerLevel?: number
    sleepRank?: SleepRank
  }
  isBoss: boolean
  isMiniBoss: boolean
}

export interface Chapter {
  id: string
  number: number
  name: string
  description: string
  stageIds: string[]
  backgroundKey: string
  bgmKey: string
}

// ========== ガチャ ==========
export interface GachaBannerItem {
  type: 'character' | 'equipment' | 'skillCard'
  id: string
  rate: number
}

export interface GachaBanner {
  id: string
  name: string
  description: string
  type: 'standard' | 'limited' | 'pickup'
  items: GachaBannerItem[]
  cost: {
    single: number
    multi: number
  }
  startDate?: string
  endDate?: string
  imageKey: string
}

export interface GachaResult {
  item: GachaBannerItem
  isNew: boolean
  isPityGuarantee: boolean
}

// ========== 睡眠 ==========
export interface SleepRecord {
  date: string
  sleepDuration: number
  bedTime: string
  quality: number
}

export interface SleepScore {
  date: string
  baseScore: number
  regularityBonus: number
  qualityBonus: number
  totalScore: number
  rank: SleepRank
}

// ========== バトル ==========
export interface BattleUnit {
  id: string
  characterId?: string
  enemyId?: string
  isPlayer: boolean
  currentHp: number
  maxHp: number
  attack: number
  defense: number
  speed: number
  critRate: number
  ultimateGauge: number
  buffs: ActiveBuff[]
  skillCooldowns: { [skillId: string]: number }
  isDefending: boolean
}

export interface ActiveBuff {
  effectType: BuffStatType
  value: number
  remainingTurns: number
  isDebuff: boolean
}

export interface BattleAction {
  unitId: string
  actionType: ActionType
  skillId?: string
  targetIds: string[]
}

export interface BattleResult {
  victory: boolean
  turns: number
  expGained: number
  goldGained: number
  droppedItems: { itemId: string; count: number }[]
}

export interface BattleState {
  playerUnits: BattleUnit[]
  enemyUnits: BattleUnit[]
  currentTurn: number
  turnOrder: string[]
  currentActorIndex: number
  phase: 'preparation' | 'action' | 'result'
  isAutoMode: boolean
  log: string[]
}

// ========== 週末ボス ==========
export interface WeekendBoss {
  id: string
  name: string
  hp: number
  attack: number
  defense: number
  requiredExp: number
  rewards: StageReward
  imageKey: string
  availableWeekend: string
}

export interface WeekendRoom {
  roomCode: string
  hostPlayerId: string
  members: {
    odId: string
    nickname: string
    avatarCharacterId: string
    isReady: boolean
  }[]
  bossId: string
  status: 'waiting' | 'inBattle' | 'completed'
  createdAt: string
}

// ========== プレイヤー ==========
export interface PlayerData {
  id: string
  nickname: string
  level: number
  exp: number
  dreamStone: number
  gold: number
  stamina: number
  maxStamina: number
  lastStaminaRecovery: string
  ownedCharacters: OwnedCharacter[]
  ownedEquipment: string[]
  ownedSkillCards: string[]
  storyProgress: { [chapterId: string]: string[] }
  sleepRecords: SleepRecord[]
  sleepScores: SleepScore[]
  formations: Formation[]
  tutorialCompleted: boolean
  createdAt: string
  lastLoginAt: string
}

export interface Formation {
  id: string
  name: string
  characterIds: (string | null)[]
  isStory: boolean
  isWeekendBoss: boolean
}

// ========== チュートリアル ==========
export interface TutorialStep {
  id: string
  message: string
  targetElement?: string
  action?: 'click' | 'input' | 'next'
  nextStepId?: string
}

export interface Tutorial {
  id: string
  name: string
  steps: TutorialStep[]
}

// ========== ゲーム設定 ==========
export interface GameConfig {
  maxStamina: number
  staminaRecoveryMinutes: number
  maxPartySize: number
  ultimateGaugeMax: number
  defendDamageReduction: number
  sleepScoreThresholds: {
    S: number
    A: number
    B: number
    C: number
  }
  expTable: number[]
}

// ========== イベント/通知 ==========
export interface GameEvent {
  id: string
  type: 'info' | 'reward' | 'warning'
  title: string
  message: string
  timestamp: string
}