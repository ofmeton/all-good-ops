import Link from "next/link";
import { resolveAdminActor } from "@/lib/supabase-auth";
import { listProperties } from "@/lib/db/properties";
import { listOwners } from "@/lib/db/owners";
import { getActiveToken } from "@/lib/db/tokens";
import { redirect } from "next/navigation";
import { PropertyForm } from "./PropertyForm";
import { TokenControls } from "../TokenControls";

export default async function PropertiesPage() {
  const actor = await resolveAdminActor();
  if (!actor) redirect("/admin/login");
  const [properties, owners] = await Promise.all([
    listProperties(actor),
    listOwners(actor),
  ]);
  const tokens = await Promise.all(
    properties.map((p) => getActiveToken(actor, { type: "owner", propertyId: p.id })),
  );
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">物件管理</h1>
      {owners.length === 0 ? (
        <p className="text-sm text-gray-500">先にオーナーを登録してください。</p>
      ) : (
        <PropertyForm owners={owners} />
      )}
      <ul className="divide-y border rounded">
        {properties.map((p, i) => (
          <li key={p.id} className="px-3 py-2 text-sm space-y-1">
            <div>
              <Link href={`/admin/properties/${p.id}`} className="underline">
                {p.name}
              </Link>
              {p.address ? <span className="text-gray-500"> — {p.address}</span> : null}
            </div>
            <TokenControls
              target={{ type: "owner", propertyId: p.id }}
              activeToken={tokens[i] ? { id: tokens[i]!.id, token: tokens[i]!.token } : null}
              basePath="property"
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
