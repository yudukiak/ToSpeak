# pip install winsdk pywin32
# py -m pip install alkana

import asyncio
import win32com.client
import re
import unicodedata
import sys

# ライブラリチェック
try:
    import alkana
except ImportError:
    print("【エラー】変換ライブラリが見つかりません。")
    print("以下のコマンドを実行してください: py -m pip install alkana")
    input("Enterキーを押して終了...")
    sys.exit()

from winsdk.windows.ui.notifications.management import UserNotificationListener, UserNotificationListenerAccessStatus
from winsdk.windows.ui.notifications import NotificationKinds

# =================================================
# ▼ 設定エリア （ここを自由に変えてください）
# =================================================

# 1. 音声の名前（CeVIOなど）
TARGET_VOICE_NAME = "CeVIO" 

# 2. 音量 (0 ～ 100)  ★ここを調整！
# ※ 100は最大、0は消音。40くらいがおすすめです。
VOLUME_LEVEL = 20

# 3. 手動辞書 (読み間違いの修正用・すべて小文字で書いてください)
MANUAL_DICT = {
    "todo": "トゥドゥ",
    "todoist": "トゥドゥイスト",
    "cursor": "カーソル",
    "x": "エックス",
    "instagram": "インスタグラム",
    "youtube": "ユーチューブ",
    "google": "グーグル",
    "amazon": "アマゾン",
    "update": "アップデート",
    "error": "エラー",
    "done": "完了",
}
# =================================================

def normalize_text(text):
    """全角英数字を半角に統一する"""
    return unicodedata.normalize('NFKC', text)

def convert_english_to_katakana(text):
    """英文混じりのテキストをカタカナ読みに変換する"""
    text = normalize_text(text)
    
    def replace_func(match):
        word = match.group(0)
        lower_word = word.lower()
        
        if lower_word in MANUAL_DICT:
            return MANUAL_DICT[lower_word]
        
        kana = alkana.get_kana(lower_word)
        if kana:
            return kana
            
        return word

    return re.sub(r'[a-zA-Z]+', replace_func, text)

async def get_listener():
    try:
        listener = UserNotificationListener.current
        access_status = await listener.request_access_async()
        if access_status != UserNotificationListenerAccessStatus.ALLOWED:
            print("エラー: 通知へのアクセスが許可されていません。")
            return None
        return listener
    except Exception as e:
        print(f"リスナー取得エラー: {e}")
        return None

def setup_sapi():
    try:
        speaker = win32com.client.Dispatch("SAPI.SpVoice")
        speaker.Rate = 0
        
        # ★ここで設定した音量を適用
        speaker.Volume = VOLUME_LEVEL
        
        voices = speaker.GetVoices()
        found = False
        for voice in voices:
            desc = voice.GetDescription()
            if TARGET_VOICE_NAME in desc:
                speaker.Voice = voice
                print(f"音声設定完了: {desc} (音量: {VOLUME_LEVEL})")
                found = True
                break
        if not found:
            print(f"警告: '{TARGET_VOICE_NAME}' が見つかりません。標準音声を使用します。")
        return speaker
    except Exception as e:
        print(f"SAPI初期化エラー: {e}")
        return None

async def main_loop():
    print("--- 通知監視を開始します (Ctrl+C で終了) ---")
    
    listener = await get_listener()
    if not listener: return
    speaker = setup_sapi()
    if not speaker: return

    processed_ids = set()

    print("既存の通知履歴を確認中...")
    try:
        existing = await listener.get_notifications_async(NotificationKinds.TOAST)
        if existing:
            for n in existing:
                processed_ids.add(n.id)
        print(f"過去の通知 {len(processed_ids)} 件をスキップしました。")
    except Exception:
        pass

    print("待機中... (自動カタカナ変換モード)")

    while True:
        try:
            notifications = await listener.get_notifications_async(NotificationKinds.TOAST)
            if notifications:
                current_ids = set()
                for n in notifications:
                    current_ids.add(n.id)
                    if n.id not in processed_ids:
                        processed_ids.add(n.id)
                        
                        app_name = "通知"
                        if n.app_info and n.app_info.display_info:
                            app_name = n.app_info.display_info.display_name
                        
                        text_content = []
                        if n.notification and n.notification.visual and n.notification.visual.bindings:
                            for binding in n.notification.visual.bindings:
                                for text_el in binding.get_text_elements():
                                    if text_el.text:
                                        text_content.append(text_el.text)
                        
                        full_text = " ".join(text_content)
                        
                        # 変換処理
                        raw_text = f"{app_name}、{full_text}"
                        speak_text = convert_english_to_katakana(raw_text)
                        
                        print(f"検知: {speak_text}")
                        
                        if full_text:
                            speaker.Speak(speak_text, 1)

                if len(processed_ids) > 1000:
                     processed_ids = processed_ids.intersection(current_ids)

            await asyncio.sleep(1)

        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(1)

if __name__ == "__main__":
    try:
        asyncio.run(main_loop())
    except KeyboardInterrupt:
        print("\n終了します。")
    except SystemExit:
        pass