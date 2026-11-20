// ========================================
// バトル計算ロジック
// 仕様書のダメージ計算式に準拠
// ========================================

import { BattleUnit, ActiveBuff, BuffStatType } from '../types'

/**
 * バフ込みのステータスを計算
 */
export function getBuffedStat(unit: BattleUnit, stat: BuffStatType): number {
  let baseValue: number
  
  switch (stat) {
    case 'attack':
      baseValue = unit.attack
      break
    case 'defense':
      baseValue = unit.defense
      break
    case 'speed':
      baseValue = unit.speed
      break
    case 'critRate':
      baseValue = unit.critRate
      break
    case 'ultimateGauge':
      baseValue = unit.ultimateGauge
      break
    default:
      baseValue = 0
  }
  
  // バフ/デバフを適用
  let totalModifier = 0
  unit.buffs.forEach((buff) => {
    if (buff.effectType === stat) {
      if (buff.isDebuff) {
        totalModifier -= buff.value
      } else {
        totalModifier += buff.value
      }
    }
  })
  
  // パーセンテージ修正を適用（最低10%）
  const modifier = Math.max(0.1, 1 + totalModifier / 100)
  return Math.round(baseValue * modifier)
}

/**
 * 通常攻撃ダメージを計算
 * 仕様書: ダメージ = ATK × 係数 − DEF × 0.5
 */
export function calculateNormalDamage(
  attacker: BattleUnit,
  defender: BattleUnit,
  coefficient: number = 1.0
): number {
  const attack = getBuffedStat(attacker, 'attack')
  const defense = getBuffedStat(defender, 'defense')
  
  let damage = attack * coefficient - defense * 0.5
  
  // クリティカル判定
  const critRate = getBuffedStat(attacker, 'critRate')
  const isCrit = Math.random() * 100 < critRate
  if (isCrit) {
    damage *= 1.5
  }
  
  // 防御中なら1/5に軽減
  if (defender.isDefending) {
    damage *= 0.2
  }
  
  // 最低ダメージは1
  return Math.max(1, Math.round(damage))
}

/**
 * スキルダメージを計算
 * 仕様書: ダメージ = ATK × スキル係数 − DEF × 0.3
 */
export function calculateSkillDamage(
  attacker: BattleUnit,
  defender: BattleUnit,
  skillCoefficient: number
): number {
  const attack = getBuffedStat(attacker, 'attack')
  const defense = getBuffedStat(defender, 'defense')
  
  let damage = attack * skillCoefficient - defense * 0.3
  
  // クリティカル判定
  const critRate = getBuffedStat(attacker, 'critRate')
  const isCrit = Math.random() * 100 < critRate
  if (isCrit) {
    damage *= 1.5
  }
  
  // 防御中なら1/5に軽減
  if (defender.isDefending) {
    damage *= 0.2
  }
  
  return Math.max(1, Math.round(damage))
}

/**
 * 必殺技ダメージを計算
 * 仕様書: ダメージ = ATK × 必殺係数 × (1 + 装備効果)
 */
export function calculateUltimateDamage(
  attacker: BattleUnit,
  defender: BattleUnit,
  ultimateCoefficient: number,
  equipmentBonus: number = 0  // 例: 0.1 = 10%アップ
): number {
  const attack = getBuffedStat(attacker, 'attack')
  const defense = getBuffedStat(defender, 'defense')
  
  let damage = attack * ultimateCoefficient * (1 + equipmentBonus) - defense * 0.2
  
  // 必殺技は確定クリティカル
  damage *= 1.5
  
  // 防御中でも軽減は1/3
  if (defender.isDefending) {
    damage *= 0.33
  }
  
  return Math.max(1, Math.round(damage))
}

/**
 * 回復量を計算
 */
export function calculateHeal(
  healer: BattleUnit,
  _target: BattleUnit,
  healCoefficient: number
): number {
  const attack = getBuffedStat(healer, 'attack')
  return Math.round(attack * healCoefficient)
}

/**
 * 行動順を決定（速度順）
 */
export function determineTurnOrder(units: BattleUnit[]): string[] {
  const aliveUnits = units.filter((u) => u.currentHp > 0)
  
  // 速度でソート（同速度ならランダム）
  const sorted = [...aliveUnits].sort((a, b) => {
    const speedA = getBuffedStat(a, 'speed')
    const speedB = getBuffedStat(b, 'speed')
    if (speedA !== speedB) {
      return speedB - speedA
    }
    return Math.random() - 0.5
  })
  
  return sorted.map((u) => u.id)
}

