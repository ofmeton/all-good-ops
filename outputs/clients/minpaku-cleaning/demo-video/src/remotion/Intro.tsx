import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.5 },
    durationInFrames: 25,
  });
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, #1e3a8a 0%, #0b1220 70%)",
        color: "#f8fafc",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Noto Sans JP', 'Manrope', sans-serif",
      }}
    >
      <div
        style={{
          opacity: reveal,
          transform: `translateY(${(1 - reveal) * 32}px)`,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, color: "#60a5fa", letterSpacing: "0.3em" }}>
          STAYCLEAN
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          民泊清掃のすべてを 1 つに
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 28,
            color: "#94a3b8",
          }}
        >
          管理者 / スタッフ / オーナー を 1 つのワークフローで
        </div>
      </div>
    </AbsoluteFill>
  );
};
