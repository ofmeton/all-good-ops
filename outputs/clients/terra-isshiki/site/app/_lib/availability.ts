// Airbnb iCal を fetch して占有日を返す。
// 環境変数 AIRBNB_ICAL_URL がない場合は空配列（=「カレンダー未連携」のフォールバック表示）。

export type BlockedRange = { start: Date; end: Date };

function parseICSDate(raw: string): Date | null {
  // 形式: 20260601 または 20260601T000000Z
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
  );
}

export function parseICS(text: string): BlockedRange[] {
  const events: BlockedRange[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let inEvent = false;
  let start: Date | null = null;
  let end: Date | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      start = null;
      end = null;
    } else if (line === "END:VEVENT") {
      if (inEvent && start && end) {
        events.push({ start, end });
      }
      inEvent = false;
    } else if (inEvent) {
      if (line.startsWith("DTSTART")) {
        const v = line.split(":")[1] ?? "";
        start = parseICSDate(v);
      } else if (line.startsWith("DTEND")) {
        const v = line.split(":")[1] ?? "";
        end = parseICSDate(v);
      }
    }
  }
  return events;
}

export async function fetchAvailability(): Promise<BlockedRange[]> {
  const url = process.env.AIRBNB_ICAL_URL;
  if (!url) return [];
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 }, // 1時間キャッシュ
    });
    if (!res.ok) return [];
    const text = await res.text();
    return parseICS(text);
  } catch {
    return [];
  }
}

// 1日の YYYY-MM-DD キー
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildBlockedSet(ranges: BlockedRange[]): Set<string> {
  const blocked = new Set<string>();
  for (const r of ranges) {
    // iCal の DTEND は exclusive（チェックアウト日は空き）が一般的
    const cur = new Date(r.start);
    while (cur < r.end) {
      blocked.add(ymd(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return blocked;
}

export type CalendarMonth = {
  year: number;
  month: number; // 0-indexed
  weeks: ({ date: Date; blocked: boolean; today: boolean } | null)[][];
};

export function buildMonth(year: number, month: number, blocked: Set<string>): CalendarMonth {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startWeekday = first.getDay(); // 0=Sun
  const totalDays = last.getDate();
  const cells: ({ date: Date; blocked: boolean; today: boolean } | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    const key = ymd(date);
    cells.push({
      date,
      blocked: blocked.has(key),
      today: date.getTime() === today.getTime(),
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: ({ date: Date; blocked: boolean; today: boolean } | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { year, month, weeks };
}

export function buildUpcomingMonths(count: number, blocked: Set<string>): CalendarMonth[] {
  const today = new Date();
  const months: CalendarMonth[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    months.push(buildMonth(d.getFullYear(), d.getMonth(), blocked));
  }
  return months;
}