/**
 * バフのターン経過処理
 */
export function processBuffTurns(buffs: ActiveBuff[]): ActiveBuff[] {
  return buffs
    .map((buff) => ({
      ...buff,
      remainingTurns: buff.remainingTurns - 1,
    }))
    .filter((buff) => buff.remainingTurns > 0)
}

/**
 * 必殺ゲージを更新
 * 仕様書: 攻撃する/されるで +1、最大5で必殺可能
 */
export function updateUltimateGauge(
  unit: BattleUnit,
  amount: number,
  maxGauge: number = 5
): number {
  const newGauge = Math.min(maxGauge, Math.max(0, unit.ultimateGauge + amount))
  return newGauge
}

/**
 * ユニットが行動可能かチェック
 */
export function canAct(unit: BattleUnit): boolean {
  return unit.currentHp > 0
}

/**
 * 必殺技が使用可能かチェック
 */
export function canUseUltimate(unit: BattleUnit, requiredGauge: number = 5): boolean {
  return unit.ultimateGauge >= requiredGauge && unit.currentHp > 0
}

/**
 * スキルが使用可能かチェック（CT確認）
 */
export function canUseSkill(unit: BattleUnit, skillId: string): boolean {
  const cooldown = unit.skillCooldowns[skillId] || 0
  return cooldown === 0 && unit.currentHp > 0
}

/**
 * ダメージを適用
 */
export function applyDamage(unit: BattleUnit, damage: number): BattleUnit {
  const newHp = Math.max(0, unit.currentHp - damage)
  return {
    ...unit,
    currentHp: newHp,
    // 被ダメージで必殺ゲージ+1
    ultimateGauge: updateUltimateGauge(unit, 1),
  }
}

/**
 * 回復を適用
 */
export function applyHeal(unit: BattleUnit, healAmount: number): BattleUnit {
  const newHp = Math.min(unit.maxHp, unit.currentHp + healAmount)
  return {
    ...unit,
    currentHp: newHp,
  }
}

/**
 * バフを適用
 */
export function applyBuff(
  unit: BattleUnit,
  buffType: BuffStatType,
  value: number,
  duration: number,
  isDebuff: boolean = false
): BattleUnit {
  const newBuff: ActiveBuff = {
    effectType: buffType,
    value,
    remainingTurns: duration,
    isDebuff,
  }
  
  return {
    ...unit,
    buffs: [...unit.buffs, newBuff],
  }
}

/**
 * 防御状態を設定
 */
export function setDefending(unit: BattleUnit, isDefending: boolean): BattleUnit {
  return {
    ...unit,
    isDefending,
  }
}

/**
 * 戦闘結果の経験値を計算
 */
export function calculateBattleExp(
  enemyLevels: number[],
  playerLevel: number,
  victory: boolean
): number {
  if (!victory) return 0
  
  const baseExp = enemyLevels.reduce((sum, level) => {
    const levelDiff = level - playerLevel
    const modifier = 1 + levelDiff * 0.1
    return sum + Math.round(10 * level * Math.max(0.5, modifier))
  }, 0)
  
  return baseExp
}

/**
 * セミオート行動を決定
 */
export function determineAutoAction(
  unit: BattleUnit,
  allies: BattleUnit[],
  enemies: BattleUnit[],
  _availableSkills: string[]
): { actionType: 'attack' | 'skill' | 'ultimate' | 'defend'; targetId: string; skillId?: string } {
  const aliveEnemies = enemies.filter((e) => e.currentHp > 0)
  const aliveAllies = allies.filter((a) => a.currentHp > 0)
  
  if (aliveEnemies.length === 0) {
    return { actionType: 'defend', targetId: unit.id }
  }
  
  // 必殺技が使えるなら使う
  if (canUseUltimate(unit)) {
    // HPが一番低い敵を狙う
    const target = [...aliveEnemies].sort((a, b) => a.currentHp - b.currentHp)[0]
    return { actionType: 'ultimate', targetId: target.id }
  }
  
  // HPが低い味方がいたら回復（ヒーラーの場合）
  const lowHpAlly = aliveAllies.find((a) => a.currentHp / a.maxHp < 0.3)
  if (lowHpAlly && unit.id !== lowHpAlly.id) {
    // スキルで回復できるならスキル使用（簡略化）
  }
  
  // 通常攻撃
  const target = [...aliveEnemies].sort((a, b) => a.currentHp - b.currentHp)[0]
  return { actionType: 'attack', targetId: target.id }
}