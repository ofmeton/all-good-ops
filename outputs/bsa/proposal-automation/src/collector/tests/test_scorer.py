import pytest
from datetime import date, timedelta
from scorer import (
    score_price, score_service, score_constraints,
    score_speed, score_client, calculate_fit_score
)


# === score_price ===
def test_price_3man_to_30man_max():
    assert score_price(30000, 300000) == 30


def test_price_lower_3man_upper_30man():
    """3万円ピッタリから30万円まで"""
    assert score_price(30000, 300000) == 30


def test_price_under_1man_zero():
    assert score_price(5000, 9000) == 0


def test_price_1man_to_3man():
    """1-3万 = 25"""
    assert score_price(10000, 30000) == 25


def test_price_30man_to_50man():
    assert score_price(300000, 500000) == 20


def test_price_over_50man():
    assert score_price(600000, 1000000) == 15


def test_price_unknown_default():
    assert score_price(None, None) == 10


def test_price_only_min():
    """min だけある場合は max=min とみなす"""
    assert score_price(50000, None) == 30


def test_price_only_max():
    assert score_price(None, 50000) == 30


# === score_service ===
def test_service_lp_max():
    assert score_service("lp", "整体院LP", "LP制作") == 25


def test_service_ad_max():
    assert score_service("ad", "Google広告運用", "広告運用代行") == 25


def test_service_website_corporate():
    assert score_service("website", "コーポレートサイト", "5ページ") == 15


def test_service_lp_keyword_in_text():
    """カテゴリが None でも本文に LP やランディングが入っていれば 25"""
    assert score_service(None, "ランディングページ制作", "LP") == 25


def test_service_ad_keyword_in_text():
    assert score_service(None, "Google広告 運用代行", "リスティング広告") == 25


def test_service_repair():
    assert score_service(None, "LP の修正", "改修") == 10


def test_service_other():
    assert score_service(None, "汎用", "汎用") == 5


# === score_constraints ===
def test_constraint_excludes_certified_lancer():
    assert score_constraints("認定ランサー限定の案件です") == -30


def test_constraint_individual_ok():
    """個人OK で +15、ベース 10 と合わせて 25"""
    assert score_constraints("個人の方歓迎します") == 25


def test_constraint_individual_ok_alt():
    assert score_constraints("個人OKです") == 25


def test_constraint_high_history_required():
    """実績10件以上必須は -10、ベース 10 と合わせて 0"""
    assert score_constraints("実績10件以上の方") == 0


def test_constraint_baseline():
    """特になし = 10"""
    assert score_constraints("特に制約なし") == 10


# === score_speed ===
def test_speed_one_week():
    """1週間以内"""
    today = date.today()
    deadline = (today + timedelta(days=5)).strftime("%Y-%m-%d")
    assert score_speed(deadline) == 10


def test_speed_two_weeks():
    today = date.today()
    deadline = (today + timedelta(days=14)).strftime("%Y-%m-%d")
    assert score_speed(deadline) == 7


def test_speed_one_month_plus():
    today = date.today()
    deadline = (today + timedelta(days=45)).strftime("%Y-%m-%d")
    assert score_speed(deadline) == 3


def test_speed_unknown():
    assert score_speed(None) == 5


def test_speed_invalid_date_string():
    """日付パース失敗 = 5（不明扱い）"""
    assert score_speed("not-a-date") == 5


# === score_client ===
def test_client_verified_with_history():
    assert score_client(verified=True, history=15) == 20


def test_client_verified_only():
    assert score_client(verified=True, history=5) == 10


def test_client_no_verification():
    assert score_client(verified=False, history=0) == -10


def test_client_unknown():
    assert score_client(verified=None, history=None) == 5


# === calculate_fit_score (integration) ===
def test_calculate_fit_total_max():
    today = date.today()
    job = {
        "budget_min": 100000, "budget_max": 200000,
        "service_category": "lp",
        "title": "LP制作", "description": "個人の方歓迎",
        "deadline": (today + timedelta(days=5)).strftime("%Y-%m-%d"),
        "client_verified": True, "client_history_count": 20,
    }
    total, breakdown = calculate_fit_score(job)
    assert total == 100
    assert breakdown["price"] == 30
    assert breakdown["service"] == 25
    assert breakdown["constraint"] == 25  # 個人OK で +15
    assert breakdown["speed"] == 10
    assert breakdown["client"] == 20
    assert breakdown["total"] == 100


def test_calculate_fit_certified_lancer_excluded():
    job = {
        "budget_min": 100000, "budget_max": 200000,
        "service_category": "lp", "title": "LP", "description": "認定ランサー限定",
        "deadline": "2026-12-31",
        "client_verified": True, "client_history_count": 20,
    }
    total, breakdown = calculate_fit_score(job)
    assert total == 0
    assert breakdown.get("excluded") == "認定ランサー限定"


def test_calculate_fit_no_negative():
    """合計が負になる入力でも total は 0 以上"""
    job = {
        "budget_min": 5000, "budget_max": 8000,  # price=0
        "service_category": "other", "title": "x", "description": "実績10件以上",  # constraint=0, service=5
        "deadline": "2027-01-01",  # 1ヶ月以上 = 3
        "client_verified": False, "client_history_count": 0,  # client=-10
    }
    total, breakdown = calculate_fit_score(job)
    assert total >= 0
