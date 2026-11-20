import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import { BattleUnit, BattleAction, Stage, Enemy, Character, DialogueLine } from '@/types'
import { 
  calculateNormalDamage, 
  calculateSkillDamage,
  calculateUltimateDamage,
  determineTurnOrder,
  processBuffTurns,
  applyDamage,
  applyHeal,
  setDefending,
  canUseUltimate,
  determineAutoAction
} from '@/utils/battleCalculator'
import stagesData from '@data/stages/stages.json'
import enemiesData from '@data/enemies/enemies.json'
import charactersData from '@data/characters/characters.json'
import './BattlePage.css'

type BattlePhase = 'dialogue-before' | 'preparation' | 'battle' | 'dialogue-after' | 'result'

export const BattlePage: React.FC = () => {
  const { stageId } = useParams<{ stageId: string }>()
  const navigate = useNavigate()
  
  const player = useGameStore((state) => state.player)
  const spendStamina = useGameStore((state) => state.spendStamina)
  const addExp = useGameStore((state) => state.addExp)
  const addDreamStone = useGameStore((state) => state.addDreamStone)
  const completeStage = useGameStore((state) => state.completeStage)
  const isStageCompleted = useGameStore((state) => state.isStageCompleted)
  const getFormation = useGameStore((state) => state.getFormation)

  const [phase, setPhase] = useState<BattlePhase>('dialogue-before')
  const [playerUnits, setPlayerUnits] = useState<BattleUnit[]>([])
  const [enemyUnits, setEnemyUnits] = useState<BattleUnit[]>([])
  const [turnOrder, setTurnOrder] = useState<string[]>([])
  const [currentActorIndex, setCurrentActorIndex] = useState(0)
  const [currentTurn, setCurrentTurn] = useState(1)
  const [selectedAction, setSelectedAction] = useState<'attack' | 'skill' | 'ultimate' | 'defend' | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [isAutoMode, setIsAutoMode] = useState(false)
  const [battleLog, setBattleLog] = useState<string[]>([])
  const [dialogueIndex, setDialogueIndex] = useState(0)
  const [victory, setVictory] = useState(false)
  const [damageNumbers, setDamageNumbers] = useState<{ id: string; value: number; type: 'damage' | 'heal' | 'crit'; targetId: string }[]>([])

  // ステージデータ取得
  const stage = stagesData.stages.find((s) => s.id === stageId) as Stage | undefined
  const isFirstClear = stage ? !isStageCompleted(stage.chapterId, stage.id) : false

  // 初期化
  useEffect(() => {
    if (!stage || !player) {
      navigate('/story')
      return
    }

    // スタミナチェック
    if (player.stamina < stage.staminaCost) {
      alert('スタミナが足りません')
      navigate('/story')
      return
    }

    // 会話があるかチェック
    if (stage.dialogue?.before && stage.dialogue.before.length > 0) {
      setPhase('dialogue-before')
    } else {
      initializeBattle()
    }
  }, [stageId])

  const initializeBattle = useCallback(() => {
    if (!stage || !player) return

    // スタミナ消費
    spendStamina(stage.staminaCost)

    // プレイヤーユニット作成
    const formation = getFormation('story-1')
    const characters = charactersData.characters as Character[]
    
    const pUnits: BattleUnit[] = []
    
    // 編成からキャラを取得、なければ所持キャラから
    const characterIds = formation?.characterIds.filter(Boolean) || []
    const usedCharIds = characterIds.length > 0 
      ? characterIds 
      : player.ownedCharacters.slice(0, 4).map((c) => c.characterId)

    usedCharIds.forEach((charId, index) => {
      if (!charId) return
      
      const charData = characters.find((c) => c.id === charId)
      const ownedChar = player.ownedCharacters.find((c) => c.characterId === charId)
      
      if (charData && ownedChar) {
        const levelMultiplier = 1 + (ownedChar.level - 1) * 0.1
        pUnits.push({
          id: `player_${index}`,
          characterId: charId,
          isPlayer: true,
          currentHp: Math.round(charData.baseStats.hp * levelMultiplier),
          maxHp: Math.round(charData.baseStats.hp * levelMultiplier),
          attack: Math.round(charData.baseStats.attack * levelMultiplier),
          defense: Math.round(charData.baseStats.defense * levelMultiplier),
          speed: charData.baseStats.speed,
          critRate: charData.baseStats.critRate,
          ultimateGauge: 0,
          buffs: [],
          skillCooldowns: {},
          isDefending: false,
        })
      }
    })

    // プレイヤーキャラがいない場合、デフォルトキャラを追加
    if (pUnits.length === 0) {
      const defaultChar = characters.find((c) => c.id === 'char_drowsy')
      if (defaultChar) {
        pUnits.push({
          id: 'player_0',
          characterId: 'char_drowsy',
          isPlayer: true,
          currentHp: defaultChar.baseStats.hp,
          maxHp: defaultChar.baseStats.hp,
          attack: defaultChar.baseStats.attack,
          defense: defaultChar.baseStats.defense,
          speed: defaultChar.baseStats.speed,
          critRate: defaultChar.baseStats.critRate,
          ultimateGauge: 0,
          buffs: [],
          skillCooldowns: {},
          isDefending: false,
        })
      }
    }

    // 敵ユニット作成
    const enemies = enemiesData.enemies as Enemy[]
    const eUnits: BattleUnit[] = []
    let enemyIndex = 0

    stage.enemies.forEach((stageEnemy) => {
      const enemyData = enemies.find((e) => e.id === stageEnemy.enemyId)
      if (enemyData) {
        for (let i = 0; i < stageEnemy.count; i++) {
          eUnits.push({
            id: `enemy_${enemyIndex}`,
            enemyId: stageEnemy.enemyId,
            isPlayer: false,
            currentHp: enemyData.hp,
            maxHp: enemyData.hp,
            attack: enemyData.attack,
            defense: enemyData.defense,
            speed: enemyData.speed,
            critRate: 5,
            ultimateGauge: 0,
            buffs: [],
            skillCooldowns: {},
            isDefending: false,
          })
          enemyIndex++
        }
      }
    })

    setPlayerUnits(pUnits)
    setEnemyUnits(eUnits)

    // 行動順決定
    const allUnits = [...pUnits, ...eUnits]
    const order = determineTurnOrder(allUnits)
    setTurnOrder(order)
    setCurrentActorIndex(0)
    setCurrentTurn(1)
    setBattleLog(['バトル開始！'])
    setPhase('battle')
  }, [stage, player])

  // 現在の行動者
  const currentActor = [...playerUnits, ...enemyUnits].find(
    (u) => u.id === turnOrder[currentActorIndex]
  )

  // ダメージ表示
  const showDamageNumber = (targetId: string, value: number, type: 'damage' | 'heal' | 'crit') => {
    const id = `${Date.now()}_${Math.random()}`
    setDamageNumbers((prev) => [...prev, { id, value, type, targetId }])
    setTimeout(() => {
      setDamageNumbers((prev) => prev.filter((d) => d.id !== id))
    }, 1000)
  }

  // アクション実行
  const executeAction = useCallback((action: BattleAction) => {
    const actor = [...playerUnits, ...enemyUnits].find((u) => u.id === action.unitId)
    if (!actor || actor.currentHp <= 0) {
      nextTurn()
      return
    }

    let newPlayerUnits = [...playerUnits]
    let newEnemyUnits = [...enemyUnits]
    const logs: string[] = []

    const actorName = actor.isPlayer
      ? charactersData.characters.find((c) => c.id === actor.characterId)?.name || 'プレイヤー'
      : enemiesData.enemies.find((e) => e.id === actor.enemyId)?.name || '敵'

    // 防御解除
    if (actor.isPlayer) {
      newPlayerUnits = newPlayerUnits.map((u) =>
        u.id === actor.id ? setDefending(u, false) : u
      )
    } else {
      newEnemyUnits = newEnemyUnits.map((u) =>
        u.id === actor.id ? setDefending(u, false) : u
      )
    }

    switch (action.actionType) {
      case 'attack': {
        action.targetIds.forEach((targetId) => {
          const target = [...newPlayerUnits, ...newEnemyUnits].find((u) => u.id === targetId)
          if (target && target.currentHp > 0) {
            const damage = calculateNormalDamage(actor, target)
            const targetName = target.isPlayer
              ? charactersData.characters.find((c) => c.id === target.characterId)?.name || 'プレイヤー'
              : enemiesData.enemies.find((e) => e.id === target.enemyId)?.name || '敵'

            if (target.isPlayer) {
              newPlayerUnits = newPlayerUnits.map((u) =>
                u.id === targetId ? applyDamage(u, damage) : u
              )
            } else {
              newEnemyUnits = newEnemyUnits.map((u) =>
                u.id === targetId ? applyDamage(u, damage) : u
              )
            }

            logs.push(`${actorName}の攻撃！${targetName}に${damage}ダメージ！`)
            showDamageNumber(targetId, damage, 'damage')

            // 攻撃者のゲージ+1
            if (actor.isPlayer) {
              newPlayerUnits = newPlayerUnits.map((u) =>
                u.id === actor.id ? { ...u, ultimateGauge: Math.min(5, u.ultimateGauge + 1) } : u
              )
            }
          }
        })
        break
      }

      case 'skill': {
        // スキル実装（簡略化）
        action.targetIds.forEach((targetId) => {
          const target = [...newPlayerUnits, ...newEnemyUnits].find((u) => u.id === targetId)
          if (target && target.currentHp > 0) {
            const damage = calculateSkillDamage(actor, target, 1.5)
            
            if (target.isPlayer) {
              newPlayerUnits = newPlayerUnits.map((u) =>
                u.id === targetId ? applyDamage(u, damage) : u
              )
            } else {
              newEnemyUnits = newEnemyUnits.map((u) =>
                u.id === targetId ? applyDamage(u, damage) : u
              )
            }

            logs.push(`${actorName}のスキル攻撃！${damage}ダメージ！`)
            showDamageNumber(targetId, damage, 'crit')
          }
        })
        break
      }

      case 'ultimate': {
        if (actor.ultimateGauge >= 5) {
          action.targetIds.forEach((targetId) => {
            const target = [...newPlayerUnits, ...newEnemyUnits].find((u) => u.id === targetId)
            if (target && target.currentHp > 0) {
              const damage = calculateUltimateDamage(actor, target, 2.5)
              
              if (target.isPlayer) {
                newPlayerUnits = newPlayerUnits.map((u) =>
                  u.id === targetId ? applyDamage(u, damage) : u
                )
              } else {
                newEnemyUnits = newEnemyUnits.map((u) =>
                  u.id === targetId ? applyDamage(u, damage) : u
                )
              }

              logs.push(`${actorName}の必殺技！${damage}の大ダメージ！`)
              showDamageNumber(targetId, damage, 'crit')
            }
          })

          // ゲージ消費
          if (actor.isPlayer) {
            newPlayerUnits = newPlayerUnits.map((u) =>
              u.id === actor.id ? { ...u, ultimateGauge: 0 } : u
            )
          }
        }
        break
      }

      case 'defend': {
        if (actor.isPlayer) {
          newPlayerUnits = newPlayerUnits.map((u) =>
            u.id === actor.id ?setDefending(u, true) : u
                   )
                 } else {
                   newEnemyUnits = newEnemyUnits.map((u) =>
                     u.id === actor.id ? setDefending(u, true) : u
                   )
                 }
                 logs.push(`${actorName}は防御態勢をとった！`)
                 break
               }
             }
         
             setPlayerUnits(newPlayerUnits)
             setEnemyUnits(newEnemyUnits)
             setBattleLog((prev) => [...prev, ...logs])
         
             // 勝敗判定
             setTimeout(() => {
               checkBattleEnd(newPlayerUnits, newEnemyUnits)
             }, 500)
           }, [playerUnits, enemyUnits])
         
           // 次のターンへ
           const nextTurn = useCallback(() => {
             // バフのターン経過処理
             setPlayerUnits((prev) =>
               prev.map((u) => ({ ...u, buffs: processBuffTurns(u.buffs) }))
             )
             setEnemyUnits((prev) =>
               prev.map((u) => ({ ...u, buffs: processBuffTurns(u.buffs) }))
             )
         
             let nextIndex = currentActorIndex + 1
             
             // 全員行動終了したら次のターンへ
             if (nextIndex >= turnOrder.length) {
               nextIndex = 0
               setCurrentTurn((prev) => prev + 1)
               
               // 行動順再計算
               const allUnits = [...playerUnits, ...enemyUnits].filter((u) => u.currentHp > 0)
               const newOrder = determineTurnOrder(allUnits)
               setTurnOrder(newOrder)
             }
         
             setCurrentActorIndex(nextIndex)
             setSelectedAction(null)
             setSelectedTarget(null)
           }, [currentActorIndex, turnOrder, playerUnits, enemyUnits])
         
           // 勝敗判定
           const checkBattleEnd = useCallback((pUnits: BattleUnit[], eUnits: BattleUnit[]) => {
             const playerAlive = pUnits.some((u) => u.currentHp > 0)
             const enemyAlive = eUnits.some((u) => u.currentHp > 0)
         
             if (!enemyAlive) {
               setVictory(true)
               if (stage?.dialogue?.after && stage.dialogue.after.length > 0) {
                 setDialogueIndex(0)
                 setPhase('dialogue-after')
               } else {
                 setPhase('result')
               }
             } else if (!playerAlive) {
               setVictory(false)
               setPhase('result')
             } else {
               nextTurn()
             }
           }, [stage, nextTurn])
         
           // 敵AI行動
           useEffect(() => {
             if (phase !== 'battle') return
             if (!currentActor || currentActor.isPlayer) return
             if (currentActor.currentHp <= 0) {
               nextTurn()
               return
             }
         
             const timer = setTimeout(() => {
               const alivePlayerUnits = playerUnits.filter((u) => u.currentHp > 0)
               if (alivePlayerUnits.length === 0) return
         
               // ランダムにプレイヤーユニットを選択
               const target = alivePlayerUnits[Math.floor(Math.random() * alivePlayerUnits.length)]
               
               executeAction({
                 unitId: currentActor.id,
                 actionType: 'attack',
                 targetIds: [target.id],
               })
             }, 1000)
         
             return () => clearTimeout(timer)
           }, [currentActorIndex, phase, currentActor, playerUnits])
         
           // セミオート
           useEffect(() => {
             if (!isAutoMode || phase !== 'battle') return
             if (!currentActor || !currentActor.isPlayer) return
             if (currentActor.currentHp <= 0) return
         
             const timer = setTimeout(() => {
               const aliveEnemies = enemyUnits.filter((u) => u.currentHp > 0)
               if (aliveEnemies.length === 0) return
         
               const autoAction = determineAutoAction(
                 currentActor,
                 playerUnits,
                 enemyUnits,
                 []
               )
         
               executeAction({
                 unitId: currentActor.id,
                 actionType: autoAction.actionType,
                 targetIds: [autoAction.targetId],
               })
             }, 800)
         
             return () => clearTimeout(timer)
           }, [isAutoMode, currentActorIndex, phase, currentActor, playerUnits, enemyUnits])
         
           // アクション選択
           const handleActionSelect = (action: 'attack' | 'skill' | 'ultimate' | 'defend') => {
             if (action === 'defend') {
               executeAction({
                 unitId: currentActor!.id,
                 actionType: 'defend',
                 targetIds: [currentActor!.id],
               })
             } else if (action === 'ultimate' && currentActor && !canUseUltimate(currentActor)) {
               alert('必殺ゲージが足りません（5必要）')
             } else {
               setSelectedAction(action)
             }
           }
         
           // ターゲット選択
           const handleTargetSelect = (targetId: string) => {
             if (!selectedAction || !currentActor) return
         
             executeAction({
               unitId: currentActor.id,
               actionType: selectedAction,
               targetIds: [targetId],
             })
           }
         
           // 会話進行
           const handleDialogueNext = () => {
             const dialogues = phase === 'dialogue-before' 
               ? stage?.dialogue?.before 
               : stage?.dialogue?.after
         
             if (!dialogues) return
         
             if (dialogueIndex < dialogues.length - 1) {
               setDialogueIndex(dialogueIndex + 1)
             } else {
               if (phase === 'dialogue-before') {
                 initializeBattle()
               } else {
                 setPhase('result')
               }
             }
           }
         
           // 結果処理
           const handleResultClose = () => {
             if (victory && stage) {
               // 報酬付与
               addExp(stage.rewards.exp)
               addDreamStone(stage.rewards.dreamStone)
               
               // 初クリアボーナス
               if (isFirstClear && stage.rewards.firstClearBonus) {
                 addDreamStone(stage.rewards.firstClearBonus.dreamStone)
               }
               
               // クリア記録
               completeStage(stage.chapterId, stage.id)
             }
             
             navigate('/story')
           }
         
           // キャラ名取得
           const getUnitName = (unit: BattleUnit): string => {
             if (unit.isPlayer) {
               return charactersData.characters.find((c) => c.id === unit.characterId)?.name || 'プレイヤー'
             }
             return enemiesData.enemies.find((e) => e.id === unit.enemyId)?.name || '敵'
           }
         
           // ダイアログ表示
           if (phase === 'dialogue-before' || phase === 'dialogue-after') {
             const dialogues = phase === 'dialogue-before' 
               ? stage?.dialogue?.before 
               : stage?.dialogue?.after
             const currentDialogue = dialogues?.[dialogueIndex]
         
             return (
               <div className="battle-page dialogue-phase">
                 <div className="dialogue-box">
                   <div className="dialogue-speaker">{currentDialogue?.speaker}</div>
                   <div className="dialogue-text">{currentDialogue?.text}</div>
                   <button className="btn btn-primary" onClick={handleDialogueNext}>
                     {dialogueIndex < (dialogues?.length || 1) - 1 ? '次へ' : phase === 'dialogue-before' ? 'バトル開始' : '結果へ'}
                   </button>
                 </div>
               </div>
             )
           }
         
           // 結果画面
           if (phase === 'result') {
             return (
               <div className="battle-page result-phase">
                 <div className="result-modal">
                   <h2 className={victory ? 'victory' : 'defeat'}>
                     {victory ? '🎉 勝利！' : '💀 敗北...'}
                   </h2>
                   
                   {victory && stage && (
                     <div className="rewards-section">
                       <h3>獲得報酬</h3>
                       <div className="reward-list">
                         <div className="reward-item">
                           <span>✨ EXP</span>
                           <span>+{stage.rewards.exp}</span>
                         </div>
                         <div className="reward-item">
                           <span>💎 ドリームストーン</span>
                           <span>+{stage.rewards.dreamStone}</span>
                         </div>
                         <div className="reward-item">
                           <span>🪙 ゴールド</span>
                           <span>+{stage.rewards.gold}</span>
                         </div>
                       </div>
                       
                       {isFirstClear && stage.rewards.firstClearBonus && (
                         <div className="first-clear-bonus">
                           <h4>🌟 初回クリアボーナス！</h4>
                           <div className="reward-item">
                             <span>💎 ドリームストーン</span>
                             <span>+{stage.rewards.firstClearBonus.dreamStone}</span>
                           </div>
                         </div>
                       )}
                     </div>
                   )}
                   
                   <button className="btn btn-primary btn-lg" onClick={handleResultClose}>
                     {victory ? '次へ' : '戻る'}
                   </button>
                 </div>
               </div>
             )
           }
         
           // バトル画面
           return (
             <div className="battle-page">
               {/* バトル情報 */}
               <div className="battle-header">
                 <div className="turn-info">ターン {currentTurn}</div>
                 <div className="stage-name">{stage?.name}</div>
                 <button 
                   className={`auto-btn ${isAutoMode ? 'active' : ''}`}
                   onClick={() => setIsAutoMode(!isAutoMode)}
                 >
                   {isAutoMode ? 'AUTO ON' : 'AUTO OFF'}
                 </button>
               </div>
         
               {/* 敵エリア */}
               <div className="enemy-area">
                 {enemyUnits.map((unit) => {
                   const isCurrentActor = currentActor?.id === unit.id
                   const isTargetable = selectedAction && currentActor?.isPlayer && unit.currentHp > 0
                   const enemyData = enemiesData.enemies.find((e) => e.id === unit.enemyId)
                   
                   return (
                     <div
                       key={unit.id}
                       className={`battle-unit enemy-unit ${isCurrentActor ? 'active' : ''} ${unit.currentHp <= 0 ? 'defeated' : ''} ${isTargetable ? 'targetable' : ''}`}
                       onClick={() => isTargetable && handleTargetSelect(unit.id)}
                     >
                       <div className="unit-sprite">
                         {unit.currentHp <= 0 ? '💀' : '👹'}
                       </div>
                       <div className="unit-name">{enemyData?.name}</div>
                       <div className="hp-bar">
                         <div 
                           className={`hp-bar-fill ${unit.currentHp / unit.maxHp < 0.3 ? 'low' : ''}`}
                           style={{ width: `${(unit.currentHp / unit.maxHp) * 100}%` }}
                         />
                       </div>
                       <div className="hp-text">{unit.currentHp}/{unit.maxHp}</div>
                       
                       {/* ダメージ表示 */}
                       {damageNumbers.filter((d) => d.targetId === unit.id).map((d) => (
                         <div key={d.id} className={`damage-number ${d.type}`}>
                           {d.type === 'heal' ? '+' : '-'}{d.value}
                         </div>
                       ))}
                     </div>
                   )
                 })}
               </div>
         
               {/* プレイヤーエリア */}
               <div className="player-area">
                 {playerUnits.map((unit) => {
                   const isCurrentActor = currentActor?.id === unit.id
                   const charData = charactersData.characters.find((c) => c.id === unit.characterId)
                   
                   return (
                     <div
                       key={unit.id}
                       className={`battle-unit player-unit ${isCurrentActor ? 'active' : ''} ${unit.currentHp <= 0 ? 'defeated' : ''} ${unit.isDefending ? 'defending' : ''}`}
                     >
                       <div className="unit-sprite">
                         {unit.currentHp <= 0 ? '💀' : unit.isDefending ? '🛡️' : '🧙'}
                       </div>
                       <div className="unit-name">{charData?.name}</div>
                       <div className="hp-bar">
                         <div 
                           className={`hp-bar-fill ${unit.currentHp / unit.maxHp < 0.3 ? 'low' : ''}`}
                           style={{ width: `${(unit.currentHp / unit.maxHp) * 100}%` }}
                         />
                       </div>
                       <div className="hp-text">{unit.currentHp}/{unit.maxHp}</div>
                       
                       {/* 必殺ゲージ */}
                       <div className="ultimate-gauge">
                         {[...Array(5)].map((_, i) => (
                           <div 
                             key={i} 
                             className={`gauge-pip ${i < unit.ultimateGauge ? 'filled' : ''}`}
                           />
                         ))}
                       </div>
                       
                       {/* ダメージ表示 */}
                       {damageNumbers.filter((d) => d.targetId === unit.id).map((d) => (
                         <div key={d.id} className={`damage-number ${d.type}`}>
                           {d.type === 'heal' ? '+' : '-'}{d.value}
                         </div>
                       ))}
                     </div>
                   )
                 })}
               </div>
         
               {/* アクションパネル */}
               {currentActor?.isPlayer && !isAutoMode && currentActor.currentHp > 0 && (
                 <div className="action-panel">
                   {selectedAction ? (
                     <div className="target-prompt">
                       <p>ターゲットを選択してください</p>
                       <button 
                         className="btn btn-secondary btn-sm"
                         onClick={() => setSelectedAction(null)}
                       >
                         キャンセル
                       </button>
                     </div>
                   ) : (
                     <div className="action-buttons">
                       <button 
                         id="btn-attack"
                         className="action-btn attack"
                         onClick={() => handleActionSelect('attack')}
                       >
                         ⚔️ 攻撃
                       </button>
                       <button 
                         className="action-btn skill"
                         onClick={() => handleActionSelect('skill')}
                       >
                         ✨ スキル
                       </button>
                       <button 
                         className={`action-btn ultimate ${currentActor.ultimateGauge >= 5 ? 'ready' : ''}`}
                                        onClick={() => handleActionSelect('ultimate')}
                                        disabled={currentActor.ultimateGauge < 5}
                                      >
                                        💥 必殺 ({currentActor.ultimateGauge}/5)
                                      </button>
                                      <button 
                                        className="action-btn defend"
                                        onClick={() => handleActionSelect('defend')}
                                      >
                                        🛡️ 防御
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                        
                              {/* バトルログ */}
                              <div className="battle-log">
                                {battleLog.slice(-5).map((log, index) => (
                                  <div key={index} className="log-entry">{log}</div>
                                ))}
                              </div>
                            </div>
                          )
                        }