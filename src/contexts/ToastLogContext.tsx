import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  ReactNode,
} from "react";
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
    | "past_notifications";
  app?: string;
  app_id?: string;
  title?: string;
  text?: string;
  notification_id?: string;
  timestamp?: string;
  message?: string;
  source?: string;
  notifications?: PastNotification[]; // 過去の通知一覧
}

interface ToastLogContextType {
  logs: ToastLog[];
  clearLogs: () => void;
  speak: (text: string) => void;
  setVolume: (volume: number) => void;
}

const ToastLogContext = createContext<ToastLogContextType | undefined>(
  undefined
);

// IPC通信のセットアップ（モジュールレベルで一度だけ実行）
let ipcSetupDone = false;
const setLogsRef = {
  current: null as
    | ((updater: (prevLogs: ToastLog[]) => ToastLog[]) => void)
    | null,
};
const settingsRef = { current: null as Settings | null };

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

        // app が指定されている場合のチェック
        let appMatches = false;
        if (blocked.app) {
          appMatches = matchString(log.app, blocked.app, blocked.appIsRegex);
        }

        // app_id が指定されている場合のチェック
        let appIdMatches = false;
        if (blocked.app_id) {
          appIdMatches = matchString(
            log.app_id,
            blocked.app_id,
            blocked.appIdIsRegex
          );
        }

        // app または app_id のいずれかがマッチする必要がある
        const appOrAppIdMatches = appMatches || appIdMatches;

        // app も app_id も指定されていない場合はスキップ
        if (!blocked.app && !blocked.app_id) {
          return false;
        }

        // title または text が指定されている場合のチェック
        const hasTitleOrText = blocked.title || blocked.text;
        if (hasTitleOrText) {
          // app/app_id × (title OR text) の組み合わせチェック
          let titleMatches = false;
          let textMatches = false;

          if (blocked.title) {
            titleMatches = matchString(
              log.title,
              blocked.title,
              blocked.titleIsRegex
            );
          }

          if (blocked.text) {
            textMatches = matchString(
              log.text,
              blocked.text,
              blocked.textIsRegex
            );
          }

          // app/app_id がマッチ かつ (title がマッチ OR text がマッチ)
          return appOrAppIdMatches && (titleMatches || textMatches);
        } else {
          // title と text が指定されていない場合は、app/app_id のみでマッチ（既存の動作）
          return appOrAppIdMatches;
        }
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

    // 変換リストを適用（大文字小文字を区別せずに置換）
    settings.replacements.forEach((replacement: Replacement) => {
      if (replacement.from && replacement.to) {
        // エスケープして正規表現として使用
        const escapedFrom = replacement.from.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
        text = text.replace(new RegExp(escapedFrom, "gi"), replacement.to);
      }
    });

    // 連続文字の短縮処理
    const consecutiveMinLength = settings.consecutiveCharMinLength || 0;
    if (consecutiveMinLength > 0) {
      // 同じ文字がn文字以上連続している場合、3文字に短縮
      // 正規表現: (.)\1{n-1,} で同じ文字がn文字以上連続している箇所を検出
      const regex = new RegExp(`(.)\\1{${consecutiveMinLength - 1},}`, "g");
      text = text.replace(regex, (match) => {
        // 最初の文字を取得して、3文字分だけ繰り返す
        const char = match[0];
        return char.repeat(3);
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
        const speechText = processNotificationForSpeech(message);
        console.log("🔊 読み上げテキスト生成:", speechText);
        if (speechText) {
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
  const isSetupRef = useRef(false);

  // 常に最新のsetLogsをrefに保存
  setLogsRef.current = setLogs;

  // 初回のみIPCセットアップ
  if (!isSetupRef.current) {
    setupIpcListener();
    isSetupRef.current = true;
  }

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

  return (
    <ToastLogContext.Provider value={{ logs, clearLogs, speak, setVolume }}>
      {children}
    </ToastLogContext.Provider>
  );
}

export function useToastLogs() {
  const context = useContext(ToastLogContext);
  if (context === undefined) {
    throw new Error("useToastLogs must be used within a ToastLogProvider");
  }
  return context;
}
