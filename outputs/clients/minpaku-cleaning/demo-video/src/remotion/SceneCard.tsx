import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "../scenes";

/**
 * 画面下部に title + subtitle を出すオーバーレイ。
 * scene の頭 18 frame でフェードイン、最後 12 frame でフェードアウト。
 */
export const SceneCard: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.6 },
    durationInFrames: 18,
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const opacity = Math.min(fadeIn, fadeOut);
  const translateY = interpolate(fadeIn, [0, 1], [40, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 96,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          background: "rgba(11, 18, 32, 0.88)",
          borderTop: "3px solid #2563EB",
          padding: "28px 56px",
          borderRadius: 16,
          color: "#f8fafc",
          fontFamily: "'Noto Sans JP', 'Manrope', sans-serif",
          textAlign: "center",
          minWidth: 720,
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: "0.02em" }}>
          {scene.title}
        </div>
        {scene.subtitle && (
          <div
            style={{
              marginTop: 12,
              fontSize: 28,
              fontWeight: 400,
              color: "#cbd5f5",
            }}
          >
            {scene.subtitle}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
