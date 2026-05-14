import { resolveAdminActor } from "@/lib/supabase-auth";
import { listOwners } from "@/lib/db/owners";
import { redirect } from "next/navigation";
import { OwnerForm } from "./OwnerForm";

export default async function OwnersPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const owners = await listOwners(actor);
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">オーナー管理</h1>
      <OwnerForm />
      <ul className="divide-y border rounded">
        {owners.map((o) => (
          <li key={o.id} className="px-3 py-2 text-sm">
            {o.name}{o.email ? ` — ${o.email}` : ""}
          </li>
        ))}
      </ul>
    </main>
  );
}
