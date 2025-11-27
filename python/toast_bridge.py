# -*- coding: utf-8 -*-
# toast_bridge.py
# pip install winsdk pywin32 e2k
# WindowsのToast通知を取得してElectronに送信し、自動で読み上げる統合スクリプト

import asyncio
import json
import sys
import io
import os
from datetime import datetime
import win32com.client
import pythoncom

# e2k (English to Katakana Translator) をインポート
E2K_IMPORT_ERROR = None
try:
    from e2k import C2K, NGram
    E2K_AVAILABLE = True
    # e2kのインスタンスを初期化
    e2k_ngram = NGram()
    e2k_c2k = C2K()
    # 初期化ログは後で出力（log_debugが定義される前のため）
except ImportError as e:
    E2K_AVAILABLE = False
    e2k_ngram = None
    e2k_c2k = None
    E2K_IMPORT_ERROR = str(e)

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

def _convert_single_english_word(word: str) -> str:
    """
    単一の英単語を片仮名に変換する
    
    Args:
        word: 変換する英単語（アルファベットのみ）
    
    Returns:
        片仮名に変換された単語。変換に失敗した場合は元の単語を返す
    """
    try:
        # スペル読みか綴り読みかを判定
        # NGramモデルを使用して、単語が一般的なスペル読みかどうかを判定
        is_spell_reading = e2k_ngram(word)
        log_debug(f"_convert_single_english_word: 単語 '{word}' - スペル読み判定: {is_spell_reading}")
        
        if is_spell_reading:
            # スペル読み: 一般的な単語として発音に基づいて変換
            # 例: "Hello" → "ハロー", "Google" → "グーグル"
            converted = e2k_c2k(word)
        else:
            # 綴り読み: 略語や固有名詞など、1文字ずつ読み上げる
            # 例: "MVP" → "エムブイピー", "API" → "エーピーアイ"
            converted = e2k_ngram.as_is(word.lower())
        
        # 変換結果が空の場合は元の単語を返す
        if converted and converted.strip():
            log_debug(f"_convert_single_english_word: 単語 '{word}' → '{converted}'")
            return converted
        else:
            log_debug(f"_convert_single_english_word: 単語 '{word}' - 変換結果が空のため元のまま")
            return word
    except Exception as e:
        # 変換エラーが発生した場合は元の単語を返す
        import traceback
        error_detail = traceback.format_exc()
        log_debug(f"_convert_single_english_word: 単語 '{word}' の変換エラー: {e}\n{error_detail}")
        return word


