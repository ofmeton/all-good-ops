import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FPS, type Scene, type SceneId } from "../scenes";

const __dirname = dirname(fileURLToPath(import.meta.url));
const timingsPath = join(__dirname, "..", "..", "output", "recordings", "timings.json");

export type Timings = Partial<Record<SceneId, { startMs: number; endMs: number }>>;

export function readTimingsSafe(): Timings {
  try {
    return JSON.parse(readFileSync(timingsPath, "utf-8")) as Timings;
  } catch {
    return {};
  }
}

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
