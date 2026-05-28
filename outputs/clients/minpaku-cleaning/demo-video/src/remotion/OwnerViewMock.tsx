import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

/** オーナー閲覧画面の簡易モック。実 token URL を表示する代わりに、UI を Remotion で再現。 */
export const OwnerViewMock: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.5 },
    durationInFrames: 22,
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Noto Sans JP', 'Manrope', sans-serif",
      }}
    >
      <div
        style={{
          width: 1100,
          background: "#ffffff",
          borderRadius: 28,
          boxShadow: "0 30px 80px rgba(15, 23, 42, 0.18)",
          padding: 56,
          opacity: reveal,
          transform: `translateY(${(1 - reveal) * 30}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 18, color: "#64748b" }}>オーナー画面</div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#0f172a",
                marginTop: 4,
              }}
            >
              渋谷ベイサイドハウス 301
            </div>
          </div>
          <div
            style={{
              padding: "10px 18px",
              background: "#dbeafe",
              color: "#1d4ed8",
              borderRadius: 999,
              fontWeight: 600,
              fontSize: 18,
            }}
          >
            ログイン不要
          </div>
        </div>

        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#0f172a" }}>
            清掃履歴
          </div>
          {[
            { date: "2026-05-29", status: "確認済み", staff: "佐藤 美咲" },
            { date: "2026-05-22", status: "確認済み", staff: "佐藤 美咲" },
            { date: "2026-05-15", status: "確認済み", staff: "山田 健一" },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "200px 1fr 180px 140px",
                alignItems: "center",
                padding: "20px 24px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 16,
              }}
            >
              <div style={{ fontSize: 22, color: "#0f172a", fontWeight: 600 }}>
                {row.date}
              </div>
              <div style={{ fontSize: 18, color: "#64748b" }}>
                チェックリスト 7 / 7 完了 ・ 写真 2 枚
              </div>
              <div style={{ fontSize: 18, color: "#0f172a" }}>{row.staff}</div>
              <div
                style={{
                  padding: "8px 14px",
                  background: "#bbf7d0",
                  color: "#166534",
                  borderRadius: 999,
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: 16,
                }}
              >
                {row.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
