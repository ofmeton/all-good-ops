#!/usr/bin/env python3
"""ライスクリーム取引データの前処理と分析"""

import csv
import re
from datetime import datetime, timedelta
from collections import defaultdict

DATA_PATH = "/Users/rikukudo/Downloads/RICE CREAM/分析/お取引-2025-09-01-2026-04-01.csv"
OUTPUT_PATH = "/Users/rikukudo/Downloads/RICE CREAM/分析/分析結果.md"

# ============================================================
# Phase 1: データ読み込みと前処理
# ============================================================

def parse_yen(s: str) -> int:
    """'¥1,234' や '-¥20' をintに変換"""
    s = s.replace("¥", "").replace(",", "").replace(" ", "").strip()
    if not s:
        return 0
    return int(s)


# 商品名の名寄せマッピング
# 「詳細」列は1取引に複数商品がカンマ区切りで入っている
# 個別商品を正規化する
def normalize_item(raw: str) -> str:
    """個別商品名を正規化カテゴリに変換"""
    raw = raw.strip()

    # 数量プレフィックス除去 "2 x 🍦 (定価)" → "🍦 (定価)"
    m = re.match(r"(\d+)\s*x\s+(.+)", raw)
    qty = int(m.group(1)) if m else 1
    item = m.group(2) if m else raw

    # ライスクリーム / ソフトクリーム本体
    if item in ["🍦 (定価)", "ライスクリーム (定価)", "🍦 (ノーマル🍦)"]:
        return "ライスクリーム（プレーン）", qty
    if item in ["🍦 (抹茶🌿)"]:
        return "ライスクリーム（抹茶）", qty
    if item in ["🍦 (黒ごま﹅)"]:
        return "ライスクリーム（黒ごま）", qty
    if item in ["🍦 (さつまいも🍠)"]:
        return "ライスクリーム（さつまいも）", qty

    # トッピング
    if item in ["抹茶トッピング (定価)"]:
        return "トッピング（抹茶）", qty
    if item in ["ゴマトッピング (通常)"]:
        return "トッピング（ゴマ）", qty
    if item in ["さつまいもトッピング (通常)"]:
        return "トッピング（さつまいも）", qty

    # ドリンク
    if item in ["抹茶ラテ (定価)", "抹茶ラテ (COLD)", "抹茶ラテ (HOT)", "抹茶 (定価)", "抹茶 (COLD)", "抹茶 (HOT)"]:
        return "抹茶ラテ/抹茶ドリンク", qty
    if item in ["ホットラテ (通常)"]:
        return "ホットラテ", qty
    if item in ["ホット抹茶 (通常)"]:
        return "ホット抹茶", qty
    if item in ["黒ごまラテ (COLD)", "黒ごまラテ (HOT)"]:
        return "黒ごまラテ", qty
    if item in ["きなこラテ (COLD)", "きなこラテ (HOT)"]:
        return "きなこラテ", qty
    if item in ["フロート  (通常)", "フロート (通常)"]:
        return "フロート", qty
    if item in ["抹茶トニック (定価)"]:
        return "抹茶トニック", qty
    if item in ["アフォガード (通常)"]:
        return "アフォガード", qty
    if item in ["桜抹茶ラテフロート (通常)"]:
        return "桜抹茶ラテフロート", qty

    # グッズ
    if "Tシャツ" in item or "ｔシャツ" in item or "👕" in item or "波形" in item:
        return "Tシャツ", qty
    if "帽子" in item or "🎩" in item:
        return "帽子", qty
    if "キーホルダー" in item:
        return "キーホルダー", qty
    if "ステッカー" in item:
        return "ステッカー", qty
    if "パーカー" in item:
        return "パーカー", qty

    # その他
    if item == "任意の金額":
        return "任意の金額", qty

    return f"その他({item})", qty


def parse_items(detail_str: str) -> list:
    """詳細列をパースして[(正規化名, 数量)]のリストを返す"""
    if not detail_str:
        return []

    # カンマ区切りだが、"2 x 🍦 (定価), 抹茶トッピング (定価)" のように
    # 括弧内のカンマとの区別が必要
    # 実際のデータを見ると ", " で区切られ、括弧内にカンマはない
    parts = re.split(r",\s+", detail_str)

    results = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        name, qty = normalize_item(part)
        results.append((name, qty))
    return results


