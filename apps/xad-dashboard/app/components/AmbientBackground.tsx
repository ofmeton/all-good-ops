/** 全ページ共通の動く背景（RSC）。
 *  blur は静的にかけ transform のみアニメする（GPU 負荷対策）。
 *  reduced-motion 時は globals.css の一括停止で静止画になる。 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      {/* 動くグリッド線（中央フェード） */}
      <div
        className="absolute -inset-x-0 -top-12 bottom-0 animate-grid-pan"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgb(148 163 184 / 0.045) 0 1px, transparent 1px 48px)," +
            "repeating-linear-gradient(90deg, rgb(148 163 184 / 0.045) 0 1px, transparent 1px 48px)",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 35%, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 35%, black 30%, transparent 75%)",
        }}
      />
      {/* オーロラ的グラデーション 2 灯（ドリフト） */}
      <div
        className="absolute -left-1/4 -top-1/4 h-[70vh] w-[70vw] rounded-full animate-drift"
        style={{
          background:
            "radial-gradient(circle, rgb(59 130 246 / 0.14) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute -right-1/4 top-1/3 h-[60vh] w-[60vw] rounded-full animate-drift-slow"
        style={{
          background:
            "radial-gradient(circle, rgb(52 211 153 / 0.09) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />
      {/* 上部ビネット（NavBar 下の没入感） */}
      <div
        className="absolute inset-x-0 top-0 h-48"
        style={{
          background:
            "linear-gradient(180deg, rgb(10 15 30 / 0.9) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
