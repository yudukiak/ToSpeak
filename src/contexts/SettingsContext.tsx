import { createContext, useContext, useState, ReactNode } from 'react'

// 設定の型定義
export interface Replacement {
  from: string
  to: string
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
}

interface SettingsContextType {
  settings: Settings
  updateSettings: (settings: Partial<Settings>) => void
  addReplacement: (replacement: Replacement) => void
  removeReplacement: (index: number) => void
  addBlockedApp: (blockedApp: BlockedApp) => void
  removeBlockedApp: (index: number) => void
}

const defaultSettings: Settings = {
  speechTemplate: '{app}、{title}、{text}',
  replacements: [],
  blockedApps: [],
  maxTextLength: 100, // 0は無制限を意味する（n文字以上で「以下省略」にする）
  consecutiveCharMinLength: 3, // 0は無効を意味する（n文字以上を3文字に短縮）
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
      // ローカルストレージに保存
      localStorage.setItem('toast-speak-settings', JSON.stringify(updated))
      return updated
    })
  }

  const addReplacement = (replacement: Replacement) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        replacements: [...prev.replacements, replacement],
      }
      localStorage.setItem('toast-speak-settings', JSON.stringify(updated))
      return updated
    })
  }

  const removeReplacement = (index: number) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        replacements: prev.replacements.filter((_, i) => i !== index),
      }
      localStorage.setItem('toast-speak-settings', JSON.stringify(updated))
      return updated
    })
  }

  const addBlockedApp = (blockedApp: BlockedApp) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        blockedApps: [...prev.blockedApps, blockedApp],
      }
      localStorage.setItem('toast-speak-settings', JSON.stringify(updated))
      return updated
    })
  }

  const removeBlockedApp = (index: number) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        blockedApps: prev.blockedApps.filter((_, i) => i !== index),
      }
      localStorage.setItem('toast-speak-settings', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        addReplacement,
        removeReplacement,
        addBlockedApp,
        removeBlockedApp,
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

