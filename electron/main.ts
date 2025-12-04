import { app, BrowserWindow, ipcMain } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { existsSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

// Toast通知ログの型定義
import type { ToastLog } from '../src/types/toast-log'

let win: BrowserWindow | null
let toastBridgeProcess: ChildProcess | null = null
// ログを保持する配列（リロード時も保持）
const storedLogs: ToastLog[] = []

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    titleBarStyle: 'hidden',
    minWidth: 640,
    width: 640,
    minHeight: 640,
    height: 640,
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
    // Pythonプロセスを起動（統合版）
    startToastBridge()
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

/**
 * Toast通知と読み上げを統合したPythonプロセスを起動する
 */
function startToastBridge() {
  if (toastBridgeProcess) {
    return
  }

  // ビルド時はtoast_bridge.exeを使用、開発時はPythonスクリプトを使用
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  let toastBridgePath: string
  let command: string
  let args: string[]

  if (isDev) {
    // 開発時: Pythonスクリプトを直接実行
    toastBridgePath = path.join(process.env.APP_ROOT || __dirname, 'python', 'toast_bridge.py')
    command = process.platform === 'win32' ? 'py' : 'python3'
    args = [toastBridgePath]
  } else {
    // 本番時: PyInstallerでビルドしたexeを使用
    toastBridgePath = path.join(process.resourcesPath, 'toast_bridge.exe')
    command = toastBridgePath
    args = []
    
    // ファイル存在確認
    if (!existsSync(toastBridgePath)) {
      console.error(`[Toast Bridge] ファイルが存在しません: ${toastBridgePath}`)
      // 代替パスを試す
      const altPath = path.join(__dirname, '..', 'resources', 'toast_bridge.exe')
      if (existsSync(altPath)) {
        toastBridgePath = altPath
        command = altPath
      }
    } else {
      // 絶対パスを正規化
      toastBridgePath = path.resolve(toastBridgePath)
      command = toastBridgePath
    }
  }

  // プロセスを起動（UTF-8エンコーディングを強制）
  // 作業ディレクトリはexeファイルがあるディレクトリに設定（DLLの検索パスのため）
  const workingDir = isDev 
    ? (process.env.APP_ROOT || __dirname)
    : process.resourcesPath // 本番時はresourcesディレクトリ
  
  try {
    toastBridgeProcess = spawn(command, args, {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONLEGACYWINDOWSSTDIO: '0',
        PATH: process.env.PATH, // PATH環境変数を継承（DLL検索のため）
      },
      shell: false,
    })
  } catch (spawnError) {
    console.error(`[Toast Bridge] spawnエラー:`, spawnError)
    throw spawnError
  }

  // stdoutからJSONメッセージを受け取る（UTF-8としてデコード）
  let buffer = ''
  toastBridgeProcess.stdout?.on('data', (data: Buffer) => {
    const text = data.toString('utf-8').replace(/^\uFEFF/, '')
    buffer += text
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line.trim())
          
          // Electronのコンソールにログ出力
          const source = message.source || 'toast_bridge'
          const type = message.type || 'unknown'
          const msgText = message.message || JSON.stringify(message)
          
          switch (type) {
            case 'debug':
              console.debug(`[${source}] ${msgText}`)
              break
            case 'error':
              console.error(`[${source}] ${msgText}`)
              break
            case 'info':
              console.info(`[${source}] ${msgText}`)
              break
            case 'ready':
              console.log(`[${source}] ${msgText}`)
              break
            case 'notification':
              console.log(`[${source}] Notification: ${message.app || 'Unknown'} - ${message.title || 'No title'}`)
              break
            default:
              console.log(`[${source}] ${type}:`, message)
          }
          
          // レンダラー側のコンソールにも出力
          if (win && !win.isDestroyed()) {
            win.webContents.send('console-log', {
              level: type === 'debug' ? 'debug' : type === 'error' ? 'error' : type === 'info' ? 'info' : 'log',
              source: source,
              message: msgText,
              data: message
            })
          }
          
          if (message.type === 'ready') {
            // 準備完了したら初期音量を送信
            setTimeout(() => {
              setVolume(20)
            }, 100)
          }
          
          // debugタイプ以外のメッセージをReact側に転送
          // debugタイプはコンソールのみで、UIには表示しない
          if (message.type !== 'debug') {
            // ログを配列に追加（最大1000件まで保持）
            storedLogs.push(message)
            if (storedLogs.length > 1000) {
              storedLogs.shift()
            }
            
            // レンダラーに送信
            if (win && !win.isDestroyed()) {
              win.webContents.send('toast-log', message)
            }
          }
        } catch (e) {
          const errorMsg = `Toast Bridge: JSON解析エラー ${line} ${e}`
          console.error(errorMsg)
          if (win && !win.isDestroyed()) {
            win.webContents.send('console-log', { level: 'error', source: 'main', message: errorMsg })
          }
        }
      }
    }
  })

  // stderrからのエラーメッセージ（UTF-8としてデコード）
  toastBridgeProcess.stderr?.on('data', (data: Buffer) => {
    const text = data.toString('utf-8')
    console.error('Toast Bridge (stderr):', text)
  })

  // プロセス終了時の処理
  toastBridgeProcess.on('exit', (code) => {
    toastBridgeProcess = null
    
    // 異常終了の場合は再起動を試みる
    if (code !== 0 && code !== null) {
      setTimeout(() => {
        if (win && !win.isDestroyed()) {
          startToastBridge()
        }
      }, 3000)
    }
  })

  toastBridgeProcess.on('error', (error) => {
    const errorMsg = `Toast Bridge: プロセスエラー ${error}`
    const errnoError = error as NodeJS.ErrnoException
    console.error(`[Toast Bridge] エラー詳細:`, {
      message: error.message,
      code: errnoError.code,
      errno: errnoError.errno,
      syscall: errnoError.syscall,
      path: errnoError.path,
      command: command,
      args: args,
      cwd: process.env.APP_ROOT || __dirname,
      resourcesPath: process.resourcesPath,
      fileExists: existsSync(toastBridgePath),
      platform: process.platform,
      arch: process.arch,
    })
    console.error(errorMsg, error)
    if (win && !win.isDestroyed()) {
      win.webContents.send('console-log', { level: 'error', source: 'main', message: errorMsg, data: { error: String(error) } })
    }
    toastBridgeProcess = null
  })
}

