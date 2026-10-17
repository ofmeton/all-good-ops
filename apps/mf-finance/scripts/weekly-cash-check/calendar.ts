// Google カレンダーの予定を gws で読む（週次の資金チェックと毎晩の DMM 進捗で共用）。
import { spawnSync } from "node:child_process";

export type Ev = { summary: string; start: string; end: string; selfStatus?: string };

export function listEvents(calendarId: string, from: string, to: string, cwd: string): Ev[] {
  const params = { calendarId, timeMin: from, timeMax: to, singleEvents: true, maxResults: 250, orderBy: "startTime" };
  const r = spawnSync("gws", ["calendar", "events", "list", "--params", JSON.stringify(params), "--page-all"], {
    cwd,
    encoding: "utf8",
    timeout: 600_000,
  });
  if (r.status !== 0) throw new Error(`gws calendar events list が失敗: ${(r.stderr || r.stdout).trim().slice(-500)}`);
  return r.stdout
    .split("\n")
    .filter((l) => l.trim().startsWith("{"))
    .flatMap((l) => JSON.parse(l).items ?? [])
    .filter((e: any) => e.status !== "cancelled")
    .map((e: any) => ({
      summary: e.summary ?? "",
      start: e.start?.dateTime ?? e.start?.date ?? "",
      end: e.end?.dateTime ?? e.end?.date ?? "",
      selfStatus: (e.attendees ?? []).find((a: any) => a.self)?.responseStatus,
    }));
}
