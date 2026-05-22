export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main>
      <h1>money-bot</h1>
      <p className="muted">
        24h autonomous publishing engine for ofmeton (Plan-B). 承認 URL は LINE 通知から開きます。
      </p>
      <div className="card">
        <h2>routes</h2>
        <ul>
          <li>
            <code>/approval-queue/[runId]</code> — 承認 UI
          </li>
          <li>
            <code>/api/cron/daily-publish</code> — cron トリガー
          </li>
          <li>
            <code>/api/approval-hook</code> — 承認 hook resolver
          </li>
          <li>
            <code>/api/line-webhook</code> — LINE webhook 受け口
          </li>
        </ul>
      </div>
    </main>
  );
}
