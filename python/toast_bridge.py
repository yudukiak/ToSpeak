# -*- coding: utf-8 -*-
# toast_bridge.py
# pip install winsdk pywin32
# WindowsのToast通知を取得してElectronに送信し、自動で読み上げる統合スクリプト

import asyncio
import json
import sys
import io
import os
from datetime import datetime
import win32com.client
import pythoncom

# UTF-8エンコーディングを強制設定
os.environ['PYTHONIOENCODING'] = 'utf-8'

# 標準出力・標準エラー出力をUTF-8に強制設定
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    else:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)
except Exception:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)

from winsdk.windows.ui.notifications.management import (
    UserNotificationListener,
    UserNotificationListenerAccessStatus,
)
from winsdk.windows.ui.notifications import NotificationKinds

# =================================================
# 設定
# =================================================
TARGET_VOICE_NAME = "CeVIO"  # CeVIO を含む SAPI ボイス名
VOLUME_LEVEL = 20            # 0〜100
SAPI_SPEAK_ASYNC_FLAG = 1    # 非同期フラグ (SVSFDefault)
VOLUME_MIN = 0               # 音量の最小値
VOLUME_MAX = 100             # 音量の最大値

# グローバル変数（複数タスク間で共有）
speaker = None
current_volume = VOLUME_LEVEL
main_loop = None  # メインイベントループへの参照

# =================================================
# デバッグログ出力
# =================================================

def send_json(data: dict):
    """JSONメッセージをstdoutに出力（Electron側で受け取る）"""
    if "message" in data:
        data["message"] = f"{data['message']}"
    
    # sourceを設定（設定されていない場合のみ）
    if "source" not in data:
        data["source"] = "toast_bridge"
    
    print(json.dumps(data, ensure_ascii=False), flush=True)


def log_debug(message: str):
    """デバッグログをstdoutに出力（Electron側で受け取る）"""
    log_msg = {
        "type": "debug",
        "source": "toast_bridge",
        "message": message,
        "timestamp": datetime.now().isoformat()
    }
    send_json(log_msg)


def log_error(message: str):
    """エラーログをstdoutに出力（Electron側で受け取る）"""
    log_msg = {
        "type": "error",
        "source": "toast_bridge",
        "message": message,
        "timestamp": datetime.now().isoformat()
    }
    send_json(log_msg)


def log_info(message: str):
    """情報ログをstdoutに出力（Electron側で受け取る）"""
    log_msg = {
        "type": "info",
        "source": "toast_bridge",
        "message": message,
        "timestamp": datetime.now().isoformat()
    }
    send_json(log_msg)

# =================================================
# SAPI 初期化
# =================================================

def create_sapi_speaker(volume: int = VOLUME_LEVEL):
    """
    SAPIスピーカーオブジェクトを作成して設定する
    
    Args:
        volume: 音量 (0〜100)
    
    Returns:
        SAPI.SpVoice オブジェクト、失敗時は None
    """
    try:
        sapi_speaker = win32com.client.Dispatch("SAPI.SpVoice")
        sapi_speaker.Rate = 0
        sapi_speaker.Volume = volume

        # 指定された音声を検索して設定
        voices = sapi_speaker.GetVoices()
        for voice in voices:
            desc = voice.GetDescription()
            if TARGET_VOICE_NAME in desc:
                sapi_speaker.Voice = voice
                break
        # 見つからない場合は標準音声を使用

        return sapi_speaker
    except Exception as e:
        log_error(f"SAPI初期化エラー: {e}")
        return None


def setup_sapi():
    """
    メインスレッドでSAPIを初期化
    
    Returns:
        SAPI.SpVoice オブジェクト、失敗時は None
    """
    return create_sapi_speaker()

# =================================================
# 読み上げ処理
# =================================================

def process_notification_for_speech(log: dict) -> str:
    """
    通知データを加工して読み上げ用テキストを生成
    
    Args:
        log: 通知ログ（app, title, text を含む）
    
    Returns:
        読み上げ用テキスト
    """
    parts = []
    
    # アプリ名
    if log.get("app"):
        parts.append(log["app"])
    
    # タイトル
    if log.get("title"):
        parts.append(log["title"])
    
    # 本文
    if log.get("text"):
        # 改行を空白に置換
        text = log["text"].replace("\n", " ")
        parts.append(text)
    
    return "、".join(parts) if parts else "通知があります"