/**
 * Toast BridgeのPythonプロセスを終了する
 */
function stopToastBridge() {
  if (toastBridgeProcess) {
    toastBridgeProcess.kill()
    toastBridgeProcess = null
  }
}

/**
 * テキストをPythonプロセスに送信して読み上げる
 */
function speakText(text: string) {
  if (!toastBridgeProcess || !toastBridgeProcess.stdin) {
    const errorMsg = 'Toast Bridge: 読み上げプロセスが起動していません'
    console.error(errorMsg)
    if (win && !win.isDestroyed()) {
      win.webContents.send('console-log', { level: 'error', source: 'main', message: errorMsg })
    }
    return
  }

  if (toastBridgeProcess.stdin.destroyed) {
    const errorMsg = 'Toast Bridge: stdinが破棄されています'
    console.error(errorMsg)
    if (win && !win.isDestroyed()) {
      win.webContents.send('console-log', { level: 'error', source: 'main', message: errorMsg })
    }
    return
  }

  const message = {
    type: 'speak',
    text: text
  }

  try {
    const jsonMessage = JSON.stringify(message) + '\n'
    const success = toastBridgeProcess.stdin.write(jsonMessage, 'utf-8')
    if (!success) {
      const warnMsg = 'Toast Bridge: stdin.writeがfalseを返しました'
      console.warn(warnMsg)
      if (win && !win.isDestroyed()) {
        win.webContents.send('console-log', { level: 'warn', source: 'main', message: warnMsg })
      }
    }
  } catch (error) {
    const errorMsg = `Toast Bridge: 読み上げコマンド送信エラー ${error}`
    console.error(errorMsg)
    if (win && !win.isDestroyed()) {
      win.webContents.send('console-log', { level: 'error', source: 'main', message: errorMsg })
    }
  }
}

