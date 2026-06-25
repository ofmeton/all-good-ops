# 引き継ぎ: 中高生居場所「脱・助成金で自立黒字」団体 収益モデル調査

最終更新: 2026-06-26 ／ ステータス: パイロット完了・本人へ材料提示済み（次は陸さんの意思決定フェーズ）

## このセッションでやったこと（経緯）
1. カタリバの支援金制度（ユースセンター起業塾）の**過去採択31団体リスト**を公式サイトから取得。
2. 31団体の**収益モデル＝経済モデルを実額で調査**（NPOポータル/CANPAN/公式決算PDF）。→ 大半が助成金依存 or 赤字と判明。
3. 「**脱・助成金で自立黒字**の中高生居場所」を意図的に探す調べ方を設計（プラン承認済み）→ パイロット実証。
4. **確定8団体**まで拡大し、各団体の**収益モデルを深掘り**（単価/コスト構造/相互補助/再現性）。

## 成果物（すべて main の outputs/ibasho/ に着地・push 済み）
- `outputs/ibasho/ibasho-sustainable-revenue-models-2026-06-19.md` — 確定8団体の特定＋調べ方の方法論＋落とした団体（透明性）。commit 25f8327。
- `outputs/ibasho/ibasho-8団体-収益モデル深掘り-2026-06-21.md` — 8団体の収益モデル深掘り（単価・複数年トレンド・コスト・陸さん適用）。commit 2c95fab。
- （前提資料）`outputs/ibasho/2026-06-04-terra-engawa-*.md` — TERRA縁側構想の既存ノート。

## 確定8団体（脱助成金<30% かつ 直近黒字 を実額確認）
**利用料型6**: 盛岡ユースセンター(認定NPO岩手・助成0%・+158万)／Since(NPO滋賀・27.6%・+4万)／コクレオの森(認定NPO大阪・2%・+267万)／高卒支援会(NPO東京・0%・+452万)／ふぉーらいふ(NPO神戸・21.7%・+113万)／フォロ(NPO大阪・8%・+231万)
**行政委託型2**: ビーンズふくしま(NPO福島・8.9%・+272万)／ユースコミュニティー(NPO大田・6.4%・+919万)

## 結論の核（陸さんの構想への示唆）
- **無料の居場所“単体”で黒字の例はゼロ**。黒字団体は「フリースクール/通信制等の**利用料の取れる教育サービス**を本体」にして居場所を成立させている。
- **利用料相場 月2.5〜5万（週数でコース分け）**。寄付は「減免・無料事業の財源」。
- **家賃の極小化が黒字の決定打**（高卒支援会=LEC無償提供で家賃年12万）。→ **棚田ハウス=家賃ゼロは陸さんの構造的最強点**。
- **損益分岐**: 月3万×20名＝月60万。家賃ゼロなら常勤1〜2名を賄える。
- 最現実的＝**Since/ふぉーらいふ型**（有料FS＋無料縁側を寄付/助成で薄く補助）。思想はフォロ型「いるだけでいい」。委託型は実績後の第2段階。

## 確立した方法論（再利用可）
- **NPO財務の調べ方**: CANPAN(fields.canpan.info)で損益・助成比率を即チェック→公式決算PDF/内閣府NPOポータル(URL規則 `/document/{ID}/hokoku/{年}400/{年}年度活動計算書.pdf`)で確定。スキャンPDFは Read ツールで視覚読取。memory `reference_npo_financial_lookup`。
- **リサーチはCodex委譲**（トークン節約。Web検索/fetch可。スキャン読取・PlaywrightはClaude側）。memory `feedback_delegate_research_to_codex`。
- **レポートは必ず main の outputs/ へ着地＋本人に直接渡す**（worktree埋もれ防止）。memory `feedback_report_deliverable_landing`。
- **report-landing-guard フック**（`~/.claude/hooks/report-landing-guard.sh`・Stopフック）= worktree内の未着地 outputs/*.md を自動で main へ可視化。導入・テスト済み。

## 残課題 / 次の一手（open items）
- **要視覚読取（未反映の財務細部）**: コクレオ会計報告PDF・高卒支援会2024決算の金額以外・ビーンズ令和5/4決算の複数年トレンド。必要時 Claude の Read で補完。
- **候補のさらなる拡大**: 一般社団（まっくろくろすけ等）は公開財務なし→直接取材が必要。フリースクール型NPOの他県分も追加余地。
- **陸さんの意思決定**: 本業の収益エンジン（FS月謝型 / 委託型 / 寄付型）の選択。`decision-prep`（grill→brainstorm→deliberation）で詰めるのが適。陸さん駆動・代行しない（memory `feedback_ibasho_user_driven`）。

## Git / インフラ状態
- 成果物は main 追跡済み＆origin push 済み。worktree `ibasho-sustainable-model-research`（ローカルブランチ `worktree-ibasho-sustainable-model-research`）は内容が main に重複＝本セッション末で削除。
- ⚠️ この worktree ブランチは**古い origin/main 起点**＝ブランチごとマージ厳禁（main破壊）。着地は単一ファイルcpで実施済み。
- 本セッション外の未追跡物（`outputs/app-demos/*`, `raw/finance/*.csv`）は別作業の産物につき本セッションでは触らず。
