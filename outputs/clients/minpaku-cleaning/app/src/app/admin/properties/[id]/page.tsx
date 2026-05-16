import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { getProperty } from "@/lib/db/properties";
import { listOwners } from "@/lib/db/owners";
import { listStaff } from "@/lib/db/staff";
import { getActiveToken } from "@/lib/db/tokens";
import { TokenControls } from "../../TokenControls";
import { EditPropertyForm } from "./EditPropertyForm";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const { id } = await params;
  const [property, owners, allStaff] = await Promise.all([
    getProperty(actor, id),
    listOwners(actor),
    listStaff(actor),
  ]);
  if (!property) notFound();
  const assignedStaff = allStaff.filter((s) => s.property_ids.includes(id));
  const token = await getActiveToken(actor, { type: "owner", propertyId: id });

  return (
    <main className="space-y-4 max-w-2xl">
      <div className="text-sm">
        <Link href="/admin/properties" className="underline">
          ← 物件一覧へ
        </Link>
      </div>
      <h1 className="text-xl font-bold">物件: {property.name}</h1>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm text-gray-700">基本情報</h2>
        <EditPropertyForm property={property} owners={owners} />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm text-gray-700">担当スタッフ</h2>
        {assignedStaff.length === 0 ? (
          <p className="text-sm text-gray-500">
            担当スタッフは未割当です。スタッフ管理画面でスタッフを開いて、この物件にチェックを入れてください。
          </p>
        ) : (
          <ul className="divide-y border rounded">
            {assignedStaff.map((s) => (
              <li key={s.id} className="px-3 py-2 text-sm">
                <Link href={`/admin/staff/${s.id}`} className="underline">
                  {s.name}
                </Link>
                {s.email && <span className="text-gray-500"> — {s.email}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm text-gray-700">オーナー用URL</h2>
        <TokenControls
          target={{ type: "owner", propertyId: id }}
          activeToken={token ? { id: token.id, token: token.token } : null}
          basePath="property"
        />
      </section>
    </main>
  );
}
