# ToSpeak

WindowsのToast通知を音声で読み上げるElectronアプリケーションです。

## 概要

Windows 10/11のToast通知を監視し、通知内容を音声合成で読み上げるツールです。
通知のアプリ名、タイトル、本文をカスタマイズ可能なテンプレートで読み上げることができます。

## 主な機能

- **Toast通知の自動読み上げ**: WindowsのToast通知を自動検知して音声で読み上げ
- **カスタマイズ可能な読み上げテンプレート**: アプリ名、タイトル、本文の読み上げ順序や形式を設定可能
- **テキスト置換機能**: 読み上げ前に特定の文字列を置換（正規表現対応）
- **アプリ・通知のブロック機能**: 特定のアプリや通知を読み上げから除外
- **音声設定**: 音量や音声の種類を調整可能
- **通知ログ**: 過去の通知履歴を確認可能
- **自動更新**: GitHub Releasesから自動的にアップデートを取得

## 必要な環境

- Windows 11

### 開発時のみ

- Node.js 18以上
- Python 3.x

## セットアップ

### 依存関係のインストール

```bash
npm install
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

#### 注意

`publish`コマンドを実行する前に、`.env`ファイルに`GITHUB_TOKEN`または`GH_TOKEN`を設定してください。

## ビルドプロセス

`npm run build`を実行すると、以下の処理が自動的に実行されます。

1. **prebuild**
   - `build:clean`: 以前のビルド成果物をクリーンアップ
   - `build:bridge`: Pythonブリッジ（`ToSpeak-Bridge.exe`）をビルド
2. **build**
   - TypeScriptのコンパイル
   - Viteによるフロントエンドのビルド
   - electron-builderによるElectronアプリのパッケージ化

## プロジェクト構造

```text
ToSpeak/
├ electron/         # Electronメインプロセス
│ ├ main.ts        # メインプロセスエントリーポイント
│ └ preload.ts     # プリロードスクリプト
├ src/              # Reactアプリケーション
│ ├ components/    # Reactコンポーネント
│ ├ contexts/      # React Context
│ └ types/         # TypeScript型定義
└ python/           # Pythonブリッジ
  └ toast_bridge.py # Toast通知監視・音声合成
```
