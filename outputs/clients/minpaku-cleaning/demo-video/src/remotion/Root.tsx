import React from "react";
import { Composition } from "remotion";
import { Demo } from "./Demo";
import { FPS, WIDTH, HEIGHT, SCENES } from "../scenes";
import { readTimingsSafe, sceneDurationFrames } from "./timings";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Demo"
        component={Demo}
        durationInFrames={
          // calculateMetadata で上書きするのでここは fallback
          SCENES.reduce((s, x) => s + x.durationSec * FPS, 0)
        }
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        calculateMetadata={async () => {
          const timings = readTimingsSafe();
          const total = SCENES.reduce(
            (s, x) => s + sceneDurationFrames(x, timings),
            0,
          );
          return { durationInFrames: total };
        }}
      />
    </>
  );
};
