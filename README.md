# ToSpeak

WindowsのToast通知を音声で読み上げるElectronアプリケーションです。

## 概要

Windows 10/11のToast通知を監視し、通知内容を音声合成で読み上げるツールです。
通知のアプリ名、タイトル、本文をカスタマイズ可能なテンプレートで読み上げることができます。

## 主な機能

- **Toast通知の自動読み上げ**: WindowsのToast通知を自動検知して音声で読み上げ
- **カスタマイズ可能な読み上げテンプレート**: アプリ名、タイトル、本文の読み上げ順序や形式を設定可能
- **テキスト置換機能**: 読み上げ前に特定の文字列を置換（正規表現対応）
- **アプリ・通知のブロック機能**: 特定のアプリや通知を読み上げから除外（正規表現対応）
- **音声設定**: 音量や音声の種類を調整可能
- **通知ログ**: 過去の通知履歴を確認可能
- **自動更新**: GitHub Releasesから自動的にアップデートを取得

## 必要な環境

- Windows 11

### 開発時のみ

- Node.js 18以上
- Python 3.11以上

## 技術スタック

### フロントエンド

- **React**: UIフレームワーク
- **TypeScript**: 型安全性
- **Vite**: ビルドツール
- **Tailwind CSS**: スタイリング
- **shadcn/ui**: UIコンポーネントライブラリ（Radix UIベース）
- **React Router**: ルーティング
- **safe-regex**: ReDoS対策ライブラリ

### バックエンド

- **Electron**: デスクトップアプリケーションフレームワーク
- **Python**: Toast通知監視・音声合成ブリッジ
- **PyInstaller**: Pythonスクリプトの実行可能ファイル化

## セットアップ

### 依存関係のインストール

#### Node.js依存関係

```bash
npm install
```

#### Python依存関係

```bash
pip install -r requirements.txt
```

### 開発サーバーの起動

```bash
npm run dev
```

## コマンド

### 開発

開発サーバーを起動

```bash
npm run dev
```

コードのリントチェック

```bash
npm run lint
```

### ビルド

ローカルビルド

```bash
npm run build
```

ビルド成果物のクリーンアップ

```bash
npm run build:clean
```

### リリース

GitHub Release を公開（ドラフトとして作成）

```bash
npm run publish
```

`publish`コマンドを実行する前に`.env`ファイルに`GITHUB_TOKEN`または`GH_TOKEN`を設定してください。

## ビルドプロセス

`npm run build`を実行すると、以下の処理が自動的に実行されます。

1. **prebuild**
   - `build:clean`: 以前のビルド成果物をクリーンアップ
   - `build:bridge`: Pythonブリッジ（`ToSpeak-Bridge.exe`）をビルド
2. **build**
   - TypeScriptのコンパイル
   - Viteによるフロントエンドのビルド
   - electron-builderによるElectronアプリのパッケージ化

## セキュリティ

### ReDoS対策

本アプリケーションでは、正規表現を使用するすべての箇所で**Regular Expression Denial of Service (ReDoS)** 攻撃に対する対策を実装しています。

- **`safe-regex`パッケージの使用**: すべての動的に生成される正規表現パターンに対して、`safe-regex`ライブラリによる安全性チェックを実施
- **保護対象**:
  - ユーザー定義の正規表現パターン（置換機能、ブロック機能）
  - エスケープ後の正規表現パターン
  - 動的に生成される正規表現パターン（連続文字の短縮処理など）
- **動作**: 危険なパターンが検出された場合、該当処理をスキップし、警告ログを出力します

これにより、悪意のある正規表現パターンによるサービス拒否攻撃を防止しています。

## プロジェクト構造

```text
ToSpeak/
├ electron/                     # Electronメインプロセス
│ ├ main.ts                    # メインプロセスエントリーポイント
│ ├ preload.ts                 # プリロードスクリプト
│ └ electron-env.d.ts          # Electron型定義
├ src/                          # Reactアプリケーション
│ ├ components/                # Reactコンポーネント
│ │ ├ notification-log/       # 通知ログ関連コンポーネント
│ │ ├ settings-drawer/        # 設定ドロワー関連コンポーネント
│ │ ├ ui/                     # UIコンポーネント（shadcn/ui）
│ │ ├ Header.tsx              # ヘッダーコンポーネント
│ │ └ update-notification.tsx # 更新通知コンポーネント
│ ├ contexts/                  # React Context
│ │ ├ SettingsContext.tsx     # 設定管理Context
│ │ ├ ToastLogContext.tsx     # 通知ログ管理Context（ReDoS対策含む）
│ │ └ use-*.ts                # カスタムフック
│ ├ lib/                       # ユーティリティ関数
│ │ └ utils.ts                # 共通ユーティリティ
│ ├ types/                     # TypeScript型定義
│ │ ├ settings.ts             # 設定関連の型
│ │ └ toast-log.ts            # 通知ログ関連の型
│ ├ safe-regex.d.ts            # safe-regex型定義（ReDoS対策）
│ ├ App.tsx                    # メインアプリケーションコンポーネント
│ ├ main.tsx                   # Reactエントリーポイント
│ └ vite-env.d.ts              # Vite型定義
├ python/                       # Pythonブリッジ
│ └ toast_bridge.py            # Toast通知監視・音声合成
├ scripts/                      # ビルド・リリーススクリプト
│ └ update-github-release-notes.js # GitHub Release Notes更新スクリプト
├ public/                       # 静的ファイル
├ .github/                      # GitHub設定
│ └ RELEASE_NOTES_TEMPLATE.md  # リリースノートテンプレート
├ electron-builder.json5        # Electron Builder設定
├ vite.config.ts                # Vite設定
├ tsconfig.json                 # TypeScript設定
├ toast_bridge.spec             # PyInstaller設定
├ requirements.txt              # Python依存関係
└ package.json                  # Node.js依存関係・スクリプト
```

### ビルド成果物（ビルド時に生成、.gitignore対象）

以下のディレクトリは`npm run build`実行時に自動生成されます：

```text
ToSpeak/
├ dist/                       # Viteビルド成果物（フロントエンド）
├ dist-electron/              # Electronビルド成果物
├ dist-python/                # Pythonブリッジビルド成果物
│ └ ToSpeak-Bridge.exe       # ビルドされたPythonブリッジ実行ファイル
└ release/                    # electron-builderによる配布用パッケージ
  └ *.exe, *.zip など         # インストーラー・配布ファイル
```

これらのディレクトリは`.gitignore`に含まれており、リポジトリには含まれません。
