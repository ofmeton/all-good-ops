import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * LINE 通知が届いた瞬間をモック。スマホ画面上に通知バナーがスライドインする演出。
 * 実 LINE 通知を撮影する代わりに、Remotion で再現することで CMS/Token 等の事故を回避。
 */
export const LineNotifyMock: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slide = spring({
    frame: Math.max(0, frame - 12),
    fps,
    config: { damping: 18, mass: 0.7, stiffness: 100 },
    durationInFrames: 24,
  });
  const translateY = (1 - slide) * -200;
  const pulse =
    1 + Math.sin((frame - 30) / 6) * 0.02 * Math.max(0, Math.min(1, (frame - 36) / 12));

  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, #0b1220 0%, #1e293b 100%)",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Noto Sans JP', 'Manrope', sans-serif",
      }}
    >
      {/* スマホ枠 */}
      <div
        style={{
          width: 460,
          height: 940,
          background: "#000",
          borderRadius: 56,
          padding: 18,
          boxShadow: "0 40px 120px rgba(37, 99, 235, 0.45)",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(160deg, #1e3a8a 0%, #0f172a 60%, #020617 100%)",
            borderRadius: 40,
            overflow: "hidden",
            position: "relative",
            padding: 16,
          }}
        >
          {/* notch */}
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              width: 120,
              height: 28,
              background: "#000",
              borderRadius: 14,
            }}
          />
          {/* status */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: "#cbd5f5",
              padding: "12px 24px",
              fontSize: 18,
            }}
          >
            <span>9:42</span>
            <span>●●●● 5G</span>
          </div>
          {/* notification banner */}
          <div
            style={{
              marginTop: 60,
              transform: `translateY(${translateY}px) scale(${pulse})`,
              background: "rgba(255,255,255,0.95)",
              color: "#0b1220",
              borderRadius: 20,
              padding: "18px 22px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                background: "#06C755",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 28,
              }}
            >
              L
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 16,
                  color: "#475569",
                }}
              >
                <span>LINE · StayClean</span>
                <span>今</span>
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.3,
                }}
              >
                新しい清掃依頼があります
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 18,
                  color: "#334155",
                  lineHeight: 1.4,
                }}
              >
                渋谷ベイサイドハウス 301 / 6/1 (月) チェックアウト後
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
