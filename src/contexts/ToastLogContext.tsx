import {
  useState,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import { ToastLogContext } from "./toast-log-context";
import type { Settings, BlockedApp, Replacement } from "./SettingsContext";
import type { IpcRendererEvent } from "electron";

// 過去の通知の型定義
export interface PastNotification {
  app: string;
  app_id: string;
  title: string;
  text: string;
  notification_id: string;
  timestamp: string;
}

// Toast通知ログの型定義
export interface ToastLog {
  type:
    | "notification"
    | "ready"
    | "info"
    | "error"
    | "debug"
    | "past_notifications"
    | "available_voices";
  app?: string;
  app_id?: string;
  title?: string;
  text?: string;
  notification_id?: string;
  timestamp?: string;
  message?: string;
  source?: string;
  notifications?: PastNotification[]; // 過去の通知一覧
  voices?: string[]; // 利用可能な音声リスト（available_voicesタイプの場合）
}

export interface ToastLogContextType {
  logs: ToastLog[];
  clearLogs: () => void;
  speak: (text: string) => void;
  setVolume: (volume: number) => void;
  availableVoices: string[]; // 利用可能な音声リスト
  setVoice: (voiceName: string) => void; // 音声を設定
}


// IPC通信のセットアップ（モジュールレベルで一度だけ実行）
let ipcSetupDone = false;
const setLogsRef = {
  current: null as
    | ((updater: (prevLogs: ToastLog[]) => ToastLog[]) => void)
    | null,
};
const setAvailableVoicesRef = {
  current: null as ((voices: string[]) => void) | null,
};
const settingsRef = { current: null as Settings | null };

// 最後に読み上げた通知の情報を保持（重複チェック用）
interface LastSpokenNotification {
  app?: string;
  app_id?: string;
  title?: string;
  text?: string;
  timestamp: number; // 読み上げ時刻（ミリ秒）
}
const lastSpokenNotificationRef = {
  current: null as LastSpokenNotification | null,
};

// 通知データを加工して読み上げ用テキストを生成
const processNotificationForSpeech = (log: ToastLog): string => {
  if (log.type === "notification") {
    const settings = settingsRef.current;
    if (!settings) {
      // 設定がまだ読み込まれていない場合はデフォルト処理
      const parts: string[] = [];
      if (log.app) parts.push(log.app);
      if (log.title) parts.push(log.title);
      if (log.text) {
        const text = log.text.replace(/\n/g, " ");
        parts.push(text);
      }
      return parts.join("、") || "通知があります";
    }

    // 除外アプリのチェック
    if (
      settings.blockedApps.some((blocked: BlockedApp) => {
        // 文字列マッチング関数（正規表現対応）
        const matchString = (
          value: string | undefined,
          pattern: string | undefined,
          isRegex: boolean | undefined
        ): boolean => {
          if (!pattern || !value) return false;
          if (isRegex) {
            try {
              const regex = new RegExp(pattern);
              return regex.test(value);
            } catch (e) {
              // 正規表現が無効な場合は通常の文字列マッチにフォールバック
              return value === pattern;
            }
          } else {
            return value === pattern;
          }
        };

        // 設定されたすべてのフィールドが一致する必要がある（AND条件）
        // app が設定されている場合、app が一致する必要がある
        if (blocked.app) {
          if (!matchString(log.app, blocked.app, blocked.appIsRegex)) {
            return false;
          }
        }

        // app_id が設定されている場合、app_id が一致する必要がある
        if (blocked.app_id) {
          if (!matchString(log.app_id, blocked.app_id, blocked.appIdIsRegex)) {
            return false;
          }
        }

        // title が設定されている場合、title が一致する必要がある
        if (blocked.title) {
          if (!matchString(log.title, blocked.title, blocked.titleIsRegex)) {
            return false;
          }
        }

        // text が設定されている場合、text が一致する必要がある
        if (blocked.text) {
          if (!matchString(log.text, blocked.text, blocked.textIsRegex)) {
            return false;
          }
        }

        // 少なくとも1つのフィールドが設定されている必要がある
        // （すべてのフィールドが未設定の場合はブロックしない）
        if (!blocked.app && !blocked.app_id && !blocked.title && !blocked.text) {
          return false;
        }

        // すべての設定されたフィールドが一致した場合、ブロックする
        return true;
      })
    ) {
      return ""; // 除外アプリの場合は空文字を返す
    }

    // テンプレートを使用してテキストを生成
    let text = settings.speechTemplate || "{app}、{title}、{text}";

    // プレースホルダーを置換（空の場合は空文字列を挿入）
    const appText = (log.app || "").trim();
    const titleText = (log.title || "").trim();
    // 本文の改行を空白に置換
    const textContent = (log.text || "").replace(/\n/g, " ").trim();

    text = text.replace(/{app}/g, appText);
    text = text.replace(/{title}/g, titleText);
    text = text.replace(/{text}/g, textContent);

    // 変換リストを適用
    settings.replacements.forEach((replacement: Replacement) => {
      if (replacement.from && replacement.to) {
        if (replacement.isRegex) {
          // 正規表現として使用（エスケープしない）
          try {
            text = text.replace(new RegExp(replacement.from, "gi"), replacement.to);
          } catch (e) {
            // 正規表現が無効な場合は通常の文字列マッチにフォールバック
            console.warn("無効な正規表現:", replacement.from, e);
            const escapedFrom = replacement.from.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            );
            text = text.replace(new RegExp(escapedFrom, "gi"), replacement.to);
          }
        } else {
          // 通常の文字列置換（エスケープして正規表現として使用、大文字小文字を区別しない）
          const escapedFrom = replacement.from.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );
          text = text.replace(new RegExp(escapedFrom, "gi"), replacement.to);
        }
      }
    });

    // 連続文字の短縮処理
    // consecutiveCharMaxLengthは3でハードコーディング
    const CONSECUTIVE_CHAR_MAX_LENGTH = 3;
    const consecutiveMinLength = settings.consecutiveCharMinLength || 0;
    if (consecutiveMinLength > 0) {
      // 同じ文字がn文字以上連続している場合、3文字に短縮
      // 正規表現: (.)\1{n-1,} で同じ文字がn文字以上連続している箇所を検出
      const regex = new RegExp(`(.)\\1{${consecutiveMinLength - 1},}`, "g");
      text = text.replace(regex, (match) => {
        // 最初の文字を取得して、3文字分だけ繰り返す
        const char = match[0];
        return char.repeat(CONSECUTIVE_CHAR_MAX_LENGTH);
      });
    }

    // 連続する空白や区切り文字を整理
    text = text.replace(/\s+/g, " ").trim();
    // 連続する区切り文字（、や、）を1つに
    text = text.replace(/[、，,]+/g, "、").trim();
    // 先頭と末尾の区切り文字を削除
    text = text.replace(/^[、，,]+|[、，,]+$/g, "").trim();

    // 最大文字数チェック
    const maxLength = settings.maxTextLength || 0;
    if (maxLength > 0 && text.length > maxLength) {
      text = text.substring(0, maxLength) + "以下省略";
    }

    return text || "通知があります";
  }

  return "";
};

