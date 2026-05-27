/**
 * digest.test.ts (PR-D Daily Digest)
 *
 * Phase 0.5 fallback で完走させる。
 * KpiCollectorDeps を stub に差し替えて KPI snapshot をテスト。
 */
import {
  collectKpis,
  toJstDateString,
  type KpiCollectorDeps,
  type PostStats,
} from "./kpi-collector.ts";
import { formatDigest, runDailyDigest, sendToLine } from "./digest.ts";

beforeAll(() => {
  process.env.IN_MEMORY_FALLBACK = "true";
  process.env.LINE_DRY_RUN = "true";
  // brownout 閾値を test default に上書き
  process.env.BUDGET_BROWNOUT_THRESHOLD_JPY = "11500";
  process.env.BUDGET_MONTHLY_LIMIT_JPY = "10000";
});

describe("toJstDateString", () => {
  test("UTC 2026-05-27 12:00 → JST 2026-05-27", () => {
    const d = new Date("2026-05-27T12:00:00Z");
    expect(toJstDateString(d)).toBe("2026-05-27");
  });
  test("UTC 2026-05-27 15:00 → JST 2026-05-28", () => {
    // JST = UTC + 9h → 2026-05-28 00:00
    const d = new Date("2026-05-27T15:00:00Z");
    expect(toJstDateString(d)).toBe("2026-05-28");
  });
});

describe("collectKpis", () => {
  test("zero posts day → pcr null + no alerts (in fallback)", async () => {
    const deps: KpiCollectorDeps = {
      getMonthlyCostJpy: async () => 0,
      getKillSwitchState: async () => false,
      getPostStats: async () => ({
        posts: 0,
        impressions: 0,
        url_link_clicks: 0,
        profile_clicks: 0,
      }),
    };
    const kpi = await collectKpis({ now: new Date("2026-05-27T12:00:00Z"), deps });
    expect(kpi.posts_today).toBe(0);
    expect(kpi.pcr_today).toBeNull();
    expect(kpi.pcr_7d_avg).toBeNull();
    expect(kpi.brownout).toBe(false);
    expect(kpi.kill_switch_on).toBe(false);
    expect(kpi.alerts.length).toBe(0);
  });

  test("brownout state → critical alert added", async () => {
    const deps: KpiCollectorDeps = {
      getMonthlyCostJpy: async () => 11600, // 11500 超え
      getKillSwitchState: async () => false,
      getPostStats: async () => ({
        posts: 1,
        impressions: 1000,
        url_link_clicks: 5,
        profile_clicks: 20,
      }),
    };
    const kpi = await collectKpis({ now: new Date("2026-05-27T12:00:00Z"), deps });
    expect(kpi.brownout).toBe(true);
    const brownoutAlert = kpi.alerts.find((a) => a.rule_id === "brownout");
    expect(brownoutAlert?.severity).toBe("critical");
    expect(kpi.pcr_today).toBeCloseTo(0.02, 4);
  });

  test("over monthly_limit but not brownout → warn alert", async () => {
    const deps: KpiCollectorDeps = {
      getMonthlyCostJpy: async () => 10500,
      getKillSwitchState: async () => false,
      getPostStats: async () => ({
        posts: 0,
        impressions: 0,
        url_link_clicks: 0,
        profile_clicks: 0,
      }),
    };
    const kpi = await collectKpis({ now: new Date("2026-05-27T12:00:00Z"), deps });
    expect(kpi.brownout).toBe(false);
    const warn = kpi.alerts.find((a) => a.rule_id === "monthly_limit");
    expect(warn?.severity).toBe("warn");
  });

  test("kill_switch on → critical alert added", async () => {
    const deps: KpiCollectorDeps = {
      getMonthlyCostJpy: async () => 0,
      getKillSwitchState: async () => true,
      getPostStats: async () => ({
        posts: 0,
        impressions: 0,
        url_link_clicks: 0,
        profile_clicks: 0,
      }),
    };
    const kpi = await collectKpis({ now: new Date(), deps });
    expect(kpi.kill_switch_on).toBe(true);
    expect(kpi.alerts.some((a) => a.rule_id === "kill_switch")).toBe(true);
  });
});