/**
 * 音量をPythonプロセスに送信して設定する
 */
function setVolume(volume: number) {
  if (!toastBridgeProcess || !toastBridgeProcess.stdin) {
    return
  }

  const message = {
    type: 'set_volume',
    volume: volume
  }

  try {
    const jsonMessage = JSON.stringify(message) + '\n'
    toastBridgeProcess.stdin.write(jsonMessage, 'utf-8')
  } catch {
    // エラーハンドリング
  }
}

/**
 * 音声をPythonプロセスに送信して設定する
 */
function setVoice(voiceName: string) {
  if (!toastBridgeProcess || !toastBridgeProcess.stdin) {
    const errorMsg = 'Toast Bridge: 読み上げプロセスが起動していません'
    console.error(errorMsg)
    if (win && !win.isDestroyed()) {
      win.webContents.send('console-log', { level: 'error', source: 'main', message: errorMsg })
    }
    return
  }

  if (toastBridgeProcess.stdin.destroyed) {
    const errorMsg = 'Toast Bridge: stdinが破棄されています'
    console.error(errorMsg)
    if (win && !win.isDestroyed()) {
      win.webContents.send('console-log', { level: 'error', source: 'main', message: errorMsg })
    }
    return
  }

  const message = {
    type: 'set_voice',
    voice_name: voiceName
  }

  try {
    const jsonMessage = JSON.stringify(message) + '\n'
    const success = toastBridgeProcess.stdin.write(jsonMessage, 'utf-8')
    if (!success) {
      const warnMsg = 'Toast Bridge: stdin.writeがfalseを返しました'
      console.warn(warnMsg)
      if (win && !win.isDestroyed()) {
        win.webContents.send('console-log', { level: 'warn', source: 'main', message: warnMsg })
      }
    }
  } catch (error) {
    const errorMsg = `Toast Bridge: 音声設定コマンド送信エラー ${error}`
    console.error(errorMsg)
    if (win && !win.isDestroyed()) {
      win.webContents.send('console-log', { level: 'error', source: 'main', message: errorMsg })
    }
  }
}

// IPCハンドラー: レンダラーから読み上げリクエストを受け取る
ipcMain.on('speak-text', (_event, text: string) => {
  const logMsg = `IPC受信: speak-text ${text}`
  console.log(logMsg)
  if (win && !win.isDestroyed()) {
    win.webContents.send('console-log', { level: 'log', source: 'main', message: logMsg })
  }
  speakText(text)
})

// IPCハンドラー: レンダラーから音量設定リクエストを受け取る
ipcMain.on('set-volume', (_event, volume: number) => {
  setVolume(volume)
})

// IPCハンドラー: レンダラーから音声設定リクエストを受け取る
ipcMain.on('set-voice', (_event, voiceName: string) => {
  setVoice(voiceName)
})

// IPCハンドラー: ウィンドウを最小化
ipcMain.on('window-minimize', () => {
  if (win && !win.isDestroyed()) {
    win.minimize()
  }
})

// IPCハンドラー: ウィンドウを閉じる
ipcMain.on('window-close', () => {
  if (win && !win.isDestroyed()) {
    win.close()
  }
})

// IPCハンドラー: 保持されているログを取得
ipcMain.handle('get-stored-logs', () => {
  return storedLogs
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  stopToastBridge()
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

// アプリ終了時にPythonプロセスをクリーンアップ
app.on('before-quit', () => {
  stopToastBridge()
})