function setupIpcListener() {
  if (
    ipcSetupDone ||
    typeof window === "undefined" ||
    !window.ipcRenderer
  ) {
    return;
  }

  const ipcRenderer = window.ipcRenderer;

  const handleToastLog = (_event: IpcRendererEvent, message: ToastLog) => {
    // レンダラー側のコンソールに全てのログを出力
    const source = message.source || "unknown";
    const type = message.type || "unknown";
    const msgText = message.message || JSON.stringify(message);

    switch (type) {
      case "debug":
        console.debug(`[${source}] ${msgText}`, message);
        // debugタイプはコンソールのみ出力、UIには表示しない
        return;
      case "error":
        console.error(`[${source}] ${msgText}`, message);
        break;
      case "info":
        console.info(`[${source}] ${msgText}`, message);
        break;
      case "ready":
        console.log(`[${source}] ${msgText}`, message);
        break;
      case "available_voices":
        // 利用可能な音声リストを受け取る
        if (message.voices && Array.isArray(message.voices)) {
          // setAvailableVoicesは後で定義されるため、ref経由で更新
          if (setAvailableVoicesRef.current) {
            setAvailableVoicesRef.current(message.voices);
          }
          console.log(`[${source}] 利用可能な音声: ${message.voices.length}件`);
        }
        return; // UIには表示しない
      case "notification":
        console.log(
          `[${source}] Notification: ${message.app || "Unknown"} - ${
            message.title || "No title"
          }`,
          message
        );
        break;
      default:
        console.log(`[${source}] ${type}:`, message);
    }

    // debugタイプ以外をUIに追加
    if (setLogsRef.current) {
      setLogsRef.current((prevLogs) => {
        const newLogs = [...prevLogs, message];
        // 最大100件まで保持
        return newLogs.slice(-100);
      });

      // 通知タイプの場合、自動的に読み上げ
      if (message.type === "notification") {
        const settings = settingsRef.current;
        const ignoreSeconds = settings?.duplicateNotificationIgnoreSeconds ?? 30;
        
        // 重複通知チェック（無視時間が0より大きい場合のみ）
        if (ignoreSeconds > 0 && lastSpokenNotificationRef.current) {
          const lastSpoken = lastSpokenNotificationRef.current;
          const now = Date.now();
          const timeDiff = (now - lastSpoken.timestamp) / 1000; // 秒単位
          
          // 指定秒数以内で、通知内容が同じかチェック
          if (timeDiff <= ignoreSeconds) {
            const isDuplicate =
              lastSpoken.app === message.app &&
              lastSpoken.app_id === message.app_id &&
              lastSpoken.title === message.title &&
              lastSpoken.text === message.text;
            
            if (isDuplicate) {
              console.log(
                `🔇 重複通知のため読み上げをスキップ: ${timeDiff.toFixed(1)}秒前の通知と同じ内容`,
                message.app
              );
              return; // 読み上げをスキップ
            }
          }
        }
        
        const speechText = processNotificationForSpeech(message);
        console.log("🔊 読み上げテキスト生成:", speechText);
        if (speechText) {
          // 最後に読み上げた通知の情報を保存
          lastSpokenNotificationRef.current = {
            app: message.app,
            app_id: message.app_id,
            title: message.title,
            text: message.text,
            timestamp: Date.now(),
          };
          
          // IPCで読み上げリクエストを送信
          if (typeof window !== "undefined" && window.ipcRenderer) {
            const ipcRenderer = window.ipcRenderer;
            console.log("📤 IPC送信: speak-text", speechText);
            ipcRenderer.send("speak-text", speechText);
          } else {
            console.warn("⚠️ ipcRendererが利用できません");
          }
        } else {
          console.log("🔇 除外アプリのため読み上げをスキップ:", message.app);
        }
      }
    } else {
      console.warn("⚠️ setLogsRef.current が null です");
    }
  };

  ipcRenderer.on("toast-log", handleToastLog);

  // メインプロセスからのコンソールログを受け取る
  ipcRenderer.on(
    "console-log",
    (
      _event: IpcRendererEvent,
      logData: { level: string; source: string; message: string; data?: unknown }
    ) => {
      const { level, source, message, data } = logData;
      const prefix = `[${source}]`;

      switch (level) {
        case "debug":
          console.debug(`${prefix} ${message}`, data || "");
          break;
        case "error":
          console.error(`${prefix} ${message}`, data || "");
          break;
        case "warn":
          console.warn(`${prefix} ${message}`, data || "");
          break;
        case "info":
          console.info(`${prefix} ${message}`, data || "");
          break;
        default:
          console.log(`${prefix} ${message}`, data || "");
      }
    }
  );

  ipcSetupDone = true;
  console.log("✅ IPC通信セットアップ完了");
}