async def speak_text(text: str):
    """
    テキストを読み上げる（非同期ラッパー）
    メインスレッドで作成したspeakerオブジェクトを使用
    
    Args:
        text: 読み上げるテキスト
    """
    global speaker, current_volume
    
    if not text:
        log_debug("speak_text: テキストが空です")
        return
    
    if not speaker:
        log_error("speak_text: speakerが初期化されていません")
        return
    
    try:
        log_debug(f"speak_text: 読み上げ開始 {text[:50]}... (音量: {current_volume})")
        
        # メインスレッドで直接実行（COMオブジェクトはスレッドセーフではない）
        # 非同期フラグで読み上げ開始し、WaitUntilDoneで待つ
        speaker.Volume = current_volume
        
        # 使用中の音声を確認
        try:
            current_voice = speaker.Voice
            voice_desc = current_voice.GetDescription() if current_voice else "None"
            log_debug(f"SAPI音声: {voice_desc}, 音量: {current_volume}")
        except Exception as voice_error:
            log_debug(f"音声情報取得エラー: {voice_error}")
        
        # 非同期フラグで読み上げ開始
        speaker.Speak(text, SAPI_SPEAK_ASYNC_FLAG)
        
        # 読み上げが完了するまで待つ（別スレッドで実行）
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _wait_for_speech_completion, speaker)
        
        log_debug(f"speak_text: 読み上げ完了")
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        log_error(f"読み上げエラー: {e}\n{error_detail}")


def _wait_for_speech_completion(speaker_obj):
    """
    読み上げが完了するまで待つ（別スレッドで実行）
    
    Args:
        speaker_obj: SAPI.SpVoiceオブジェクト
    """
    try:
        # WaitUntilDoneで読み上げ完了を待つ（最大60秒）
        speaker_obj.WaitUntilDone(60)
        log_debug("読み上げ完了（WaitUntilDone）")
    except Exception as e:
        log_error(f"WaitUntilDoneエラー: {e}")
        # エラーが発生しても読み上げは続行される可能性がある

# =================================================
# 通知リスナー取得
# =================================================

async def get_listener():
    """通知リスナーを取得する"""
    try:
        listener = UserNotificationListener.current
        access_status = await listener.request_access_async()
        if access_status != UserNotificationListenerAccessStatus.ALLOWED:
            log_error("ACCESS_DENIED")
            return None
        return listener
    except Exception as e:
        log_error(f"LISTENER_ERROR: {e}")
        return None

# =================================================
# Toast通知監視ループ
# =================================================

