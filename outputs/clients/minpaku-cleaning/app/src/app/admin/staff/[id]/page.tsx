import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { getStaff } from "@/lib/db/staff";
import { listProperties } from "@/lib/db/properties";
import { getActiveToken } from "@/lib/db/tokens";
import { TokenControls } from "../../TokenControls";
import { EditStaffForm } from "./EditStaffForm";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const { id } = await params;
  const [staff, properties] = await Promise.all([
    getStaff(actor, id),
    listProperties(actor),
  ]);
  if (!staff) notFound();
  const token = await getActiveToken(actor, { type: "staff", staffId: id });

  return (
    <main className="space-y-4 max-w-2xl">
      <div className="text-sm">
        <Link href="/admin/staff" className="underline">
          ← スタッフ一覧へ
        </Link>
      </div>
      <h1 className="text-xl font-bold">スタッフ: {staff.name}</h1>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm text-gray-700">基本情報</h2>
        <EditStaffForm staff={staff} properties={properties} />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm text-gray-700">スタッフ用URL</h2>
        <TokenControls
          target={{ type: "staff", staffId: id }}
          activeToken={token ? { id: token.id, token: token.token } : null}
          basePath="staff"
        />
      </section>
    </main>
  );
}
