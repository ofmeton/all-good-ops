import { resolveActorByToken } from "@/lib/auth";
import { listRequestsForStaff } from "@/lib/db/requests";
import { RequestList } from "./RequestList";

export default async function StaffRequestsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // layout でトークン検証済み。ここでは staff actor 前提で再解決する。
  const actor = await resolveActorByToken(token);
  // layout がガード済みなので actor は staff だが、型のため null チェック
  if (!actor || actor.role !== "staff") return null;
  const requests = await listRequestsForStaff(actor);
  return (
    <main className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">担当の清掃依頼</h1>
      <RequestList token={token} requests={requests} />
    </main>
  );
}
