import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Outro: React.FC = () => {
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
        background:
          "linear-gradient(135deg, #1e3a8a 0%, #0b1220 100%)",
        color: "#f8fafc",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Noto Sans JP', 'Manrope', sans-serif",
      }}
    >
      <div
        style={{
          opacity: reveal,
          transform: `translateY(${(1 - reveal) * 24}px)`,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: "0.02em" }}>
          お問合せ
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 40,
            color: "#cbd5f5",
          }}
        >
          ofmeton
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 32,
            color: "#60a5fa",
            letterSpacing: "0.04em",
          }}
        >
          off.me.ton@gmail.com
        </div>
      </div>
    </AbsoluteFill>
  );
};
