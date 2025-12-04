// 変換リストの型定義
export interface Replacement {
  from: string;
  to: string;
  isRegex?: boolean; // 正規表現として扱うか
}

// 読ませないアプリの型定義
export interface BlockedApp {
  app?: string;
  app_id?: string;
  appIsRegex?: boolean; // アプリ名を正規表現として扱うか
  appIdIsRegex?: boolean; // アプリIDを正規表現として扱うか
  title?: string; // タイトル（app または app_id と組み合わせて使用）
  titleIsRegex?: boolean; // タイトルを正規表現として扱うか
  text?: string; // 本文（app または app_id と組み合わせて使用）
  textIsRegex?: boolean; // 本文を正規表現として扱うか
}

