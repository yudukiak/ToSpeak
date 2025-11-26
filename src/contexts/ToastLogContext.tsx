import { createContext, useContext, useState, useRef, ReactNode } from 'react'

// 過去の通知の型定義
export interface PastNotification {
  app: string
  app_id: string
  title: string
  text: string
  notification_id: string
  timestamp: string
}

// Toast通知ログの型定義
export interface ToastLog {
  type: 'notification' | 'ready' | 'info' | 'error' | 'debug' | 'past_notifications'
  app?: string
  app_id?: string
  title?: string
  text?: string
  notification_id?: string
  timestamp?: string
  message?: string
  source?: string
  notifications?: PastNotification[] // 過去の通知一覧
}

interface ToastLogContextType {
  logs: ToastLog[]
  clearLogs: () => void
  speak: (text: string) => void
  setVolume: (volume: number) => void
}

const ToastLogContext = createContext<ToastLogContextType | undefined>(undefined)

// IPC通信のセットアップ（モジュールレベルで一度だけ実行）
let ipcSetupDone = false
const setLogsRef = { current: null as ((updater: (prevLogs: ToastLog[]) => ToastLog[]) => void) | null }

function setupIpcListener() {
  if (ipcSetupDone || typeof window === 'undefined' || !(window as any).ipcRenderer) {
    return
  }

  const ipcRenderer = (window as any).ipcRenderer

  // 通知データを加工して読み上げ用テキストを生成（仮実装）
  const processNotificationForSpeech = (log: ToastLog): string => {
    if (log.type === "notification") {
      const parts: string[] = [];
      
      // アプリ名
      if (log.app) {
        parts.push(log.app);
      }
      
      // タイトル
      if (log.title) {
        parts.push(log.title);
      }
      
      // 本文
      if (log.text) {
        // 改行を空白に置換
        const text = log.text.replace(/\n/g, " ");
        parts.push(text);
      }
      
      return parts.join("、") || "通知があります";
    }
    
    return "";
  };

  const handleToastLog = (_event: any, message: ToastLog) => {
    // レンダラー側のコンソールに全てのログを出力
    const source = (message as any).source || 'unknown'
    const type = message.type || 'unknown'
    const msgText = message.message || JSON.stringify(message)
    
    switch (type) {
      case 'debug':
        console.debug(`[${source}] ${msgText}`, message)
        // debugタイプはコンソールのみ出力、UIには表示しない
        return
      case 'error':
        console.error(`[${source}] ${msgText}`, message)
        break
      case 'info':
        console.info(`[${source}] ${msgText}`, message)
        break
      case 'ready':
        console.log(`[${source}] ${msgText}`, message)
        break
      case 'notification':
        console.log(`[${source}] Notification: ${message.app || 'Unknown'} - ${message.title || 'No title'}`, message)
        break
      default:
        console.log(`[${source}] ${type}:`, message)
    }
    
    // debugタイプ以外をUIに追加
    if (setLogsRef.current) {
      setLogsRef.current((prevLogs) => {
        const newLogs = [...prevLogs, message]
        // 最大100件まで保持
        return newLogs.slice(-100)
      })
      
      // 通知タイプの場合、自動的に読み上げ
      if (message.type === "notification") {
        const speechText = processNotificationForSpeech(message);
        console.log('🔊 読み上げテキスト生成:', speechText)
        if (speechText) {
          // IPCで読み上げリクエストを送信
          if (typeof window !== 'undefined' && (window as any).ipcRenderer) {
            const ipcRenderer = (window as any).ipcRenderer;
            console.log('📤 IPC送信: speak-text', speechText)
            ipcRenderer.send('speak-text', speechText);
          } else {
            console.warn('⚠️ ipcRendererが利用できません')
          }
        }
      }
    } else {
      console.warn('⚠️ setLogsRef.current が null です')
    }
  }

  ipcRenderer.on('toast-log', handleToastLog)
  
  // メインプロセスからのコンソールログを受け取る
  ipcRenderer.on('console-log', (_event: any, logData: { level: string; source: string; message: string; data?: any }) => {
    const { level, source, message, data } = logData
    const prefix = `[${source}]`
    
    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}`, data || '')
        break
      case 'error':
        console.error(`${prefix} ${message}`, data || '')
        break
      case 'warn':
        console.warn(`${prefix} ${message}`, data || '')
        break
      case 'info':
        console.info(`${prefix} ${message}`, data || '')
        break
      default:
        console.log(`${prefix} ${message}`, data || '')
    }
  })
  
  ipcSetupDone = true
  console.log('✅ IPC通信セットアップ完了')
}

export function ToastLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<ToastLog[]>([])
  const isSetupRef = useRef(false)

  // 常に最新のsetLogsをrefに保存
  setLogsRef.current = setLogs

  // 初回のみIPCセットアップ
  if (!isSetupRef.current) {
    setupIpcListener()
    isSetupRef.current = true
  }

  const clearLogs = () => {
    setLogs([])
  }

  const speak = (text: string) => {
    console.log('📤 [Renderer] speak:', text)
    if (typeof window !== 'undefined' && (window as any).ipcRenderer) {
      const ipcRenderer = (window as any).ipcRenderer
      ipcRenderer.send('speak-text', text)
    }
  }

  const setVolume = (volume: number) => {
    console.log('📤 [Renderer] set-volume:', volume)
    if (typeof window !== 'undefined' && (window as any).ipcRenderer) {
      const ipcRenderer = (window as any).ipcRenderer
      ipcRenderer.send('set-volume', volume)
    }
  }

  return (
    <ToastLogContext.Provider value={{ logs, clearLogs, speak, setVolume }}>
      {children}
    </ToastLogContext.Provider>
  )
}

export function useToastLogs() {
  const context = useContext(ToastLogContext)
  if (context === undefined) {
    throw new Error('useToastLogs must be used within a ToastLogProvider')
  }
  return context
}