def convert_english_to_katakana(text: str) -> str:
    """
    英語テキストを片仮名に変換する
    日本語と英語が混在している場合、英語部分だけを抽出して変換する
    
    処理の流れ:
    1. テキストを「英字の連続」と「それ以外（日本語、スペース、記号など）」に分割
    2. 英字部分のみをe2kで片仮名に変換
    3. それ以外の部分はそのまま保持
    4. すべての部分を結合して返す
    
    Args:
        text: 変換するテキスト
    
    Returns:
        片仮名に変換されたテキスト（e2kが利用できない場合は元のテキスト）
    
    Examples:
        >>> convert_english_to_katakana("Hello、世界")
        "ハロー、世界"
        >>> convert_english_to_katakana("Google Chrome、Notification #7")
        "グーグル クローム、ノーティフィケーション #7"
    """
    # 空文字列の場合はそのまま返す
    if not text:
        log_debug("convert_english_to_katakana: テキストが空です")
        return text
    
    # e2kが利用できない場合は元のテキストを返す
    if not E2K_AVAILABLE:
        log_debug(f"convert_english_to_katakana: e2kが利用できません。元のテキストを返します: {text[:50]}...")
        return text
    
    try:
        import re
        log_debug(f"convert_english_to_katakana: 変換前テキスト: {text[:100]}...")
        
        # 正規表現で「英字の連続」と「それ以外」に分割
        # グループ1: [a-zA-Z]+ → 英字の連続（1文字以上）
        # グループ2: [^a-zA-Z]+ → それ以外（日本語、スペース、記号、数字など）
        # この正規表現により、テキスト全体が交互に「英字」と「非英字」に分割される
        pattern = re.compile(r'([a-zA-Z]+)|([^a-zA-Z]+)')
        parts = pattern.findall(text)
        
        # 変換結果を格納するリスト
        converted_parts = []
        
        # 各チャンクを処理
        for part_tuple in parts:
            english_chunk = part_tuple[0]  # 英字の連続（例: "Google", "Chrome"）
            non_english_chunk = part_tuple[1]  # それ以外（例: "、", " ", "#7"）
            
            if english_chunk:
                # 英字部分を片仮名に変換
                converted_word = _convert_single_english_word(english_chunk)
                converted_parts.append(converted_word)
            elif non_english_chunk:
                # それ以外（日本語、スペース、記号など）はそのまま保持
                # これにより、日本語部分や区切り文字が保持される
                converted_parts.append(non_english_chunk)
        
        # すべての部分を結合して返す
        result = ''.join(converted_parts)
        log_debug(f"convert_english_to_katakana: 変換成功: {text[:50]}... → {result[:50]}...")
        return result
        
    except Exception as e:
        # 予期しないエラーが発生した場合は元のテキストを返す
        import traceback
        error_detail = traceback.format_exc()
        log_error(f"convert_english_to_katakana: e2k変換エラー: {e}\n{error_detail}")
        log_debug(f"convert_english_to_katakana: エラーのため元のテキストを返します: {text[:50]}...")
        return text


def process_notification_for_speech(log: dict) -> str:
    """
    通知データを加工して読み上げ用テキストを生成
    
    通知の各要素（アプリ名、タイトル、本文）を「、」で区切って結合する
    
    Args:
        log: 通知ログ辞書。以下のキーを含む:
            - app: アプリ名（オプション）
            - title: 通知のタイトル（オプション）
            - text: 通知の本文（オプション）
    
    Returns:
        読み上げ用テキスト。各要素を「、」で区切った文字列
        要素が1つもない場合は「通知があります」を返す
    
    Examples:
        >>> process_notification_for_speech({
        ...     "app": "Google Chrome",
        ...     "title": "Notification #7",
        ...     "text": "This is the text body"
        ... })
        "Google Chrome、Notification #7、This is the text body"
    """
    parts = []
    
    # アプリ名を追加（存在する場合）
    if log.get("app"):
        parts.append(log["app"])
    
    # タイトルを追加（存在する場合）
    if log.get("title"):
        parts.append(log["title"])
    
    # 本文を追加（存在する場合）
    if log.get("text"):
        # 改行を空白に置換（読み上げ時の区切りを明確にするため）
        text = log["text"].replace("\n", " ")
        parts.append(text)
    
    # すべての要素を「、」で結合
    # 要素が1つもない場合はデフォルトメッセージを返す
    return "、".join(parts) if parts else "通知があります"


