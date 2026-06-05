import React from "react";
import { Composition } from "remotion";
import { Demo } from "./Demo";
import { FPS, WIDTH, HEIGHT, SCENES } from "../scenes";
import { sceneDurationFrames, type Timings } from "./timings";

type DemoProps = { timings: Timings };

export const RemotionRoot: React.FC = () => {
  return (
    <Composition<DemoProps, Record<string, never>>
      id="Demo"
      component={Demo}
      defaultProps={{ timings: {} }}
      durationInFrames={SCENES.reduce((s, x) => s + x.durationSec * FPS, 0)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      calculateMetadata={async ({ props }) => {
        const timings = props.timings ?? {};
        const total = SCENES.reduce(
          (s, x) => s + sceneDurationFrames(x, timings),
          0,
        );
        return { durationInFrames: total };
      }}
    />
  );
};
