import { createContext, useContext, useState, ReactNode } from 'react'

// 設定の型定義
export interface Replacement {
  from: string
  to: string
  isRegex?: boolean // 正規表現として扱うか
}

export interface BlockedApp {
  app?: string
  app_id?: string
  appIsRegex?: boolean // アプリ名を正規表現として扱うか
  appIdIsRegex?: boolean // アプリIDを正規表現として扱うか
  title?: string // タイトル（app または app_id と組み合わせて使用）
  titleIsRegex?: boolean // タイトルを正規表現として扱うか
  text?: string // 本文（app または app_id と組み合わせて使用）
  textIsRegex?: boolean // 本文を正規表現として扱うか
}

export interface Settings {
  speechTemplate: string // 読ませるテンプレート（例: "{app} {title} {text}"）
  replacements: Replacement[] // 変換リスト
  blockedApps: BlockedApp[] // 読ませないアプリのリスト
  maxTextLength?: number // 読み上げテキストの最大文字数（0または未指定の場合は無制限）
  consecutiveCharMinLength?: number // 連続文字として認識する最小文字数（0または未指定の場合は無効、n文字以上を3文字に短縮）
  voiceName?: string // 使用するSAPI音声名（未指定の場合はデフォルト）
  volume?: number // 音量 (0〜100)
  duplicateNotificationIgnoreSeconds?: number // 重複通知を無視する時間（秒、0または未指定の場合は無効）
}

interface SettingsContextType {
  settings: Settings
  updateSettings: (settings: Partial<Settings>) => void
  addReplacement: (replacement: Replacement) => void
  updateReplacement: (index: number, replacement: Replacement) => void
  removeReplacement: (index: number) => void
  addBlockedApp: (blockedApp: BlockedApp) => void
  updateBlockedApp: (index: number, blockedApp: BlockedApp) => void
  removeBlockedApp: (index: number) => void
  exportSettings: () => void
  importSettings: (file: File) => Promise<void>
  resetSettings: () => void
}

const defaultSettings: Settings = {
  speechTemplate: '{app}、{title}、{text}',
  replacements: [],
  blockedApps: [],
  maxTextLength: 100, // 0は無制限を意味する（n文字以上で「以下省略」にする）
  consecutiveCharMinLength: 3, // 0は無効を意味する（n文字以上を3文字に短縮）
  voiceName: undefined, // 未指定の場合は読み上げ無効（プルダウンで選択が必要）
  volume: 20, // デフォルト音量20 (0〜100)
  duplicateNotificationIgnoreSeconds: 30, // 重複通知を無視する時間（秒、デフォルト30秒、0は無効）
}

/**
 * BlockedAppから冗長なフィールドを削除する
 * 未設定のフィールドとその対応するIsRegexフィールドを除外する
 */
function optimizeBlockedApp(blockedApp: BlockedApp): Partial<BlockedApp> {
  const optimized: Partial<BlockedApp> = {}
  
  // appが設定されている場合のみ、appとappIsRegexを追加
  if (blockedApp.app !== undefined && blockedApp.app !== null && blockedApp.app !== '') {
    optimized.app = blockedApp.app
    if (blockedApp.appIsRegex !== undefined) {
      optimized.appIsRegex = blockedApp.appIsRegex
    }
  }
  
  // app_idが設定されている場合のみ、app_idとappIdIsRegexを追加
  if (blockedApp.app_id !== undefined && blockedApp.app_id !== null && blockedApp.app_id !== '') {
    optimized.app_id = blockedApp.app_id
    if (blockedApp.appIdIsRegex !== undefined) {
      optimized.appIdIsRegex = blockedApp.appIdIsRegex
    }
  }
  
  // titleが設定されている場合のみ、titleとtitleIsRegexを追加
  if (blockedApp.title !== undefined && blockedApp.title !== null && blockedApp.title !== '') {
    optimized.title = blockedApp.title
    if (blockedApp.titleIsRegex !== undefined) {
      optimized.titleIsRegex = blockedApp.titleIsRegex
    }
  }
  
  // textが設定されている場合のみ、textとtextIsRegexを追加
  if (blockedApp.text !== undefined && blockedApp.text !== null && blockedApp.text !== '') {
    optimized.text = blockedApp.text
    if (blockedApp.textIsRegex !== undefined) {
      optimized.textIsRegex = blockedApp.textIsRegex
    }
  }
  
  return optimized
}

/**
 * Settingsから冗長なフィールドを削除して最適化する
 */