async def notification_loop(listener):
    """
    WindowsのToast通知を監視し、新規通知をJSON形式でstdoutに送信する
    通知を取得したら自動で読み上げる
    """
    global speaker, current_volume
    

    processed_ids = set()
    past_notifications = []

    # 既存の通知をスキップ（起動時の既存通知は表示しない）
    try:
        existing = await listener.get_notifications_async(NotificationKinds.TOAST)
        if existing:
            for n in existing:
                processed_ids.add(n.id)
                
                # 既存通知の内容を取得
                try:
                    # アプリ名を取得
                    app_name = "通知"
                    if n.app_info and n.app_info.display_info:
                        app_name = n.app_info.display_info.display_name
                    
                    # アプリIDを取得
                    app_id = ""
                    if n.app_info and hasattr(n.app_info, 'app_user_model_id'):
                        try:
                            app_id = n.app_info.app_user_model_id
                        except:
                            pass
                    
                    # 通知テキストを取得（タイトルと本文を分離）
                    bindings = (n.notification.visual.bindings 
                               if n.notification and n.notification.visual and n.notification.visual.bindings 
                               else [])
                    text_parts = [
                        el.text.strip()
                        for binding in bindings
                        for el in binding.get_text_elements()
                        if el.text and el.text.strip()
                    ]
                    
                    # 最初の要素をタイトル、残りを本文として扱う
                    title = text_parts[0] if text_parts else ""
                    body = " ".join(text_parts[1:]).strip()
                    
                    # 過去の通知として保存
                    past_notifications.append({
                        "app": app_name,
                        "app_id": app_id if app_id else "",
                        "title": title,
                        "text": body,
                        "notification_id": str(n.id),
                        "timestamp": datetime.now().isoformat()
                    })
                except Exception as log_error_ex:
                    # ログ出力でエラーが発生しても処理は続行
                    pass
            
            # 過去の通知がある場合、1つのメッセージとして送信
            if past_notifications:
                send_json({
                    "type": "past_notifications",
                    "source": "toast_bridge",
                    "title": "過去の通知",
                    "message": f"{len(past_notifications)}件の過去の通知があります",
                    "notifications": past_notifications,
                    "timestamp": datetime.now().isoformat()
                })
    except Exception as e:
        log_error(f"既存通知の取得に失敗: {e}")

    # 通知監視ループ
    while True:
        try:
            notifications = await listener.get_notifications_async(NotificationKinds.TOAST)
            current_ids = set()

            if notifications:
                for n in notifications:
                    current_ids.add(n.id)
                    
                    # 既に処理済みの通知はスキップ
                    if n.id in processed_ids:
                        continue
                    
                    processed_ids.add(n.id)

                    # アプリ名を取得
                    app_name = "通知"
                    if n.app_info and n.app_info.display_info:
                        app_name = n.app_info.display_info.display_name

                    # アプリIDを取得
                    app_id = ""
                    if n.app_info and hasattr(n.app_info, 'app_user_model_id'):
                        try:
                            app_id = n.app_info.app_user_model_id
                        except:
                            pass

                    # 通知テキストを取得（タイトルと本文を分離）
                    bindings = (n.notification.visual.bindings 
                               if n.notification and n.notification.visual and n.notification.visual.bindings 
                               else [])
                    text_parts = [
                        el.text.strip()
                        for binding in bindings
                        for el in binding.get_text_elements()
                        if el.text and el.text.strip()
                    ]

                    # 最初の要素をタイトル、残りを本文として扱う
                    title = text_parts[0] if text_parts else ""
                    body = " ".join(text_parts[1:]).strip()

                    # Electron側に送信するメッセージ
                    msg = {
                        "type": "notification",
                        "source": "toast_bridge",
                        "app": app_name,
                        "app_id": app_id if app_id else "",
                        "title": title,
                        "text": body,
                        "notification_id": str(n.id),
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    # stdoutにJSONとして送信（Electron側で受け取る）
                    send_json(msg)
                    
                    # 自動で読み上げ
                    speech_text = process_notification_for_speech(msg)
                    if speech_text:
                        await speak_text(speech_text)

            # 古いIDをクリーンアップ（メモリリーク防止）
            if len(processed_ids) > 1000:
                processed_ids = processed_ids.intersection(current_ids)

            await asyncio.sleep(1)

        except asyncio.CancelledError:
            break
        except Exception as e:
            log_error(f"通知ループエラー: {e}")
            await asyncio.sleep(1)

# =================================================
# Electron → Python のコマンド受付
# =================================================

def blocking_read():
    """
    stdinからJSONメッセージを読み取り、処理する
    別スレッドで実行されるため、このスレッド内でCOMを初期化する必要がある
    """
    global speaker, current_volume, main_loop
    
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
                    log_debug(f"読み上げリクエスト: text={text}, main_loop={main_loop is not None}")
                    if text and main_loop:
                        log_debug(f"読み上げ開始: {text[:50]}...")
                        asyncio.run_coroutine_threadsafe(speak_text(text), main_loop)
                    elif not text:
                        log_error("読み上げテキストが空です")
                    elif not main_loop:
                        log_error("main_loopがNoneです")
                
                elif msg_type == "set_volume":
                    # 音量設定（同期処理）
                    volume = msg.get("volume", VOLUME_LEVEL)
                    try:
                        clamped_volume = max(VOLUME_MIN, min(VOLUME_MAX, int(volume)))
                        current_volume = clamped_volume
                        # グローバルのspeakerを直接更新
                        # ただし、メインスレッドで作成したオブジェクトなので
                        # ここでは音量だけを更新し、実際の読み上げ時にも音量を設定する
                        log_debug(f"音量設定: {clamped_volume}")
                    except Exception as e:
                        log_error(f"音量設定エラー: {e}")
            
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

# =================================================
# メイン処理
# =================================================

async def main():
    """
    メイン関数
    SAPI初期化、通知監視、stdinループを同時に実行する
    """
    global speaker, current_volume, main_loop
    
    # メインイベントループへの参照を保存
    main_loop = asyncio.get_running_loop()
    
    # 起動メッセージ
    """
    send_json({
      "type": "info",
      "source": "toast_bridge",
      "title": "お知らせ",
      "message": "起動しました",
      "timestamp": datetime.now().isoformat()
    })
    """

    # SAPI初期化（メインスレッドで）
    speaker = setup_sapi()
    if not speaker:
        log_error("SAPI初期化に失敗しました")
        sys.exit(1)

    # 通知リスナーを取得
    listener = await get_listener()
    if not listener:
        sys.exit(1)

    # 準備完了メッセージを送信（Electron側で初期音量を送信するタイミングを検知するため）
    send_json({
        "type": "ready",
        "source": "toast_bridge",
        "title": "お知らせ",
        "message": "準備完了",
        "timestamp": datetime.now().isoformat(),
        "volume": VOLUME_LEVEL,
    })

    # 通知監視とstdinループを同時に実行
    await asyncio.gather(
        notification_loop(listener),
        stdin_loop(),
        return_exceptions=True
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log_info("Toast Bridge: 終了しました")
    except SystemExit:
        pass

