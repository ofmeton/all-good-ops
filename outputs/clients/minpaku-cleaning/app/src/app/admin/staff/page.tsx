import { resolveAdminActor } from "@/lib/supabase-auth";
import { listStaff } from "@/lib/db/staff";
import { listProperties } from "@/lib/db/properties";
import { redirect } from "next/navigation";
import { StaffForm } from "./StaffForm";

export default async function StaffPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const [staff, properties] = await Promise.all([
    listStaff(actor),
    listProperties(actor),
  ]);
  const nameById = new Map(properties.map((p) => [p.id, p.name]));
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">スタッフ管理</h1>
      <StaffForm properties={properties} />
      <ul className="divide-y border rounded">
        {staff.map((s) => (
          <li key={s.id} className="px-3 py-2 text-sm">
            {s.name}
            <span className="text-gray-500">
              {s.property_ids.length > 0
                ? ` — ${s.property_ids.map((id) => nameById.get(id) ?? "?").join("、")}`
                : " — 担当物件なし"}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
