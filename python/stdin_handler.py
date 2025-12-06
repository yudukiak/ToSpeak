# -*- coding: utf-8 -*-
# stdin_handler.py
# Electronからのstdinコマンド受付機能

import json
import sys
import asyncio
import pythoncom

import config
from logger import log_debug, log_error
from sapi_speaker import speak_text, change_voice


def blocking_read():
    """
    stdinからJSONメッセージを読み取り、処理する
    別スレッドで実行されるため、このスレッド内でCOMを初期化する必要がある
    """
    
    pythoncom.CoInitialize()
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            
            try:
                msg = json.loads(line)
                msg_type = msg.get("type")
                log_debug(f"stdin受信: type={msg_type}, msg={msg}")
                
                if msg_type == "speak":
                    # 手動読み上げリクエスト
                    text = msg.get("text", "")
                    log_debug(f"読み上げリクエスト: text={text}, main_loop={config.main_loop is not None}")
                    if text and config.main_loop:
                        log_debug(f"読み上げ開始: {text[:50]}...")
                        asyncio.run_coroutine_threadsafe(speak_text(text), config.main_loop)
                    elif not text:
                        log_error("読み上げテキストが空です")
                    elif not config.main_loop:
                        log_error("main_loopがNoneです")
                
                elif msg_type == "set_volume":
                    # 音量設定（同期処理）
                    volume = msg.get("volume", config.VOLUME_LEVEL)
                    try:
                        clamped_volume = max(config.VOLUME_MIN, min(config.VOLUME_MAX, int(volume)))
                        config.current_volume = clamped_volume
                        log_debug(f"音量設定: {clamped_volume}")
                    except Exception as e:
                        log_error(f"音量設定エラー: {e}")
                
                elif msg_type == "set_voice":
                    # 音声設定（非同期処理）
                    voice_name = msg.get("voice_name", None)
                    # 空文字列の場合はNoneに変換（デフォルト音声を使用）
                    if voice_name == "":
                        voice_name = None
                    if config.main_loop:
                        log_debug(f"音声変更リクエスト: voice_name={voice_name or 'デフォルト（CeVIO）'}")
                        # メインスレッドで音声を変更する必要がある
                        asyncio.run_coroutine_threadsafe(change_voice(voice_name), config.main_loop)
                    elif not config.main_loop:
                        log_error("main_loopがNoneです")
            
            except json.JSONDecodeError:
                continue
    
    finally:
        pythoncom.CoUninitialize()


async def stdin_loop():
    """
    Electron からの JSON 行を読み取り、type=speak を SAPI で読み上げる
    または type=set_volume で音量を変更する
    """
    loop = asyncio.get_running_loop()
    # ブロッキングI/Oを別スレッドで回す
    await loop.run_in_executor(None, blocking_read)
