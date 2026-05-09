# サンプルサイト組込みプロトコル — portfolio に追加する手順

## 概要

`outputs/lp-experiments/<name>/` で作った静的サンプルLPを、ポートフォリオサイト (`/Users/rikukudo/Projects/portfolio/`) に組み込んで「実績の1枚」として公開する標準手順。

- **誰が**: rapid-hp-operator / system-engineer
- **いつ**: outputs/lp-experiments/ で完成したサンプルを portfolio に出すと決まったとき
- **何のために**: 抜け漏れ（INDEX ボタン忘れ・サムネ忘れ・author 不一致 deploy ERROR）を防ぐ

## 必須工程チェックリスト（順番に実行）

### 1. 静的ファイルを `public/<slug>/` に配置

```bash
cp outputs/lp-experiments/<name>/{index.html,styles.css,app.js} \
   /Users/rikukudo/Projects/portfolio/public/<slug>/
```

`<slug>` はカード遷移先 URL になる（例: `hidamari` → `/hidamari/`）。

### 2. 「← INDEX」ボタンを **必須** で追加

portfolio 内サンプルは TOP に戻れる導線が必須。`<slug>/index.html` の `<header>` の直前に挿入：

```html
<!-- ============== Sample bar (← INDEX) ============== -->
<a class="sb js-sb" href="/" aria-label="ポートフォリオTOPに戻る">
  <span class="sb__arrow" aria-hidden="true">
    <svg viewBox="0 0 12 12"><path d="M7.5 2.5 4 6l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </span>
  <span class="sb__lab">INDEX</span>
  <span class="sb__sep" aria-hidden="true">/</span>
  <span class="sb__crumb">SAMPLE · <ブランド名></span>
</a>
```

`<slug>/styles.css` の Header セクションの直前に追加：

```css
/* =========== Sample bar (portfolio に組み込んだ際の戻り導線) =========== */
.sb {
  position: fixed; top: 12px; left: 12px;
  z-index: 100;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(15,12,10,.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.18);
  color: rgba(255,255,255,.92);
  font-family: var(--f-en, "Akshar", system-ui, sans-serif);
  font-size: 11px; letter-spacing: .14em;
  line-height: 1; text-transform: uppercase;
  transition: background .4s, border-color .4s, transform .4s;
  pointer-events: auto;
}
.sb:hover { background: rgba(15,12,10,.78); border-color: rgba(255,255,255,.34); transform: translateX(-2px); }
.sb__arrow { display: inline-flex; width: 12px; height: 12px; }
.sb__arrow svg { width: 100%; height: 100%; }
.sb__lab { font-weight: 500; }
.sb__sep { opacity: .35; }
.sb__crumb { font-family: var(--f-jp, "Noto Sans JP", sans-serif); font-size: 11px; letter-spacing: .08em; text-transform: none; opacity: .85; }
@media (max-width: 767px) {
  .sb { top: 10px; left: 10px; padding: 7px 12px; font-size: 10px; }
  .sb__sep, .sb__crumb { display: none; }
}
```

そして既存ヘッダーの `inner` の `padding-left` を増やしてバーと衝突させない：

```css
.hd__inner { padding: 0 var(--pad-x) 0 calc(var(--pad-x) + 96px); }
@media (min-width: 768px) {
  .hd__inner { padding-left: calc(var(--pad-x) + 248px); }
}
```

明背景LPの場合は `.sb` の `background: rgba(255,255,255,.78)` / `color: var(--ink)` / `border-color: rgba(0,0,0,.12)` に差し替える。

### 3. サムネイル画像を `public/samples/<slug>.jpg` に配置

撮影は Playwright で `1280×800`、reveal アニメ完了後（`browser_wait_for time: 3-5`）に `quality: 90` JPEG で。

```bash
cp <screenshot>.jpeg /Users/rikukudo/Projects/portfolio/public/samples/<slug>.jpg
```

**重要**: WorkModal は `<img src={`/samples/${workId}.jpg`} />` で参照する。`<workId>` と**完全一致**させること（`<slug>-study.jpg` のような派生名はNG → モーダル空白）。スクショ保存ファイル名を撮影前に確定する。

### 4. `src/pages/Home.jsx` の `WORK_DETAILS` にエントリ追加

