# toast_bridge.py
# pip install winsdk pywin32
import asyncio
import json
import sys
import win32com.client

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


# ------------------ SAPI 初期化 ------------------

def setup_sapi():
    try:
        speaker = win32com.client.Dispatch("SAPI.SpVoice")
        speaker.Rate = 0
        speaker.Volume = VOLUME_LEVEL

        voices = speaker.GetVoices()
        found = False
        for voice in voices:
            desc = voice.GetDescription()
            if TARGET_VOICE_NAME in desc:
                speaker.Voice = voice
                print(f'PY: 音声設定完了: {desc} (音量: {VOLUME_LEVEL})', file=sys.stderr)
                found = True
                break

        if not found:
            print(f"PY: 警告: '{TARGET_VOICE_NAME}' が見つかりません。標準音声を使用します。", file=sys.stderr)

        return speaker
    except Exception as e:
        print(f"PY: SAPI初期化エラー: {e}", file=sys.stderr)
        return None


# ------------------ 通知リスナー取得 ------------------

async def get_listener():
    try:
        listener = UserNotificationListener.current
        access_status = await listener.request_access_async()
        if access_status != UserNotificationListenerAccessStatus.ALLOWED:
            print(json.dumps({"type": "error", "message": "ACCESS_DENIED"}), flush=True)
            return None
        return listener
    except Exception as e:
        print(json.dumps({"type": "error", "message": f"LISTENER_ERROR: {e}"}), flush=True)
        return None


# ------------------ Electron → Python の読み上げコマンド受付 ------------------

async def stdin_loop(speaker):
    """
    Electron からの JSON 行を読み取り、type=speak を SAPI で読み上げる
    """
    loop = asyncio.get_running_loop()

    def blocking_read():
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue

            if msg.get("type") == "speak":
                text = msg.get("text") or ""
                if text:
                    try:
                        # 非同期フラグ 1
                        speaker.Speak(text, 1)
                    except Exception as e:
                        print(f"PY: Speak error: {e}", file=sys.stderr)

    # ブロッキングI/Oを別スレッドで回す
    await loop.run_in_executor(None, blocking_read)


# ------------------ Python → Electron の通知送信 ------------------

async def notification_loop(listener):
    """
    Windows のトースト通知を監視し、新規分を JSON で stdout に流す。
    Electron 側でパースして UI/辞書処理に回す。
    """
    print(json.dumps({"type": "ready"}), flush=True)

    processed_ids = set()

    # 既存の通知をスキップ
    try:
        existing = await listener.get_notifications_async(NotificationKinds.TOAST)
        if existing:
            for n in existing:
                processed_ids.add(n.id)
    except Exception:
        pass

    while True:
        try:
            notifications = await listener.get_notifications_async(NotificationKinds.TOAST)
            current_ids = set()

            if notifications:
                for n in notifications:
                    current_ids.add(n.id)
                    if n.id in processed_ids:
                        continue
                    processed_ids.add(n.id)

                    app_name = "通知"
                    if n.app_info and n.app_info.display_info:
                        app_name = n.app_info.display_info.display_name

                    text_parts = []
                    if n.notification and n.notification.visual and n.notification.visual.bindings:
                        for binding in n.notification.visual.bindings:
                            for el in binding.get_text_elements():
                                if el.text:
                                    text_parts.append(el.text)

                    full_text = " ".join(text_parts)

                    msg = {
                        "type": "notify",
                        "app": app_name,
                        "text": full_text,
                    }
                    # Electron 側へ送信
                    print(json.dumps(msg, ensure_ascii=False), flush=True)

            # 古いIDを掃除
            if len(processed_ids) > 1000:
                processed_ids = processed_ids.intersection(current_ids)

            await asyncio.sleep(1)

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"PY: loop error: {e}", file=sys.stderr)
            await asyncio.sleep(1)


# ------------------ メイン ------------------

async def main():
    print("PY: 起動", file=sys.stderr)

    listener = await get_listener()
    if not listener:
        return

    speaker = setup_sapi()
    if not speaker:
        return

    # Electron → Python の speak コマンド受付を並列で動かす
    asyncio.create_task(stdin_loop(speaker))

    # 通知監視ループ（Python → Electron）
    await notification_loop(listener)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
    except SystemExit:
        pass
