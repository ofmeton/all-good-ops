import { resolveAdminActor } from "@/lib/supabase-auth";
import { listSupplyRequests } from "@/lib/db/supplies";
import { listProperties } from "@/lib/db/properties";
import { redirect } from "next/navigation";

export default async function SuppliesPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const [supplies, properties] = await Promise.all([
    listSupplyRequests(actor),
    listProperties(actor),
  ]);
  const nameById = new Map(properties.map((p) => [p.id, p.name]));
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">備品補充依頼</h1>
      <ul className="divide-y border rounded">
        {supplies.map((s) => (
          <li key={s.id} className="px-3 py-2 text-sm space-y-1">
            <div className="text-gray-500">
              {nameById.get(s.property_id) ?? "?"} —{" "}
              {new Date(s.created_at).toLocaleDateString("ja-JP")}
            </div>
            <div>{s.items}</div>
          </li>
        ))}
        {supplies.length === 0 && (
          <li className="px-3 py-2 text-sm text-gray-500">
            備品補充依頼はまだありません。
          </li>
        )}
      </ul>
    </main>
  );
}
