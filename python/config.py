# -*- coding: utf-8 -*-
# config.py
# 設定・定数・グローバル変数の定義

import sys
import io
import os

# UTF-8エンコーディングを強制設定
os.environ['PYTHONIOENCODING'] = 'utf-8'

# 標準入出力・標準エラー出力をUTF-8に強制設定
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
        sys.stdin.reconfigure(encoding='utf-8', errors='replace')
    else:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)
        sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='replace', line_buffering=True)
except Exception:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='replace', line_buffering=True)

# =================================================
# 設定
# =================================================
TARGET_VOICE_NAME = ""  # デフォルトは空（音声未選択、読み上げ無効）
VOLUME_LEVEL = 20            # 0〜100
SAPI_SPEAK_ASYNC_FLAG = 1    # 非同期フラグ (SVSFDefault)
VOLUME_MIN = 0               # 音量の最小値
VOLUME_MAX = 100             # 音量の最大値

# グローバル変数（複数タスク間で共有）
current_volume = VOLUME_LEVEL
current_voice_name = TARGET_VOICE_NAME  # 現在選択されている音声名（空の場合は読み上げ無効）
main_loop = None  # メインイベントループへの参照

# =================================================
# e2k (English to Katakana Translator) の初期化
# =================================================
E2K_IMPORT_ERROR = None
try:
    from e2k import C2K, NGram
    E2K_AVAILABLE = True
    # e2kのインスタンスを初期化
    e2k_ngram = NGram()
    e2k_c2k = C2K()
    # 初期化ログは後で出力（loggerモジュールをインポートする必要があるため）
except ImportError as e:
    E2K_AVAILABLE = False
    e2k_ngram = None
    e2k_c2k = None
    E2K_IMPORT_ERROR = str(e)
