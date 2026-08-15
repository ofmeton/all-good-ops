"""RICE CREAM の Instagram ストーリー「OPEN!」告知画像ジェネレータ。

状態を持たない純関数の集まり。「日付 + 写真ID + 営業時間 → 1080x1920 の画像」だけを
担い、写真のローテーションや承認フローは呼び出し側（claude-gateway）が持つ。
"""

RENDERER_VERSION = "1.0.0"