export function ToastLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<ToastLog[]>([]);
  const [availableVoices, setAvailableVoices] = useState<string[]>([]);
  const isSetupRef = useRef(false);
  const logsLoadedRef = useRef(false);

  // 常に最新のsetLogsとsetAvailableVoicesをrefに保存
  setLogsRef.current = setLogs;
  setAvailableVoicesRef.current = setAvailableVoices;

  // 初回のみIPCセットアップ
  if (!isSetupRef.current) {
    setupIpcListener();
    isSetupRef.current = true;
  }

  // 起動時に保持されているログを取得
  useEffect(() => {
    if (logsLoadedRef.current) {
      return;
    }
    
    if (typeof window !== "undefined" && window.ipcRenderer) {
      window.ipcRenderer.invoke("get-stored-logs").then((storedLogs: ToastLog[]) => {
        if (storedLogs && storedLogs.length > 0) {
          // 空のログをフィルタリング（title、text、messageがすべて空のログを除外）
          const filteredLogs = storedLogs.filter((log) => {
            // past_notificationsタイプは除外しない
            if (log.type === "past_notifications") {
              return true;
            }
            // title、text、messageのいずれかが存在する場合は表示
            return !!(log.title || log.text || log.message);
          });
          
          if (filteredLogs.length > 0) {
            setLogs(filteredLogs);
          }
          logsLoadedRef.current = true;
        }
      }).catch((error) => {
        console.error("Failed to get stored logs:", error);
      });
    }
  }, []);

  // settingsを定期的に更新（useEffectで設定を監視）
  useEffect(() => {
    const updateSettings = () => {
      try {
        const saved = localStorage.getItem("toast-speak-settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          // デフォルト設定とマージ
          settingsRef.current = {
            speechTemplate: parsed.speechTemplate || "{app}、{title}、{text}",
            replacements: parsed.replacements || [],
            blockedApps: parsed.blockedApps || [],
            maxTextLength: parsed.maxTextLength !== undefined ? parsed.maxTextLength : 0,
            consecutiveCharMinLength: parsed.consecutiveCharMinLength !== undefined ? parsed.consecutiveCharMinLength : 0,
          };
        } else {
          // デフォルト設定を使用
          settingsRef.current = {
            speechTemplate: "{app}、{title}、{text}",
            replacements: [],
            blockedApps: [],
            maxTextLength: 0,
            consecutiveCharMinLength: 0,
          };
        }
      } catch {
        // エラー時はデフォルト設定を使用
        settingsRef.current = {
          speechTemplate: "{app}、{title}、{text}",
          replacements: [],
          blockedApps: [],
          maxTextLength: 0,
          consecutiveCharMinLength: 0,
        };
      }
    };

    updateSettings();
    // 定期的に設定を更新（設定変更を検知するため）
    const interval = setInterval(updateSettings, 200);
    return () => clearInterval(interval);
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  const speak = (text: string) => {
    console.log("📤 [Renderer] speak:", text);
    if (typeof window !== "undefined" && window.ipcRenderer) {
      const ipcRenderer = window.ipcRenderer;
      ipcRenderer.send("speak-text", text);
    }
  };

  const setVolume = (volume: number) => {
    console.log("📤 [Renderer] set-volume:", volume);
    if (typeof window !== "undefined" && window.ipcRenderer) {
      const ipcRenderer = window.ipcRenderer;
      ipcRenderer.send("set-volume", volume);
    }
  };

  const setVoice = (voiceName: string) => {
    console.log("📤 [Renderer] set-voice:", voiceName);
    if (typeof window !== "undefined" && window.ipcRenderer) {
      const ipcRenderer = window.ipcRenderer;
      ipcRenderer.send("set-voice", voiceName);
    }
  };

  return (
    <ToastLogContext.Provider
      value={{ logs, clearLogs, speak, setVolume, availableVoices, setVoice }}
    >
      {children}
    </ToastLogContext.Provider>
  );
}

