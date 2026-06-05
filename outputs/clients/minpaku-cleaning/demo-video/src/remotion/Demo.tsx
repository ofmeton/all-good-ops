import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import { FPS, SCENES, type Scene } from "../scenes";
import { sceneDurationFrames, type Timings } from "./timings";
import { Intro } from "./Intro";
import { Outro } from "./Outro";
import { LineNotifyMock } from "./LineNotifyMock";
import { OwnerViewMock } from "./OwnerViewMock";
import { SceneCard } from "./SceneCard";

function RecordedSlice({ scene, timings }: { scene: Scene; timings: Timings }) {
  const t = timings[scene.id];
  if (!t) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#0f172a",
          color: "#94a3b8",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 48,
          fontFamily: "Manrope, sans-serif",
        }}
      >
        recording missing: {scene.id}
      </AbsoluteFill>
    );
  }
  // trimBefore / trimAfter はコンポジション FPS でのフレーム数（Remotion 4.0.319+ で命名統一）
  const startFrame = Math.round((t.startMs / 1000) * FPS);
  const endFrame = Math.round((t.endMs / 1000) * FPS);
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(120% 80% at 50% 30%, #1e3a8a 0%, #0b1220 70%)",
      }}
    >
      {/* タブレット筐体風の中央配置。SceneCard (下部) と重ならない位置・サイズ */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1140,
          height: 855, // 4:3 aspect (1280:960)
          borderRadius: 28,
          overflow: "hidden",
          border: "10px solid #0f172a",
          boxShadow:
            "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(96,165,250,0.18)",
          background: "#000",
        }}
      >
        <OffthreadVideo
          src={staticFile("recordings/full.webm")}
          trimBefore={startFrame}
          trimAfter={endFrame}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>
    </AbsoluteFill>
  );
}

function SceneBody({ scene, timings }: { scene: Scene; timings: Timings }) {
  switch (scene.id) {
    case "intro":
      return <Intro />;
    case "outro":
      return <Outro />;
    case "line-notify":
      return <LineNotifyMock />;
    case "owner-view":
      return <OwnerViewMock />;
    default:
      return <RecordedSlice scene={scene} timings={timings} />;
  }
}

export const Demo: React.FC<{ timings: Timings }> = ({ timings }) => {
  let cursor = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1220" }}>
      {SCENES.map((scene) => {
        const duration = sceneDurationFrames(scene, timings);
        const sequence = (
          <Sequence
            key={scene.id}
            from={cursor}
            durationInFrames={duration}
            name={scene.id}
          >
            <SceneBody scene={scene} timings={timings} />
            {scene.id !== "intro" && scene.id !== "outro" && (
              <SceneCard scene={scene} />
            )}
          </Sequence>
        );
        cursor += duration;
        return sequence;
      })}
    </AbsoluteFill>
  );
};
