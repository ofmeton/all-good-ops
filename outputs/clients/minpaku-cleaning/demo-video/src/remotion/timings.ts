import { FPS, type Scene, type SceneId } from "../scenes";

export type Timings = Partial<Record<SceneId, { startMs: number; endMs: number }>>;

/** scene の frame 数。recording 有: timings から / 無 or 未録画: scenes.ts durationSec から */
export function sceneDurationFrames(scene: Scene, timings: Timings): number {
  if (scene.hasRecording) {
    const t = timings[scene.id];
    if (t) {
      const ms = t.endMs - t.startMs;
      return Math.max(1, Math.round((ms / 1000) * FPS));
    }
  }
  return scene.durationSec * FPS;
}
