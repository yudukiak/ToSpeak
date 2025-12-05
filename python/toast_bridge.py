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

# =================================================
# SAPI 初期化
# =================================================

def get_available_voices():
    """
    利用可能なSAPI音声のリストを取得する
    
    Returns:
        音声名のリスト。エラー時は空のリストを返す
    """
    try:
        sapi_speaker = win32com.client.Dispatch("SAPI.SpVoice")
        voices = sapi_speaker.GetVoices()
        voice_names = []
        for voice in voices:
            try:
                desc = voice.GetDescription()
                if desc:
                    voice_names.append(desc)
            except Exception:
                # 個別の音声情報取得に失敗しても続行
                continue
        return voice_names
    except Exception as e:
        log_error(f"音声リスト取得エラー: {e}")
        return []


def create_sapi_speaker(volume: int = VOLUME_LEVEL, voice_name: str = None):
    """
    SAPIスピーカーオブジェクトを作成して設定する
    
    Args:
        volume: 音量 (0〜100)
        voice_name: 使用する音声名（Noneまたは空文字列の場合はTARGET_VOICE_NAMEを使用、それも空の場合はNoneを返す）
    
    Returns:
        SAPI.SpVoice オブジェクト、失敗時または音声名が空の場合は None
    """
    try:
        # 使用する音声名を決定（引数が指定されていない場合はデフォルト値を使用）
        target_name = voice_name if voice_name else TARGET_VOICE_NAME
        
        # 音声名が空の場合はNoneを返す（読み上げ無効）
        if not target_name or target_name.strip() == "":
            log_debug("音声名が設定されていません。読み上げは無効です。")
            return None
        
        sapi_speaker = win32com.client.Dispatch("SAPI.SpVoice")
        sapi_speaker.Rate = 0
        sapi_speaker.Volume = volume

        # 指定された音声を検索して設定
        voices = sapi_speaker.GetVoices()
        voice_found = False
        for voice in voices:
            try:
                desc = voice.GetDescription()
                # 音声名が完全一致、または部分一致する場合は使用
                if desc == target_name or target_name in desc:
                    sapi_speaker.Voice = voice
                    voice_found = True
                    log_debug(f"SAPI音声を設定: {desc}")
                    break
            except Exception:
                # 個別の音声情報取得に失敗しても続行
                continue
        
        # 見つからない場合は標準音声を使用（ログに記録）
        if not voice_found:
            log_debug(f"指定された音声 '{target_name}' が見つかりません。標準音声を使用します。")

        return sapi_speaker
    except Exception as e:
        log_error(f"SAPI初期化エラー: {e}")
        return None


def setup_sapi(voice_name: str = None):
    """
    メインスレッドでSAPIを初期化
    
    Args:
        voice_name: 使用する音声名（Noneの場合はTARGET_VOICE_NAMEを使用）
    
    Returns:
        SAPI.SpVoice オブジェクト、失敗時は None
    """
    return create_sapi_speaker(voice_name=voice_name)