describe("formatDigest", () => {
  test("Daily Digest text includes 当日 / 7日 / コスト sections", () => {
    const payload = formatDigest(
      {
        date: "2026-05-27",
        posts_today: 2,
        impressions_today: 5000,
        url_link_clicks_today: 30,
        pcr_today: 0.012,
        pcr_7d_avg: 0.0095,
        impressions_7d_sum: 35000,
        brownout: false,
        kill_switch_on: false,
        cost_jpy_mtd: 3200,
        alerts: [],
      },
      "U_test",
    );
    expect(payload.text).toContain("ofmeton Daily Digest 2026-05-27");
    expect(payload.text).toContain("◆ 当日");
    expect(payload.text).toContain("◆ 7 日累計");
    expect(payload.text).toContain("◆ コスト");
    expect(payload.text).toContain("¥3,200");
    expect(payload.text).toContain("1.200%"); // pcr_today
    expect(payload.text).toContain("通常運用継続");
    expect(payload.to).toBe("U_test");
    expect(payload.meta.alert_count).toBe(0);
  });

  test("brownout=true → alert section + next-action 月初リセット", () => {
    const payload = formatDigest(
      {
        date: "2026-05-27",
        posts_today: 0,
        impressions_today: 0,
        url_link_clicks_today: 0,
        pcr_today: null,
        pcr_7d_avg: null,
        impressions_7d_sum: 0,
        brownout: true,
        kill_switch_on: false,
        cost_jpy_mtd: 11800,
        alerts: [
          { severity: "critical", rule_id: "brownout", message: "test" },
        ],
      },
      "U_test",
    );
    expect(payload.text).toContain("brownout: 🔴 ON");
    expect(payload.text).toContain("⚠️ Alerts");
    expect(payload.text).toContain("月初リセット or 手動復帰");
    expect(payload.meta.brownout).toBe(true);
  });

  test("kill_switch on → next-action !resume", () => {
    const payload = formatDigest({
      date: "2026-05-27",
      posts_today: 0,
      impressions_today: 0,
      url_link_clicks_today: 0,
      pcr_today: null,
      pcr_7d_avg: null,
      impressions_7d_sum: 0,
      brownout: false,
      kill_switch_on: true,
      cost_jpy_mtd: 0,
      alerts: [{ severity: "critical", rule_id: "kill_switch", message: "test" }],
    });
    expect(payload.text).toContain("kill-switch 復帰");
  });
});

describe("sendToLine", () => {
  test("dry-run returns status dry_run", async () => {
    const res = await sendToLine({
      date: "2026-05-27",
      text: "hello",
      to: "U_test",
      meta: { brownout: false, kill_switch_on: false, alert_count: 0 },
    });
    expect(res.status).toBe("dry_run");
  });
});

describe("runDailyDigest integration", () => {
  test("end-to-end with stub deps returns dry_run", async () => {
    const stats: PostStats = {
      posts: 1,
      impressions: 1500,
      url_link_clicks: 10,
      profile_clicks: 15,
    };
    const deps: KpiCollectorDeps = {
      getMonthlyCostJpy: async () => 1234,
      getKillSwitchState: async () => false,
      getPostStats: async () => stats,
    };
    const { payload, sendResult } = await runDailyDigest({
      now: new Date("2026-05-27T12:00:00Z"),
      deps,
      to: "U_xyz",
    });
    expect(sendResult.status).toBe("dry_run");
    expect(payload.date).toBe("2026-05-27");
    expect(payload.to).toBe("U_xyz");
    expect(payload.text).toContain("¥1,234");
  });
});