def load_data():
    """CSVを読み込んで前処理済みデータを返す"""
    transactions = []

    with open(DATA_PATH, encoding="utf-16") as f:
        reader = csv.reader(f, delimiter="\t")
        header = next(reader)

        for row in reader:
            if len(row) < 35:
                continue

            # 払戻しは除外
            if row[31] != "取引":
                continue

            # キャンセル済み除外
            if row[47] and row[47] != "完了":
                continue

            date_str = row[0]
            time_str = row[1]
            gross = parse_yen(row[3])
            net = parse_yen(row[6])
            tax = parse_yen(row[8])
            total = parse_yen(row[11])
            fee = parse_yen(row[20])
            detail = row[30]

            dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
            weekday = dt.weekday()  # 0=月 ... 6=日
            hour = dt.hour

            items = parse_items(detail)

            # 支払い方法判定
            payment = "不明"
            if parse_yen(row[15]) > 0:
                payment = "現金"
            elif parse_yen(row[49]) > 0:
                payment = "PayPay"
            elif parse_yen(row[53]) > 0:
                payment = "Alipay"
            elif parse_yen(row[58]) > 0:
                payment = "WeChat Pay"
            elif parse_yen(row[13]) > 0:
                card_type = row[24]
                payment = f"カード({card_type})" if card_type else "カード"

            transactions.append({
                "datetime": dt,
                "date": date_str,
                "time": time_str,
                "weekday": weekday,
                "weekday_name": ["月", "火", "水", "木", "金", "土", "日"][weekday],
                "hour": hour,
                "gross": gross,
                "net": net,
                "tax": tax,
                "total": total,
                "fee": fee,
                "detail": detail,
                "items": items,
                "payment": payment,
            })

    return transactions


# ============================================================
# Phase 2: 分析
# ============================================================

