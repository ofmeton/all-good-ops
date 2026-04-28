"""fit_score 計算 (要件 FR-2.1)。

5軸の合計 0-100 点で案件のフィット度を評価する。
認定ランサー限定の案件は constraint = -30 → calculate_fit_score の戻り値を total=0 で即除外する。
"""

from datetime import datetime, date
from typing import Optional


def score_price(budget_min: Optional[int], budget_max: Optional[int]) -> int:
    """価格帯スコア (max 30)。"""
    if budget_min is None and budget_max is None:
        return 10  # 不明
    upper = budget_max if budget_max is not None else budget_min or 0
    lower = budget_min if budget_min is not None else budget_max or 0

    if upper < 10000:
        return 0  # 1万未満
    if 10000 <= upper <= 30000:
        return 25  # 1-3万（3万ピッタリは1-3万に含む）
    if 30000 < upper <= 300000:
        return 30  # 3-30万
    if 300000 < upper <= 500000:
        return 20  # 30-50万
    return 15  # 50万以上


def score_service(category: Optional[str], title: str, description: str) -> int:
    """サービス種別スコア (max 25)。
    category 優先、なければ本文のキーワードでフォールバック。
    修正・改修が明示されている場合は LP/広告より優先してrepairスコアを返す（category指定なし時のみ）。
    """
    text = f"{title}\n{description}".lower()

    # category が明示されている場合はそれを優先
    if category == "lp":
        return 25
    if category == "ad":
        return 25
    if category == "website":
        return 15

    # category なし → 本文キーワードで判定（修正・改修を LP より先にチェック）
    if "修正" in text or "改修" in text:
        return 10
    if "ランディングページ" in text or "ランディング" in text or "lp" in text:
        return 25
    if "広告運用" in text or "google広告" in text or "リスティング" in text:
        return 25
    if "コーポレート" in text or "ホームページ" in text:
        return 15
    return 5


def score_constraints(description: str) -> int:
    """制約条件スコア (max 15、ベース 10)。
    認定ランサー限定なら即 -30 (除外マーカー)。
    """
    if "認定ランサー" in description and "限定" in description:
        return -30

    score = 10  # ベース
    if "個人" in description and ("可" in description or "歓迎" in description or "OK" in description.upper()):
        score += 15  # 25 上限
    if "実績10件以上" in description or "経験豊富" in description:
        score -= 10
    return score


def score_speed(deadline: Optional[str]) -> int:
    """速度要求スコア (max 10)。
    deadline は "YYYY-MM-DD" 文字列。今日からの差で判定。
    """
    if not deadline:
        return 5
    try:
        d = datetime.strptime(deadline, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return 5
    days = (d - date.today()).days
    if days <= 7:
        return 10
    if days <= 21:
        return 7
    return 3


def score_client(verified: Optional[bool], history: Optional[int]) -> int:
    """クライアント評価スコア (max 20)。"""
    if verified and history is not None and history >= 10:
        return 20
    if verified:
        return 10
    if verified is None and history is None:
        return 5  # 不明
    return -10  # 本人確認なしまたは初投稿


def calculate_fit_score(job: dict) -> tuple[int, dict]:
    """全軸を合計して 0-100 の total と breakdown(JSON 用) を返す。"""
    price = score_price(job.get("budget_min"), job.get("budget_max"))
    service = score_service(
        job.get("service_category"),
        job.get("title", ""),
        job.get("description", ""),
    )
    constraint = score_constraints(job.get("description", ""))
    if constraint <= -30:
        # 認定ランサー限定 → 即除外
        return 0, {
            "excluded": "認定ランサー限定",
            "price": price, "service": service, "constraint": -30,
            "speed": 0, "client": 0, "total": 0,
        }
    speed = score_speed(job.get("deadline"))
    client = score_client(job.get("client_verified"), job.get("client_history_count"))

    total = min(100, max(0, price + service + constraint + speed + client))
    breakdown = {
        "price": price,
        "service": service,
        "constraint": constraint,
        "speed": speed,
        "client": client,
        "total": total,
    }
    return total, breakdown