async def change_voice(voice_name: str = None):
    """
    音声を変更する（非同期関数）
    
    音声設定を変更する（実際の接続は読み上げ時に確立される）
    
    Args:
        voice_name: 変更する音声名（Noneまたは空文字列の場合は読み上げ無効）
    
    Note:
        CeVIO Alの同時アクセス制限対策のため、接続は読み上げ時のみ確立される。
        この関数は音声設定を変更するだけで、実際の接続は確立しない。
    """
    global current_voice_name
    
    try:
        # Noneまたは空文字列の場合は空文字列に統一
        target_voice = voice_name if voice_name and voice_name.strip() else ""
        previous_voice = current_voice_name
        current_voice_name = target_voice
        
        if target_voice:
            log_debug(f"change_voice: 音声を変更します: {target_voice}")
            send_json({
                "type": "info",
                "source": "toast_bridge",
                "title": "音声を変更しました",
                "message": target_voice,
                "timestamp": datetime.now().isoformat()
            })
            
            # 音声変更成功時、読み上げる（読み上げ時に接続が確立される）
            if previous_voice and previous_voice.strip():
                # 手動で音声を変更した場合のみ読み上げ
                speech_text = f"音声を変更しました: {target_voice}"
                await speak_text(speech_text)
        else:
            log_debug("change_voice: 音声を無効化します（読み上げ停止）")
            # 音声が空文字列で設定された場合（読み上げ無効化）
            if previous_voice and previous_voice.strip():
                # 以前音声が設定されていた場合はメッセージ送信
                send_json({
                    "type": "info",
                    "source": "toast_bridge",
                    "title": "音声設定",
                    "message": "音声が設定されていません。読み上げは無効です。プルダウンで音声を選択してください。",
                    "timestamp": datetime.now().isoformat()
                })
            send_json({
                "type": "info",
                "source": "toast_bridge",
                "title": "音声が無効化されました",
                "message": "読み上げは行われません。",
                "timestamp": datetime.now().isoformat()
            })
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        log_error(f"音声変更エラー: {e}\n{error_detail}")

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
    読み上げ時のみSAPI接続を確立し、完了後に解放する（CeVIO Alの同時アクセス制限対策）
    
    処理の流れ:
    1. テキストの検証（空文字チェック、音声設定チェック）
    2. 英語を片仮名に変換（convert_english_to_katakana）
    3. 読み上げ用のSAPIスピーカーを作成
    4. SAPIスピーカーで読み上げ実行
    5. 読み上げ完了まで待機
    6. SAPIスピーカーを解放（CeVIO Alの接続を切断）
    
    Args:
        text: 読み上げるテキスト
    
    Note:
        CeVIO Alの外部連携インターフェイスは同時に1アプリケーションのみアクセス可能。
        読み上げ完了後に接続を解放することで、他のアプリケーションがアクセスできるようにする。
    """
    global current_volume, current_voice_name
    
    # テキストが空の場合は処理を中断
    if not text or not text.strip():
        log_debug("speak_text: テキストが空です")
        return
    
    # 音声が設定されていない場合はスキップ（読み上げ無効）
    if not current_voice_name or current_voice_name.strip() == "":
        log_debug("speak_text: 音声が設定されていないためスキップ（読み上げ無効）")
        return
    
    # 読み上げ用のSAPIスピーカーを作成（CeVIO Alの接続を確立）
    temp_speaker = None
    try:
        temp_speaker = create_sapi_speaker(volume=current_volume, voice_name=current_voice_name)
        if not temp_speaker:
            log_debug("speak_text: SAPIスピーカーの作成に失敗しました")
            return
        
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
        
        log_debug(f"speak_text: 読み上げ開始")
        log_debug(f"speak_text: (音量) {current_volume}")
        log_debug(f"speak_text: (text) {text}")
        
        # 使用中の音声情報をログに出力（デバッグ用）
        try:
            current_voice = temp_speaker.Voice
            voice_desc = current_voice.GetDescription() if current_voice else "None"
            log_debug(f"SAPI音声: {voice_desc}, 音量: {current_volume}")
            
            # CeVIO Alの場合、接続確立に時間がかかる可能性があるため、少し待機
            if "CeVIO" in voice_desc or "cevio" in voice_desc.lower():
                log_debug("CeVIO Al音声を検出しました。接続確立を待機中...")
                await asyncio.sleep(0.5)  # 500ms待機して接続確立を待つ
        except Exception as voice_error:
            # 音声情報の取得に失敗しても読み上げは続行
            log_debug(f"音声情報取得エラー: {voice_error}")
        
        # 非同期フラグで読み上げを開始
        # SAPI_SPEAK_ASYNC_FLAGを使用することで、読み上げを非同期で実行
        log_debug(f"speak_text: Speak()を呼び出します: text='{text[:50]}...'")
        try:
            result = temp_speaker.Speak(text, SAPI_SPEAK_ASYNC_FLAG)
            log_debug(f"speak_text: Speak()の戻り値: {result}")
        except Exception as speak_error:
            log_error(f"speak_text: Speak()エラー: {speak_error}")
            import traceback
            log_error(traceback.format_exc())
            return
        
        # 読み上げ開始を確認するため、少し待機（CeVIO Alの場合、接続確立に時間がかかる）
        await asyncio.sleep(0.3)  # 300ms待機して読み上げ開始を確認
        
        # 読み上げ開始状態を確認
        try:
            status = temp_speaker.Status
            log_debug(f"speak_text: Speak()直後のStatus: RunningState={status.RunningState}, CurrentStreamNumber={status.CurrentStreamNumber}")
        except Exception as status_error:
            log_debug(f"speak_text: Status取得エラー: {status_error}")
        
        # 読み上げが完了するまで待つ
        # COMオブジェクトはスレッドセーフではないため、別スレッドで実行
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _wait_for_speech_completion, temp_speaker)
        
        log_debug(f"speak_text: 読み上げ完了")
        
    except Exception as e:
        # 読み上げ中にエラーが発生した場合はログに記録
        import traceback
        error_detail = traceback.format_exc()
        log_error(f"読み上げエラー: {e}\n{error_detail}")
    finally:
        # 読み上げ完了後にSAPIスピーカーを解放（CeVIO Alの接続を切断）
        if temp_speaker:
            try:
                # 解放前の状態を確認
                try:
                    final_status = temp_speaker.Status
                    log_debug(f"speak_text: 解放前の状態 - RunningState={final_status.RunningState}, CurrentStreamNumber={final_status.CurrentStreamNumber}")
                except:
                    pass
                
                # COMオブジェクトを明示的に解放
                # ただし、読み上げ中の場合、少し待機してから解放
                try:
                    if temp_speaker.Status.RunningState != 0:
                        log_debug("speak_text: 読み上げ中のため、解放前に少し待機します")
                        import time
                        time.sleep(0.5)  # 500ms待機
                except:
                    pass
                
                del temp_speaker
                # ガベージコレクションを促す
                import gc
                gc.collect()
                log_debug("speak_text: SAPIスピーカーを解放しました（CeVIO Al接続を切断）")
            except Exception as e:
                log_debug(f"speak_text: SAPIスピーカーの解放中にエラー: {e}")


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
        # 読み上げが開始されているか確認（Statusプロパティをチェック）
        # Statusが0以外の場合、読み上げ中または待機中
        import time
        log_debug("_wait_for_speech_completion: 読み上げ開始確認を開始")
        max_wait = 5  # 最大5秒待機
        wait_count = 0
        running_state_checked = False
        
        while wait_count < max_wait:
            try:
                status = speaker_obj.Status
                running_state = status.RunningState
                current_stream = status.CurrentStreamNumber
                
                if not running_state_checked:
                    log_debug(f"_wait_for_speech_completion: 初期状態 - RunningState={running_state}, CurrentStreamNumber={current_stream}")
                    running_state_checked = True
                
                if running_state != 0:  # 0以外は読み上げ中または待機中
                    log_debug(f"_wait_for_speech_completion: 読み上げ開始を確認: RunningState={running_state}, CurrentStreamNumber={current_stream}")
                    break
            except Exception as status_error:
                log_debug(f"_wait_for_speech_completion: Status取得エラー: {status_error}")
            
            time.sleep(0.1)  # 100ms待機
            wait_count += 0.1
        
        if wait_count >= max_wait:
            log_error("_wait_for_speech_completion: 読み上げ開始確認がタイムアウトしました")
        
        # CeVIO Alの場合、WaitUntilDoneが正しく動作しない可能性があるため、
        # RunningStateをポーリングして読み上げ完了を確認する
        log_debug("_wait_for_speech_completion: 読み上げ完了を待機中...")
        max_completion_wait = 60  # 最大60秒待機
        completion_wait_count = 0
        check_interval = 0.1  # 100msごとにチェック
        last_running_state = None
        state_change_time = 0
        state_1_start_time = None  # RunningState=1になった時点を記録
        state_1_timeout = 2.0  # RunningState=1が2秒続いたら完了とみなす（CeVIO Al対策）
        completed_by_timeout = False  # タイムアウトで完了とみなしたかどうか
        
        while completion_wait_count < max_completion_wait:
            try:
                status = speaker_obj.Status
                running_state = status.RunningState
                
                # RunningStateが0になったら読み上げ完了
                if running_state == 0:
                    log_debug(f"_wait_for_speech_completion: 読み上げ完了を確認: RunningState={running_state}")
                    break
                
                # 状態が変化したかチェック
                if running_state != last_running_state:
                    last_running_state = running_state
                    state_change_time = completion_wait_count
                    log_debug(f"_wait_for_speech_completion: RunningStateが変化: {running_state}, 経過時間={completion_wait_count:.1f}秒")
                    
                    # RunningState=2から1に変化した時点で、読み上げが開始されたことを記録
                    if running_state == 1:
                        state_1_start_time = completion_wait_count
                        log_debug(f"_wait_for_speech_completion: RunningState=1（読み上げ中）に変化しました。読み上げ開始時刻を記録")
                
                # RunningState=1（読み上げ中）が一定時間続いたら、読み上げが完了したとみなす
                # CeVIO Alの場合、RunningState=2（待機中）から1（読み上げ中）に変化した後、
                # 1が一定時間続いたら完了とみなす
                if running_state == 1 and state_1_start_time is not None:
                    elapsed_since_state_1 = completion_wait_count - state_1_start_time
                    if elapsed_since_state_1 >= state_1_timeout:
                        log_debug(f"_wait_for_speech_completion: RunningState=1が{elapsed_since_state_1:.1f}秒続いたため、読み上げ完了とみなします")
                        completed_by_timeout = True
                        # 少し追加で待機してから完了とする（読み上げが確実に終わるように）
                        time.sleep(0.3)
                        break
                
                # 定期的にログを出力（5秒ごと）
                if int(completion_wait_count * 10) % 50 == 0 and completion_wait_count > 0:
                    log_debug(f"_wait_for_speech_completion: 読み上げ待機中... RunningState={running_state}, 経過時間={completion_wait_count:.1f}秒")
            except Exception as status_error:
                log_debug(f"_wait_for_speech_completion: Status取得エラー: {status_error}")
            
            time.sleep(check_interval)
            completion_wait_count += check_interval
        
        # 最終状態を確認
        try:
            final_status = speaker_obj.Status
            final_running_state = final_status.RunningState
            log_debug(f"_wait_for_speech_completion: 最終状態 - RunningState={final_running_state}, CurrentStreamNumber={final_status.CurrentStreamNumber}, 経過時間={completion_wait_count:.1f}秒")
            
            # タイムアウトで完了とみなした場合は、RunningState=1でもエラーとしない
            if final_running_state != 0 and not completed_by_timeout:
                log_error(f"_wait_for_speech_completion: 読み上げが完了していません。RunningState={final_running_state}")
                # WaitUntilDoneも試してみる（念のため）
                try:
                    wait_result = speaker_obj.WaitUntilDone(5)
                    log_debug(f"_wait_for_speech_completion: WaitUntilDone(5)の戻り値: {wait_result}")
                except Exception as wait_error:
                    log_debug(f"_wait_for_speech_completion: WaitUntilDoneエラー: {wait_error}")
            elif completed_by_timeout:
                log_debug(f"_wait_for_speech_completion: タイムアウトで完了とみなしたため、RunningState={final_running_state}でも正常終了とします")
        except Exception as final_status_error:
            log_debug(f"_wait_for_speech_completion: 最終状態取得エラー: {final_status_error}")
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
    global current_volume
    

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
    global current_volume, main_loop
    
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
                
                elif msg_type == "set_voice":
                    # 音声設定（非同期処理）
                    voice_name = msg.get("voice_name", None)
                    # 空文字列の場合はNoneに変換（デフォルト音声を使用）
                    if voice_name == "":
                        voice_name = None
                    if main_loop:
                        log_debug(f"音声変更リクエスト: voice_name={voice_name or 'デフォルト（CeVIO）'}")
                        # メインスレッドで音声を変更する必要がある
                        asyncio.run_coroutine_threadsafe(change_voice(voice_name), main_loop)
                    elif not main_loop:
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

# =================================================
# メイン処理
# =================================================

async def main():
    """
    メイン関数
    通知監視、stdinループを同時に実行する
    CeVIO Alの同時アクセス制限対策のため、SAPI接続は読み上げ時のみ確立される
    """
    global current_volume, main_loop
    
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
    if current_voice_name and current_voice_name.strip():
        log_debug(f"音声設定: {current_voice_name}（接続は読み上げ時に確立されます）")
    else:
        # 起動時は音声設定を待機するだけ（メッセージ送信なし）
        log_debug("音声が設定されていません。Electron側からの音声設定を待機中...")

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

