import { Composition } from "remotion";
import { StayCleanDemo, TOTAL_FRAMES, FPS } from "./StayCleanDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="StayCleanDemo"
      component={StayCleanDemo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
};
