import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion";

export const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const scale = spring({ frame, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill className="bg-neutral-950 items-center justify-center font-sans">
      <div
        style={{ opacity, transform: `scale(${scale})` }}
        className="text-white text-center"
      >
        <div className="text-[88px] font-black tracking-tight leading-none">
          Hello, Remotion
        </div>
        <div className="text-[28px] mt-6 text-neutral-400">
          text → code → video
        </div>
      </div>
    </AbsoluteFill>
  );
};