```js
<slug>: {
  title: '<ブランド名>\n<カテゴリ補足>',
  category: 'SAMPLE · <LP|コーポレート>',
  year: 'YYYY.MM',
  client: '<クライアント名>（架空 or 実）',
  industry: '<業種>',
  plan: '<想定プラン>',
  delivery: '<想定納期>',
  thumbClass: 'a' | 'b' | 'c' | 'd' | 'e',  // home.css に既存定義あり
  href: 'https://portfolio-fawn-eight-63.vercel.app/<slug>/',
  highlights: ['…', '…', '…', '…'],
  stack: ['…', '…'],
},
```

### 5. `kudo-port-grid` 内に `<button>` カードを追加

順番（先頭/末尾/任意）に応じて挿入位置を決める。`thumbClass` と `wN`（grid span 用クラス）を合わせる。

```jsx
<button type="button" className="kudo-work w0" onClick={() => setModalId('<slug>')}>
  <div className="thumb e">
    <img className="thumb-img" src="/samples/<slug>.jpg" alt="<alt>" loading="lazy" />
  </div>
  <div className="info">
    <div className="row"><span className="cat">SAMPLE · LP</span><span className="yr">2026.04</span></div>
    <h3>…<br />…</h3>
    <div className="meta">
      <span>業種: <b>…</b></span>
      <span>想定: <b>…</b></span>
    </div>
    <div className="tags">…</div>
  </div>
</button>
```

### 6. `home.css` の grid span 定義を確認/追加

`kudo-work.w<N>` のクラス未定義なら span 定義を追加：

```css
.kudo-work.w0 { grid-column: span 3; }
@media (max-width: 768px) {
  .kudo-work.w0, …, .kudo-work.w<N> { grid-column: span 1; }
}
```

`thumb.<x>` の背景色フォールバックも、新しい色を使うなら定義（既存 a/b/c/d/e は使い回し可）。

### 7. ローカルビルド検証

```bash
cd /Users/rikukudo/Projects/portfolio && npx vite build
```

`dist/<slug>/` と `dist/samples/<slug>.jpg` が出力されていることを確認。  
ローカルサーバ起動 → `http://127.0.0.1:<port>/` の Selected Works にカード表示 + `http://127.0.0.1:<port>/<slug>/` で LP 表示 + 「← INDEX」クリックで `/` に戻ることを実機確認。

**vite dev の SPA fallback 罠**: `vite dev`（dev モード）で `/<slug>/` にアクセスすると React の SPA index.html にフォールバックされて空白になる（本番 Vercel は static asset 優先で動くが dev では再現できない）。配置直後に必ず確認:

```bash
curl -sS http://localhost:5173/<slug>/ | head -3
# 先頭が <!doctype html> 直後に @react-refresh が見えたら SPA fallback
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:5173/<slug>/index.html
# こちらは 200 で実本物が返るのが正常
```

対策: WORK_DETAILS の `href` を `/<slug>/index.html` 明示にし、Home.jsx の WorkModal 外部リンク判定に `endsWith('.html')` を含める（既存実装あり）。これで dev/prod 両対応。

### 8. push 前の Vercel author 認可確認

`feedback_vercel_git_author_authorization` / `vercel-team-deploy-checklist.md` 準拠：

```bash
git config user.email   # work.ofmeton@gmail.com になっているか
git log -3 --format='%h %ae %s'  # 直近の author email を確認
```

過去成功 deploy と一致していなければ `git config user.email <vercel認可済みメール>` で揃える。

### 9. commit & push（範囲限定）

```bash
git add public/<slug>/ public/samples/<slug>.jpg src/pages/Home.jsx src/pages/home.css
git commit -m "works: <ブランド名> サンプルLP を実績<順番>番目に追加 …"
git push origin main
```

不要なファイルを巻き込まないよう、必ず個別 add（`-A` / `.` 禁止）。

## 抜け漏れアンチパターン

| 抜け | 結果 |
|---|---|
| INDEX ボタン未追加 | 訪問者が portfolio TOP に戻れない（致命的UX欠陥） |
| サムネ未配置 | カード画像 404、`thumbClass` の背景色だけ表示 |
| `wN` クラス未定義 | grid 崩れ（カードがフルブリードに） |
| `git add -A` 流用 | `clients/` 等の機密候補ディレクトリ巻き込み |
| author email 不一致 | Vercel team で silent ERROR、ビルドログ空 |

## 参考実装

- `/Users/rikukudo/Projects/portfolio/public/hidamari/` ─ INDEX バー、ヘッダー左 padding 調整、ダーク背景版の完成形
- `WORK_DETAILS.hidamari` および `kudo-port-grid` 先頭の `<button className="kudo-work w0">` ─ Home.jsx
