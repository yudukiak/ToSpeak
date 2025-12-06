# -*- coding: utf-8 -*-
# logger.py
# ログ出力機能

import json
from datetime import datetime


def send_json(data: dict):
    """JSONメッセージをstdoutに出力（Electron側で受け取る）"""
    if "text" in data:
        data["text"] = f"{data['text']}"
    
    # sourceを設定（設定されていない場合のみ）
    if "source" not in data:
        data["source"] = "toast_bridge"
    
    print(json.dumps(data, ensure_ascii=False), flush=True)


def log_debug(message: str):
    """デバッグログをstdoutに出力（Electron側で受け取る）"""
    log_msg = {
        "type": "debug",
        "source": "toast_bridge",
        "text": message,
        "timestamp": datetime.now().isoformat()
    }
    send_json(log_msg)


def log_error(message: str):
    """エラーログをstdoutに出力（Electron側で受け取る）"""
    log_msg = {
        "type": "error",
        "source": "toast_bridge",
        "text": message,
        "timestamp": datetime.now().isoformat()
    }
    send_json(log_msg)
