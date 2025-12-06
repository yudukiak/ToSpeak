# -*- coding: utf-8 -*-
# notification_monitor.py
# Toast通知監視機能

import asyncio
from datetime import datetime

from winsdk.windows.ui.notifications.management import (
    UserNotificationListener,
    UserNotificationListenerAccessStatus,
)
from winsdk.windows.ui.notifications import NotificationKinds

from logger import log_error, log_debug, send_json


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


def _extract_notification_data(notification):
    """
    通知オブジェクトからデータを抽出する
    
    Args:
        notification: Windows通知オブジェクト
    
    Returns:
        dict: 通知データ（app, app_id, title, text）を含む辞書
    """
    # アプリ名を取得
    app_name = "通知"
    if notification.app_info and notification.app_info.display_info:
        app_name = notification.app_info.display_info.display_name

    # アプリIDを取得
    app_id = ""
    if notification.app_info and hasattr(notification.app_info, 'app_user_model_id'):
        try:
            app_id = notification.app_info.app_user_model_id
        except:
            pass

    # 通知テキストを取得（タイトルと本文を分離）
    bindings = (notification.notification.visual.bindings 
               if notification.notification and notification.notification.visual and notification.notification.visual.bindings 
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
    
    return {
        "app": app_name,
        "app_id": app_id if app_id else "",
        "title": title,
        "text": body,
    }


async def get_past_notifications(listener):
    """
    起動時に存在する過去の通知を取得して送信する
    
    Args:
        listener: UserNotificationListenerオブジェクト
    
    Returns:
        tuple: (processed_ids: set, past_notifications: list)
    """
    processed_ids = set()
    past_notifications = []
    
    try:
        existing = await listener.get_notifications_async(NotificationKinds.TOAST)
        if existing:
            for n in existing:
                processed_ids.add(n.id)
                
                # 既存通知の内容を取得
                try:
                    data = _extract_notification_data(n)
                    # 過去の通知として保存
                    past_notifications.append({
                        **data,
                        "notification_id": str(n.id),
                        "timestamp": datetime.now().isoformat()
                    })
                except Exception:
                    # ログ出力でエラーが発生しても処理は続行
                    pass
            
            # 過去の通知がある場合、1つのメッセージとして送信
            if past_notifications:
                send_json({
                    "type": "past_notifications",
                    "source": "toast_bridge",
                    "title": "過去の通知",
                    "text": f"{len(past_notifications)}件の過去の通知があります",
                    "notifications": past_notifications,
                    "timestamp": datetime.now().isoformat()
                })
    except Exception as e:
        log_error(f"既存通知の取得に失敗: {e}")
    
    return processed_ids, past_notifications


async def notification_loop(listener, processed_ids=None):
    """
    WindowsのToast通知を監視し、新規通知をJSON形式でstdoutに送信する
    通知を取得したら自動で読み上げる
    
    Args:
        listener: UserNotificationListenerオブジェクト
        processed_ids: 既に処理済みの通知IDのセット（オプション）
    """
    # processed_idsが指定されていない場合は空のセットを使用
    if processed_ids is None:
        processed_ids = set()
    
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

                    # 通知データを抽出
                    try:
                        data = _extract_notification_data(n)
                    except Exception as e:
                        log_debug(f"通知データ抽出エラー: {e}")
                        continue

                    # Electron側に送信するメッセージ
                    msg = {
                        "type": "notification",
                        "source": "toast_bridge",
                        **data,
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
