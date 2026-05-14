import { resolveAdminActor } from "@/lib/supabase-auth";
import { listProperties } from "@/lib/db/properties";
import { listOwners } from "@/lib/db/owners";
import { redirect } from "next/navigation";
import { PropertyForm } from "./PropertyForm";

export default async function PropertiesPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const [properties, owners] = await Promise.all([
    listProperties(actor),
    listOwners(actor),
  ]);
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">物件管理</h1>
      {owners.length === 0 ? (
        <p className="text-sm text-gray-500">先にオーナーを登録してください。</p>
      ) : (
        <PropertyForm owners={owners} />
      )}
      <ul className="divide-y border rounded">
        {properties.map((p) => (
          <li key={p.id} className="px-3 py-2 text-sm">
            {p.name}{p.address ? ` — ${p.address}` : ""}
          </li>
        ))}
      </ul>
    </main>
  );
}
