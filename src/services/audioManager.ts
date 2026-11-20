// ========================================
// AudioManager - BGM/SE管理
// シーンBGMを設定キーで差し替え可能
// ========================================

export interface AudioConfig {
  bgm: { [key: string]: string }  // key: ファイルパス
  se: { [key: string]: string }
}

class AudioManager {
  private bgmElement: HTMLAudioElement | null = null
  private seElements: Map<string, HTMLAudioElement> = new Map()
  private currentBgmKey: string | null = null
  private bgmVolume: number = 0.5
  private seVolume: number = 0.7
  private isMuted: boolean = false
  
  private audioConfig: AudioConfig = {
    bgm: {
      title: '/assets/audio/bgm_title.mp3',
      home: '/assets/audio/bgm_home.mp3',
      battle: '/assets/audio/bgm_battle.mp3',
      boss: '/assets/audio/bgm_boss.mp3',
      story: '/assets/audio/bgm_story.mp3',
      gacha: '/assets/audio/bgm_gacha.mp3',
      victory: '/assets/audio/bgm_victory.mp3',
      defeat: '/assets/audio/bgm_defeat.mp3',
    },
    se: {
      click: '/assets/audio/se_click.mp3',
      attack: '/assets/audio/se_attack.mp3',
      skill: '/assets/audio/se_skill.mp3',
      ultimate: '/assets/audio/se_ultimate.mp3',
      heal: '/assets/audio/se_heal.mp3',
      damage: '/assets/audio/se_damage.mp3',
      gacha_roll: '/assets/audio/se_gacha_roll.mp3',
      gacha_result: '/assets/audio/se_gacha_result.mp3',
      level_up: '/assets/audio/se_level_up.mp3',
    },
  }
  
  /**
   * BGMのパスを設定
   */
  setBgmPath(key: string, path: string): void {
    this.audioConfig.bgm[key] = path
  }
  
  /**
   * SEのパスを設定
   */
  setSePath(key: string, path: string): void {
    this.audioConfig.se[key] = path
  }
  
  /**
   * 設定を一括更新
   */
  updateConfig(config: Partial<AudioConfig>): void {
    if (config.bgm) {
      this.audioConfig.bgm = { ...this.audioConfig.bgm, ...config.bgm }
    }
    if (config.se) {
      this.audioConfig.se = { ...this.audioConfig.se, ...config.se }
    }
  }
  
  /**
   * BGMを再生
   */
  playBgm(key: string, loop: boolean = true): void {
    if (this.currentBgmKey === key && this.bgmElement && !this.bgmElement.paused) {
      return // 同じBGMが再生中なら何もしない
    }
    
    this.stopBgm()
    
    const path = this.audioConfig.bgm[key]
    if (!path) {
      console.warn(`BGM not found: ${key}`)
      return
    }
    
    this.bgmElement = new Audio(path)
    this.bgmElement.loop = loop
    this.bgmElement.volume = this.isMuted ? 0 : this.bgmVolume
    this.bgmElement.play().catch((e) => {
      console.warn('BGM play failed:', e)
    })
    
    this.currentBgmKey = key
  }
  
  /**
   * BGMを停止
   */
  stopBgm(): void {
    if (this.bgmElement) {
      this.bgmElement.pause()
      this.bgmElement.currentTime = 0
      this.bgmElement = null
    }
    this.currentBgmKey = null
  }
  
  /**
   * BGMをフェードアウト
   */
  fadeBgm(duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      if (!this.bgmElement) {
        resolve()
        return
      }
      
      const startVolume = this.bgmElement.volume
      const steps = 20
      const stepDuration = duration / steps
      const volumeStep = startVolume / steps
      let currentStep = 0
      
      const fadeInterval = setInterval(() => {
        currentStep++
        if (this.bgmElement) {
          this.bgmElement.volume = Math.max(0, startVolume - volumeStep * currentStep)
        }
        
        if (currentStep >= steps) {
          clearInterval(fadeInterval)
          this.stopBgm()
          resolve()
        }
      }, stepDuration)
    })
  }
  
  /**
   * SEを再生
   */
  playSe(key: string): void {
    const path = this.audioConfig.se[key]
    if (!path) {
      console.warn(`SE not found: ${key}`)
      return
    }
    
    const se = new Audio(path)
    se.volume = this.isMuted ? 0 : this.seVolume
    se.play().catch((e) => {
      console.warn('SE play failed:', e)
    })
  }
  
  /**
   * BGM音量を設定
   */
  setBgmVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume))
            if (this.bgmElement && !this.isMuted) {
              this.bgmElement.volume = this.bgmVolume
            }
          }
          
          /**
           * SE音量を設定
           */
          setSeVolume(volume: number): void {
            this.seVolume = Math.max(0, Math.min(1, volume))
          }
          
          /**
           * ミュート切り替え
           */
          toggleMute(): boolean {
            this.isMuted = !this.isMuted
            if (this.bgmElement) {
              this.bgmElement.volume = this.isMuted ? 0 : this.bgmVolume
            }
            return this.isMuted
          }
          
          /**
           * ミュート状態を取得
           */
          getMuted(): boolean {
            return this.isMuted
          }
          
          /**
           * 現在のBGMキーを取得
           */
          getCurrentBgmKey(): string | null {
            return this.currentBgmKey
          }
        }
        
        export const audioManager = new AudioManager()