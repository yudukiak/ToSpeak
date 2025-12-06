# -*- coding: utf-8 -*-
# toast_bridge.py
# pip install -r requirements.txt
# WindowsのToast通知を取得してElectronに送信し、自動で読み上げる統合スクリプト

import asyncio
import sys
from datetime import datetime

# configモジュールを最初にインポート（UTF-8設定のため）
import config

# その後、loggerをインポート（configの後に）
from logger import log_debug, log_error, send_json
from sapi_speaker import get_available_voices
from notification_monitor import get_listener, get_past_notifications, notification_loop
from stdin_handler import stdin_loop


async def main():
    """
    メイン関数
    通知監視、stdinループを同時に実行する
    CeVIO Alの同時アクセス制限対策のため、SAPI接続は読み上げ時のみ確立される
    """
    # メインイベントループへの参照を保存
    config.main_loop = asyncio.get_running_loop()
    
    # 1. 起動メッセージ
    send_json({
      "type": "info",
      "source": "toast_bridge",
      "title": "お知らせ",
      "text": "ToSpeak の起動を準備中",
      "timestamp": datetime.now().isoformat()
    })

    # Pythonバージョン情報をログに出力
    log_debug(f"Pythonバージョン: {sys.version}")
    log_debug(f"Python実行パス: {sys.executable}")
    
    # e2kの初期化状態をログに出力
    if config.E2K_AVAILABLE:
        log_debug("e2k (English to Katakana Translator) が利用可能です")
    else:
        if config.E2K_IMPORT_ERROR:
            log_error(f"e2kのインポートに失敗しました: {config.E2K_IMPORT_ERROR}")
        else:
            log_error("e2kが利用できません。英語は片仮名に変換されません。")
        log_debug(f"e2kをインストールするには: {sys.executable} -m pip install e2k")
        log_debug(f"または: py -m pip install e2k (Pythonランチャーを使用)")
    
    # 利用可能な音声リストを取得して送信
    available_voices = get_available_voices()
    send_json({
        "type": "available_voices",
        "source": "toast_bridge",
        "voices": available_voices,
        "timestamp": datetime.now().isoformat(),
    })
    log_debug(f"利用可能な音声数: {len(available_voices)}")

    # 音声設定の確認（CeVIO Alの同時アクセス制限対策のため、接続は読み上げ時のみ確立）
    # 起動時は音声設定を待機する（Electron側から送られてくるまで待機）
    if config.current_voice_name and config.current_voice_name.strip():
        log_debug(f"音声設定: {config.current_voice_name}（接続は読み上げ時に確立されます）")
    else:
        # 起動時は音声設定を待機するだけ（メッセージ送信なし）
        log_debug("音声が設定されていません。Electron側からの音声設定を待機中...")

    # 通知リスナーを取得
    listener = await get_listener()
    if not listener:
        sys.exit(1)

    # 2. 過去の通知を取得して送信
    processed_ids, _ = await get_past_notifications(listener)

    # 準備完了メッセージを送信（Electron側で初期音量を送信するタイミングを検知するため）
    send_json({
        "type": "ready",
        "source": "toast_bridge",
        "title": "お知らせ",
        "text": "ToSpeak の起動を完了しました",
        "timestamp": datetime.now().isoformat(),
        "volume": config.VOLUME_LEVEL,
    })

    # 通知監視とstdinループを同時に実行
    await asyncio.gather(
        notification_loop(listener, processed_ids),
        stdin_loop(),
        return_exceptions=True
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log_debug("Toast Bridge: 終了しました")
    except SystemExit:
        pass