function optimizeSettings(settings: Settings): Partial<Settings> {
  const optimized: Partial<Settings> = {
    speechTemplate: settings.speechTemplate,
    replacements: settings.replacements,
    blockedApps: settings.blockedApps.map(optimizeBlockedApp),
  }
  
  // オプショナルフィールドは、デフォルト値と異なる場合のみ追加
  if (settings.maxTextLength !== undefined && settings.maxTextLength !== defaultSettings.maxTextLength) {
    optimized.maxTextLength = settings.maxTextLength
  }
  
  if (settings.consecutiveCharMinLength !== undefined && settings.consecutiveCharMinLength !== defaultSettings.consecutiveCharMinLength) {
    optimized.consecutiveCharMinLength = settings.consecutiveCharMinLength
  }
  
  if (settings.voiceName !== undefined && settings.voiceName !== null && settings.voiceName !== '') {
    optimized.voiceName = settings.voiceName
  }
  
  if (settings.volume !== undefined && settings.volume !== defaultSettings.volume) {
    optimized.volume = settings.volume
  }
  
  return optimized
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    // ローカルストレージから設定を読み込む
    const saved = localStorage.getItem('toast-speak-settings')
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) }
      } catch {
        return defaultSettings
      }
    }
    return defaultSettings
  })

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings }
      // ローカルストレージに保存（最適化して保存）
      const optimized = optimizeSettings(updated)
      localStorage.setItem('toast-speak-settings', JSON.stringify(optimized))
      return updated
    })
  }

  const addReplacement = (replacement: Replacement) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        replacements: [...prev.replacements, replacement],
      }
      // ローカルストレージに保存（最適化して保存）
      const optimized = optimizeSettings(updated)
      localStorage.setItem('toast-speak-settings', JSON.stringify(optimized))
      return updated
    })
  }

  const updateReplacement = (index: number, replacement: Replacement) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        replacements: prev.replacements.map((r, i) => i === index ? replacement : r),
      }
      // ローカルストレージに保存（最適化して保存）
      const optimized = optimizeSettings(updated)
      localStorage.setItem('toast-speak-settings', JSON.stringify(optimized))
      return updated
    })
  }

  const removeReplacement = (index: number) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        replacements: prev.replacements.filter((_, i) => i !== index),
      }
      // ローカルストレージに保存（最適化して保存）
      const optimized = optimizeSettings(updated)
      localStorage.setItem('toast-speak-settings', JSON.stringify(optimized))
      return updated
    })
  }

  const addBlockedApp = (blockedApp: BlockedApp) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        blockedApps: [...prev.blockedApps, blockedApp],
      }
      // ローカルストレージに保存（最適化して保存）
      const optimized = optimizeSettings(updated)
      localStorage.setItem('toast-speak-settings', JSON.stringify(optimized))
      return updated
    })
  }

  const updateBlockedApp = (index: number, blockedApp: BlockedApp) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        blockedApps: prev.blockedApps.map((b, i) => i === index ? blockedApp : b),
      }
      // ローカルストレージに保存（最適化して保存）
      const optimized = optimizeSettings(updated)
      localStorage.setItem('toast-speak-settings', JSON.stringify(optimized))
      return updated
    })
  }

  const removeBlockedApp = (index: number) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        blockedApps: prev.blockedApps.filter((_, i) => i !== index),
      }
      // ローカルストレージに保存（最適化して保存）
      const optimized = optimizeSettings(updated)
      localStorage.setItem('toast-speak-settings', JSON.stringify(optimized))
      return updated
    })
  }

  const exportSettings = () => {
    try {
      // 最適化してエクスポート（冗長なフィールドを削除）
      const optimized = optimizeSettings(settings)
      const settingsJson = JSON.stringify(optimized, null, 2)
      const blob = new Blob([settingsJson], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // ローカル時刻で日付を取得（YYYY-MM-DD形式）
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      a.download = `toast-speak-settings-${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('設定のエクスポートに失敗しました:', error)
      throw error
    }
  }

  const importSettings = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string)
          // デフォルト設定とマージして、型安全性を保つ
          const mergedSettings: Settings = {
            ...defaultSettings,
            ...importedSettings,
            // 配列は完全に置き換える
            replacements: importedSettings.replacements || defaultSettings.replacements,
            blockedApps: importedSettings.blockedApps || defaultSettings.blockedApps,
          }
          setSettings(mergedSettings)
          // インポート後も最適化して保存
          const optimized = optimizeSettings(mergedSettings)
          localStorage.setItem('toast-speak-settings', JSON.stringify(optimized))
          resolve()
        } catch (error) {
          console.error('設定のインポートに失敗しました:', error)
          reject(new Error('設定ファイルの形式が正しくありません'))
        }
      }
      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました'))
      }
      reader.readAsText(file)
    })
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
    // リセット時も最適化して保存
    const optimized = optimizeSettings(defaultSettings)
    localStorage.setItem('toast-speak-settings', JSON.stringify(optimized))
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        addReplacement,
        updateReplacement,
        removeReplacement,
        addBlockedApp,
        updateBlockedApp,
        removeBlockedApp,
        exportSettings,
        importSettings,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