def analyze(txns):
    report = []
    r = report.append

    # --- 基本統計 ---
    r("# ライスクリーム 売上分析レポート")
    r(f"\n分析対象: {txns[0]['date']} 〜 {txns[-1]['date']}")
    r(f"データ元: Square取引データ")
    r("")

    dates = sorted(set(t["date"] for t in txns))
    total_gross = sum(t["gross"] for t in txns)
    total_net = sum(t["net"] for t in txns)
    total_fee = sum(t["fee"] for t in txns)
    total_total = sum(t["total"] for t in txns)

    r("## 1. 全体サマリー")
    r("")
    r(f"| 指標 | 値 |")
    r(f"|------|------|")
    r(f"| 営業日数 | {len(dates)}日 |")
    r(f"| 総取引件数 | {len(txns):,}件 |")
    r(f"| 総売上（税込） | ¥{total_total:,} |")
    r(f"| 総売上（税抜） | ¥{total_net:,} |")
    r(f"| 決済手数料合計 | ¥{abs(total_fee):,} |")
    r(f"| 1日あたり平均売上 | ¥{total_total // len(dates):,} |")
    r(f"| 1日あたり平均取引数 | {len(txns) / len(dates):.1f}件 |")
    r(f"| 客単価（税込） | ¥{total_total // len(txns):,} |")
    r("")

    # --- 月別推移 ---
    r("## 2. 月別推移")
    r("")
    monthly = defaultdict(lambda: {"gross": 0, "total": 0, "count": 0, "dates": set()})
    for t in txns:
        month = t["date"][:7]
        monthly[month]["gross"] += t["gross"]
        monthly[month]["total"] += t["total"]
        monthly[month]["count"] += 1
        monthly[month]["dates"].add(t["date"])

    r("| 月 | 営業日数 | 取引件数 | 売上（税込） | 日平均売上 | 客単価 |")
    r("|------|------|------|------|------|------|")
    for month in sorted(monthly):
        d = monthly[month]
        days = len(d["dates"])
        daily_avg = d["total"] // days if days else 0
        unit_price = d["total"] // d["count"] if d["count"] else 0
        r(f"| {month} | {days} | {d['count']} | ¥{d['total']:,} | ¥{daily_avg:,} | ¥{unit_price:,} |")
    r("")

    # --- 曜日別 ---
    r("## 3. 曜日別分析")
    r("")
    by_dow = defaultdict(lambda: {"total": 0, "count": 0, "dates": set()})
    for t in txns:
        by_dow[t["weekday"]]["total"] += t["total"]
        by_dow[t["weekday"]]["count"] += 1
        by_dow[t["weekday"]]["dates"].add(t["date"])

    dow_names = ["月", "火", "水", "木", "金", "土", "日"]
    r("| 曜日 | 営業日数 | 取引件数 | 売上合計 | 日平均売上 | 日平均取引数 | 客単価 |")
    r("|------|------|------|------|------|------|------|")
    for dow in [4, 5, 6]:  # 金土日
        d = by_dow[dow]
        days = len(d["dates"])
        daily_avg = d["total"] // days if days else 0
        daily_txn = d["count"] / days if days else 0
        unit_price = d["total"] // d["count"] if d["count"] else 0
        r(f"| {dow_names[dow]} | {days} | {d['count']} | ¥{d['total']:,} | ¥{daily_avg:,} | {daily_txn:.1f} | ¥{unit_price:,} |")

    # 営業日外の取引があるか確認
    other_days = {dow: by_dow[dow] for dow in by_dow if dow not in [4, 5, 6]}
    if other_days:
        r("")
        r("**営業日外（金土日以外）の取引:**")
        for dow in sorted(other_days):
            d = other_days[dow]
            r(f"- {dow_names[dow]}曜: {d['count']}件 / ¥{d['total']:,}")
    r("")

    # --- 時間帯別 ---
    r("## 4. 時間帯別分析")
    r("")
    by_hour = defaultdict(lambda: {"total": 0, "count": 0})
    for t in txns:
        by_hour[t["hour"]]["total"] += t["total"]
        by_hour[t["hour"]]["count"] += 1

    r("| 時間帯 | 取引件数 | 売上合計 | 構成比（売上） | 客単価 |")
    r("|------|------|------|------|------|")
    for hour in sorted(by_hour):
        d = by_hour[hour]
        pct = d["total"] / total_total * 100
        unit_price = d["total"] // d["count"] if d["count"] else 0
        bar = "█" * int(pct / 2)
        r(f"| {hour}時台 | {d['count']} | ¥{d['total']:,} | {pct:.1f}% {bar} | ¥{unit_price:,} |")
    r("")

    # --- 商品別 ---
    r("## 5. 商品カテゴリ別分析")
    r("")

    item_counts = defaultdict(int)
    for t in txns:
        for name, qty in t["items"]:
            item_counts[name] += qty

    total_items = sum(item_counts.values())
    r("| 商品カテゴリ | 販売数 | 構成比 |")
    r("|------|------|------|")
    for name, count in sorted(item_counts.items(), key=lambda x: -x[1]):
        pct = count / total_items * 100
        r(f"| {name} | {count} | {pct:.1f}% |")
    r("")

    # --- ライスクリーム vs ドリンク ---
    r("## 6. カテゴリ大分類")
    r("")
    categories = {
        "ライスクリーム": 0,
        "ドリンク": 0,
        "トッピング": 0,
        "グッズ": 0,
        "その他": 0,
    }
    for name, count in item_counts.items():
        if "ライスクリーム" in name:
            categories["ライスクリーム"] += count
        elif "トッピング" in name:
            categories["トッピング"] += count
        elif name in ["抹茶ラテ/抹茶ドリンク", "ホットラテ", "ホット抹茶", "黒ごまラテ", "きなこラテ", "フロート", "抹茶トニック", "アフォガード", "桜抹茶ラテフロート"]:
            categories["ドリンク"] += count
        elif name in ["Tシャツ", "帽子", "キーホルダー", "ステッカー", "パーカー"]:
            categories["グッズ"] += count
        else:
            categories["その他"] += count

    r("| カテゴリ | 販売数 | 構成比 |")
    r("|------|------|------|")
    for name, count in sorted(categories.items(), key=lambda x: -x[1]):
        if count > 0:
            pct = count / total_items * 100
            r(f"| {name} | {count} | {pct:.1f}% |")
    r("")

    # --- 抹茶トッピング率 ---
    ice_total = sum(c for n, c in item_counts.items() if "ライスクリーム" in n)
    matcha_top = item_counts.get("トッピング（抹茶）", 0)
    if ice_total > 0:
        r(f"**抹茶トッピング率**: ライスクリーム{ice_total}個のうち{matcha_top}個に抹茶トッピング → **{matcha_top/ice_total*100:.1f}%**")
        r("")

    # --- 支払い方法 ---
    r("## 7. 支払い方法")
    r("")
    by_payment = defaultdict(lambda: {"total": 0, "count": 0})
    for t in txns:
        # カード種別をまとめる
        pay = t["payment"]
        if pay.startswith("カード("):
            card_type = pay[4:-1]
            by_payment[f"カード({card_type})"]["total"] += t["total"]
            by_payment[f"カード({card_type})"]["count"] += 1
        else:
            by_payment[pay]["total"] += t["total"]
            by_payment[pay]["count"] += 1

    r("| 支払い方法 | 件数 | 構成比 | 売上合計 |")
    r("|------|------|------|------|")
    for name, d in sorted(by_payment.items(), key=lambda x: -x[1]["count"]):
        pct = d["count"] / len(txns) * 100
        r(f"| {name} | {d['count']} | {pct:.1f}% | ¥{d['total']:,} |")
    r("")

    # --- 日別売上推移（週単位サマリー） ---
    r("## 8. 週別売上推移")
    r("")
    by_week = defaultdict(lambda: {"total": 0, "count": 0, "dates": set()})
    for t in txns:
        dt = t["datetime"]
        # ISO week
        week = dt.isocalendar()[1]
        year = dt.isocalendar()[0]
        key = f"{year}-W{week:02d}"
        by_week[key]["total"] += t["total"]
        by_week[key]["count"] += 1
        by_week[key]["dates"].add(t["date"])

    r("| 週 | 営業日数 | 取引件数 | 売上（税込） | 日平均 |")
    r("|------|------|------|------|------|")
    for week in sorted(by_week):
        d = by_week[week]
        days = len(d["dates"])
        daily_avg = d["total"] // days if days else 0
        r(f"| {week} | {days} | {d['count']} | ¥{d['total']:,} | ¥{daily_avg:,} |")
    r("")

    # --- ベスト/ワースト日 ---
    r("## 9. 日別ベスト/ワースト")
    r("")
    by_date = defaultdict(lambda: {"total": 0, "count": 0})
    for t in txns:
        by_date[t["date"]]["total"] += t["total"]
        by_date[t["date"]]["count"] += 1

    sorted_dates = sorted(by_date.items(), key=lambda x: -x[1]["total"])

    r("### 売上トップ10")
    r("| 日付 | 曜日 | 取引件数 | 売上（税込） |")
    r("|------|------|------|------|")
    for date, d in sorted_dates[:10]:
        dt = datetime.strptime(date, "%Y-%m-%d")
        dow = ["月", "火", "水", "木", "金", "土", "日"][dt.weekday()]
        r(f"| {date} | {dow} | {d['count']} | ¥{d['total']:,} |")

    r("")
    r("### 売上ワースト10")
    r("| 日付 | 曜日 | 取引件数 | 売上（税込） |")
    r("|------|------|------|------|")
    for date, d in sorted_dates[-10:]:
        dt = datetime.strptime(date, "%Y-%m-%d")
        dow = ["月", "火", "水", "木", "金", "土", "日"][dt.weekday()]
        r(f"| {date} | {dow} | {d['count']} | ¥{d['total']:,} |")
    r("")

    # --- 複数個買い分析 ---
    r("## 10. セット購入分析")
    r("")
    ice_per_txn = defaultdict(int)
    for t in txns:
        ice_count = sum(qty for name, qty in t["items"] if "ライスクリーム" in name)
        if ice_count > 0:
            ice_per_txn[ice_count] += 1

    r("| ライスクリーム個数/取引 | 取引件数 | 構成比 |")
    r("|------|------|------|")
    total_ice_txn = sum(ice_per_txn.values())
    for count in sorted(ice_per_txn):
        pct = ice_per_txn[count] / total_ice_txn * 100
        r(f"| {count}個 | {ice_per_txn[count]} | {pct:.1f}% |")
    r("")

    # --- ドリンク同時購入率 ---
    drink_names = {"抹茶ラテ/抹茶ドリンク", "ホットラテ", "ホット抹茶", "黒ごまラテ", "きなこラテ", "フロート", "抹茶トニック", "アフォガード", "桜抹茶ラテフロート"}
    ice_txns = [t for t in txns if any("ライスクリーム" in n for n, q in t["items"])]
    ice_with_drink = [t for t in ice_txns if any(n in drink_names for n, q in t["items"])]
    if ice_txns:
        r(f"**ドリンク同時購入率**: ライスクリーム購入{len(ice_txns)}件中{len(ice_with_drink)}件がドリンクも購入 → **{len(ice_with_drink)/len(ice_txns)*100:.1f}%**")
        r("")

    return "\n".join(report)


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    print("データ読み込み中...")
    txns = load_data()
    txns.sort(key=lambda t: t["datetime"])
    print(f"  有効取引数: {len(txns)}件")

    print("分析実行中...")
    result = analyze(txns)

    with open(OUTPUT_PATH, "w") as f:
        f.write(result)
    print(f"分析結果出力: {OUTPUT_PATH}")

    # コンソールにも出力
    print("\n" + "=" * 60)
    print(result)
