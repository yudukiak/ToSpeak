# -*- coding: utf-8 -*-
# text_processor.py
# テキスト処理機能（英語→片仮名変換、通知処理など）

from config import E2K_AVAILABLE, e2k_ngram, e2k_c2k
from logger import log_debug, log_error


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
