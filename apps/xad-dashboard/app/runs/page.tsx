import Link from "next/link";
import { listRuns } from "@/lib/queries";

// 都度フレッシュ（新しい run を再デプロイなしに反映）
export const dynamic = "force-dynamic";

export default async function Runs() {
  const runs = await listRuns(50).catch(() => []);
  return (
    <main className="p-4">
      <h1 className="font-bold text-xl mb-3">Runs</h1>
      <table className="text-sm w-full">
        <thead><tr className="text-left"><th>started</th><th>job</th><th>trigger</th><th>status</th><th>attempt</th></tr></thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t">
              <td><Link className="text-blue-600 underline" href={`/runs/${r.id}`}>{new Date(r.started_at).toLocaleString("ja-JP")}</Link></td>
              <td>{r.job}</td><td>{r.trigger}</td><td>{r.status}</td><td>{r.attempt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