async def speak_text(text: str):
    """
    テキストを読み上げる（非同期ラッパー）
    メインスレッドで作成したspeakerオブジェクトを使用
    
    処理の流れ:
    1. テキストの検証（空文字チェック、speaker初期化チェック）
    2. 英語を片仮名に変換（convert_english_to_katakana）
    3. SAPIスピーカーで読み上げ実行
    4. 読み上げ完了まで待機
    
    Args:
        text: 読み上げるテキスト
    
    Note:
        COMオブジェクト（SAPI.SpVoice）はスレッドセーフではないため、
        メインスレッドで作成したspeakerオブジェクトを使用する必要がある
    """
    global speaker, current_volume
    
    # テキストが空の場合は処理を中断
    if not text:
        log_debug("speak_text: テキストが空です")
        return
    
    # speakerが初期化されていない場合はエラー
    if not speaker:
        log_error("speak_text: speakerが初期化されていません")
        return
    
    try:
        # 変換前のテキストを保存（ログ用）
        original_text = text
        log_debug(f"speak_text: 変換前テキスト: {original_text[:100]}...")
        
        # 英語を片仮名に変換
        # 日本語と英語が混在している場合、英語部分だけが変換される
        text = convert_english_to_katakana(text)
        log_debug(f"speak_text: 変換後テキスト: {text[:100]}...")
        
        # 変換前後が異なる場合はログに記録
        if original_text != text:
            log_debug(f"speak_text: 英語を片仮名に変換しました: {original_text[:50]}... → {text[:50]}...")
        
        log_debug(f"speak_text: 読み上げ開始 {text[:50]}... (音量: {current_volume})")
        
        # SAPIスピーカーの音量を設定
        # グローバル変数current_volumeの値を反映
        speaker.Volume = current_volume
        
        # 使用中の音声情報をログに出力（デバッグ用）
        try:
            current_voice = speaker.Voice
            voice_desc = current_voice.GetDescription() if current_voice else "None"
            log_debug(f"SAPI音声: {voice_desc}, 音量: {current_volume}")
        except Exception as voice_error:
            # 音声情報の取得に失敗しても読み上げは続行
            log_debug(f"音声情報取得エラー: {voice_error}")
        
        # 非同期フラグで読み上げを開始
        # SAPI_SPEAK_ASYNC_FLAGを使用することで、読み上げを非同期で実行
        speaker.Speak(text, SAPI_SPEAK_ASYNC_FLAG)
        
        # 読み上げが完了するまで待つ
        # COMオブジェクトはスレッドセーフではないため、別スレッドで実行
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _wait_for_speech_completion, speaker)
        
        log_debug(f"speak_text: 読み上げ完了")
        
    except Exception as e:
        # 読み上げ中にエラーが発生した場合はログに記録
        import traceback
        error_detail = traceback.format_exc()
        log_error(f"読み上げエラー: {e}\n{error_detail}")


def _wait_for_speech_completion(speaker_obj):
    """
    読み上げが完了するまで待つ（別スレッドで実行）
    
    SAPI.SpVoiceのWaitUntilDoneメソッドを使用して、
    読み上げが完了するまでブロッキング待機する
    
    Args:
        speaker_obj: SAPI.SpVoiceオブジェクト
    
    Note:
        この関数は別スレッドで実行されるため、COMオブジェクトへの
        アクセスが可能。メインスレッドから呼び出される場合は
        run_in_executorを使用する必要がある
    """
    try:
        # WaitUntilDoneで読み上げ完了を待つ（最大60秒）
        # 60秒を超える場合はタイムアウトするが、読み上げは続行される
        speaker_obj.WaitUntilDone(60)
        log_debug("読み上げ完了（WaitUntilDone）")
    except Exception as e:
        # WaitUntilDoneでエラーが発生しても読み上げは続行される可能性がある
        log_error(f"WaitUntilDoneエラー: {e}")

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

    # Pythonバージョン情報をログに出力
    import sys
    log_debug(f"Pythonバージョン: {sys.version}")
    log_debug(f"Python実行パス: {sys.executable}")
    
    # e2kの初期化状態をログに出力
    if E2K_AVAILABLE:
        log_debug("e2k (English to Katakana Translator) が利用可能です")
    else:
        if E2K_IMPORT_ERROR:
            log_error(f"e2kのインポートに失敗しました: {E2K_IMPORT_ERROR}")
        else:
            log_error("e2kが利用できません。英語は片仮名に変換されません。")
        log_debug(f"e2kをインストールするには: {sys.executable} -m pip install e2k")
        log_debug(f"または: py -m pip install e2k (Pythonランチャーを使用)")
    
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
        log_debug("Toast Bridge: 終了しました")
    except SystemExit:
        pass

