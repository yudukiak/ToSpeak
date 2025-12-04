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

