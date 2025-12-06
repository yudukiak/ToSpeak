# -*- coding: utf-8 -*-
# sapi_speaker.py
# SAPI音声読み上げ機能

import asyncio
import win32com.client
from datetime import datetime

import config
from logger import log_debug, log_error, send_json
from text_processor import convert_english_to_katakana


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


def create_sapi_speaker(volume: int = None, voice_name: str = None):
    """
    SAPIスピーカーオブジェクトを作成して設定する
    
    Args:
        volume: 音量 (0〜100)、Noneの場合はVOLUME_LEVELを使用
        voice_name: 使用する音声名（Noneまたは空文字列の場合はTARGET_VOICE_NAMEを使用、それも空の場合はNoneを返す）
    
    Returns:
        SAPI.SpVoice オブジェクト、失敗時または音声名が空の場合は None
    """
    try:
        if volume is None:
            volume = config.VOLUME_LEVEL
        
        # 使用する音声名を決定（引数が指定されていない場合はデフォルト値を使用）
        target_name = voice_name if voice_name else config.TARGET_VOICE_NAME
        
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
    try:
        # Noneまたは空文字列の場合は空文字列に統一
        target_voice = voice_name if voice_name and voice_name.strip() else ""
        previous_voice = config.current_voice_name
        config.current_voice_name = target_voice
        
        if target_voice:
            log_debug(f"change_voice: 音声を変更します: {target_voice}")
            send_json({
                "type": "info",
                "source": "toast_bridge",
                "title": "音声を変更しました",
                "text": target_voice,
                "timestamp": datetime.now().isoformat()
            })
            
            # 音声変更成功時、読み上げる（読み上げ時に接続が確立される）
            # 起動時（previous_voiceが空）も含めて、音声を設定/変更した場合は読み上げる
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
                    "text": "音声が設定されていません。読み上げは無効です。プルダウンで音声を選択してください。",
                    "timestamp": datetime.now().isoformat()
                })
            send_json({
                "type": "info",
                "source": "toast_bridge",
                "title": "音声が無効化されました",
                "text": "読み上げは行われません。",
                "timestamp": datetime.now().isoformat()
            })
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        log_error(f"音声変更エラー: {e}\n{error_detail}")


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
    # テキストが空の場合は処理を中断
    if not text or not text.strip():
        log_debug("speak_text: テキストが空です")
        return
    
    # 音声が設定されていない場合はスキップ（読み上げ無効）
    if not config.current_voice_name or config.current_voice_name.strip() == "":
        log_debug("speak_text: 音声が設定されていないためスキップ（読み上げ無効）")
        return
    
    # 読み上げ用のSAPIスピーカーを作成（CeVIO Alの接続を確立）
    temp_speaker = None
    try:
        temp_speaker = create_sapi_speaker(volume=config.current_volume, voice_name=config.current_voice_name)
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
        log_debug(f"speak_text: (音量) {config.current_volume}")
        log_debug(f"speak_text: (text) {text}")
        
        # 使用中の音声情報をログに出力（デバッグ用）
        try:
            current_voice = temp_speaker.Voice
            voice_desc = current_voice.GetDescription() if current_voice else "None"
            log_debug(f"SAPI音声: {voice_desc}, 音量: {config.current_volume}")
            
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
            result = temp_speaker.Speak(text, config.SAPI_SPEAK_ASYNC_FLAG)
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
