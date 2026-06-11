/** ページ遷移ごとの入場アニメ。template は遷移ごとに再マウントされるのが仕様
 *  （client state はページ間で持ち越していないので安全。契約 v2 §5 注記）。 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 min-h-0 flex flex-col animate-rise-in">{children}</div>;
}
