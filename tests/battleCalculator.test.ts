import { describe, it, expect } from 'vitest'
import {
  calculateNormalDamage,
  calculateSkillDamage,
  calculateUltimateDamage,
  calculateHeal,
  determineTurnOrder,
  processBuffTurns,
  updateUltimateGauge,
  canUseUltimate,
  applyDamage,
  applyHeal,
  applyBuff,
  setDefending,
} from '../src/utils/battleCalculator'
import { BattleUnit, ActiveBuff } from '../src/types'

const createMockUnit = (overrides: Partial<BattleUnit> = {}): BattleUnit => ({
  id: 'test_unit',
  isPlayer: true,
  currentHp: 1000,
  maxHp: 1000,
  attack: 100,
  defense: 50,
  speed: 50, critRate: 10,
  ultimateGauge: 0,
  buffs: [],
  skillCooldowns: {},
  isDefending: false,
  ...overrides,
})

describe('バトル計算', () => {
  describe('calculateNormalDamage', () => {
    it('基本ダメージ計算が正しい', () => {
      const attacker = createMockUnit({ attack: 100, critRate: 0 })
      const defender = createMockUnit({ defense: 50 })

      const damage = calculateNormalDamage(attacker, defender)
      expect(damage).toBeGreaterThanOrEqual(75)
      expect(damage).toBeLessThanOrEqual(113)
    })

    it('防御中は被ダメージが1/5になる', () => {
      const attacker = createMockUnit({ attack: 100, critRate: 0 })
      const defender = createMockUnit({ defense: 50, isDefending: true })

      const damage = calculateNormalDamage(attacker, defender)
      expect(damage).toBeLessThanOrEqual(23)
    })

    it('最低ダメージは1', () => {
      const attacker = createMockUnit({ attack: 10, critRate: 0 })
      const defender = createMockUnit({ defense: 1000 })

      const damage = calculateNormalDamage(attacker, defender)
      expect(damage).toBeGreaterThanOrEqual(1)
    })
  })

  describe('calculateSkillDamage', () => {
    it('スキル係数が反映される', () => {
      const attacker = createMockUnit({ attack: 100, critRate: 0 })
      const defender = createMockUnit({ defense: 50 })

      const damage = calculateSkillDamage(attacker, defender, 1.5)
      expect(damage).toBeGreaterThanOrEqual(135)
    })
  })

  describe('calculateUltimateDamage', () => {
    it('必殺技係数と装備ボーナスが反映される', () => {
      const attacker = createMockUnit({ attack: 100 })
      const defender = createMockUnit({ defense: 50 })

      const damage = calculateUltimateDamage(attacker, defender, 2.5, 0.1)
      expect(damage).toBeGreaterThanOrEqual(390)
    })
  })

  describe('calculateHeal', () => {
    it('回復量が正しく計算される', () => {
      const healer = createMockUnit({ attack: 100 })
      const target = createMockUnit()

      const heal = calculateHeal(healer, target, 1.5)
      expect(heal).toBe(150)
    })
  })

  describe('determineTurnOrder', () => {
    it('速度順でソートされる', () => {
      const units: BattleUnit[] = [
        createMockUnit({ id: 'slow', speed: 30 }),
        createMockUnit({ id: 'fast', speed: 100 }),
        createMockUnit({ id: 'medium', speed: 50 }),
      ]

      const order = determineTurnOrder(units)
      expect(order[0]).toBe('fast')
      expect(order[1]).toBe('medium')
      expect(order[2]).toBe('slow')
    })

    it('戦闘不能ユニットは除外される', () => {
      const units: BattleUnit[] = [
        createMockUnit({ id: 'alive', speed: 50, currentHp: 100 }),
        createMockUnit({ id: 'dead', speed: 100, currentHp: 0 }),
      ]

      const order = determineTurnOrder(units)
      expect(order).toHaveLength(1)
      expect(order[0]).toBe('alive')
    })
  })

  describe('processBuffTurns', () => {
    it('バフのターン数が減少する', () => {
      const buffs: ActiveBuff[] = [
        { effectType: 'attack', value: 20, remainingTurns: 3, isDebuff: false },
        { effectType: 'defense', value: 10, remainingTurns: 1, isDebuff: false },
      ]

      const processed = processBuffTurns(buffs)
      expect(processed).toHaveLength(1)
      expect(processed[0].remainingTurns).toBe(2)
    })

    it('ターン数0になったバフは削除される', () => {
      const buffs: ActiveBuff[] = [
        { effectType: 'attack', value: 20, remainingTurns: 1, isDebuff: false },
      ]

      const processed = processBuffTurns(buffs)
      expect(processed).toHaveLength(0)
    })
  })

  describe('updateUltimateGauge', () => {
    it('ゲージが正しく増加する', () => {
      const unit = createMockUnit({ ultimateGauge: 2 })
      const newGauge = updateUltimateGauge(unit, 1)
      expect(newGauge).toBe(3)
    })

    it('ゲージは最大値を超えない', () => {
      const unit = createMockUnit({ ultimateGauge: 4 })
      const newGauge = updateUltimateGauge(unit, 3, 5)
      expect(newGauge).toBe(5)
    })

    it('ゲージは0未満にならない', () => {
      const unit = createMockUnit({ ultimateGauge: 2 })
      const newGauge = updateUltimateGauge(unit, -5)
      expect(newGauge).toBe(0)
    })
  })

  describe('canUseUltimate', () => {
    it('ゲージが5以上で使用可能', () => {
      const unit = createMockUnit({ ultimateGauge: 5, currentHp: 100 })
      expect(canUseUltimate(unit)).toBe(true)
    })

    it('ゲージが5未満で使用不可', () => {
      const unit = createMockUnit({ ultimateGauge: 4, currentHp: 100 })
      expect(canUseUltimate(unit)).toBe(false)
    })

    it('戦闘不能時は使用不可', () => {
      const unit = createMockUnit({ ultimateGauge: 5, currentHp: 0 })
      expect(canUseUltimate(unit)).toBe(false)
    })
  })

  describe('applyDamage', () => {
    it('ダメージが正しく適用される', () => {
      const unit = createMockUnit({ currentHp: 100 })
      const damaged = applyDamage(unit, 30)
      expect(damaged.currentHp).toBe(70)
    })

    it('HPは0未満にならない', () => {
      const unit = createMockUnit({ currentHp: 50 })
      const damaged = applyDamage(unit, 100)
      expect(damaged.currentHp).toBe(0)
    })

    it('被ダメージで必殺ゲージが+1される', () => {
      const unit = createMockUnit({ ultimateGauge: 2 })
      const damaged = applyDamage(unit, 10)
      expect(damaged.ultimateGauge).toBe(3)
    })
  })

  describe('applyHeal', () => {
    it('回復が正しく適用される', () => {
      const unit = createMockUnit({ currentHp: 500, maxHp: 1000 })
      const healed = applyHeal(unit, 200)
      expect(healed.currentHp).toBe(700)
    })

    it('HPは最大値を超えない', () => {
      const unit = createMockUnit({ currentHp: 900, maxHp: 1000 })
      const healed = applyHeal(unit, 200)
      expect(healed.currentHp).toBe(1000)
    })
  })

  describe('applyBuff', () => {
    it('バフが正しく適用される', () => {
      const unit = createMockUnit({ buffs: [] })
      const buffed = applyBuff(unit, 'attack', 20, 3, false)
      
      expect(buffed.buffs).toHaveLength(1)
      expect(buffed.buffs[0].effectType).toBe('attack')
      expect(buffed.buffs[0].value).toBe(20)
      expect(buffed.buffs[0].remainingTurns).toBe(3)
      expect(buffed.buffs[0].isDebuff).toBe(false)
    })
  })

  describe('setDefending', () => {
    it('防御状態が正しく設定される', () => {
      const unit = createMockUnit({ isDefending: false })
      const defending = setDefending(unit, true)
      expect(defending.isDefending).toBe(true)
    })

    it('防御状態が正しく解除される', () => {
      const unit = createMockUnit({ isDefending: true })
      const notDefending = setDefending(unit, false)
      expect(notDefending.isDefending).toBe(false)
    })
  })
})
EOF