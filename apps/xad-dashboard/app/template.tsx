/** ページ遷移ごとの入場アニメ。template は遷移ごとに再マウントされるのが仕様
 *  （client state はページ間で持ち越していないので安全。契約 v2 §5 注記）。
 *
 *  page-enter は fill 無し（globals.css 参照）。fill を付けると終了後も identity matrix の
 *  transform が残り、配下の position:fixed モーダルの containing block を奪って画面外へ飛ばす。
 *  ここは全ページの fixed モーダルを内包するため、その副作用は致命的になる。 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 min-h-0 flex flex-col page-enter">{children}</div>;
}
