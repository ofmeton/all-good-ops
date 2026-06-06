import { describe, it, expect, beforeEach } from "vitest";
import {
  listRequests,
  getRequest,
  createRequest,
  updateRequest,
  cancelRequest,
  claimRequest,
  assignRequest,
  startRequest,
  confirmRequest,
  listRequestsForStaff,
  getRequestForStaff,
  assertStaffAssignedToRequest,
  RequestAlreadyClaimedError,
} from "@/lib/db/requests";
import { createServiceClient } from "@/lib/supabase-server";
import { resetDb } from "../helpers/reset-db";
import type { Actor } from "@/lib/auth";

const db = createServiceClient();
let admin: Actor;
const staff: Actor = { role: "staff", staffId: "s1" };

let propertyId: string;

// 翌日以降の YYYY-MM-DD を返すヘルパー（JST 基準・実装側 todayInJST と整合）
function dateStr(daysFromNow: number): string {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + daysFromNow);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

beforeEach(async () => {
  await resetDb();

  // 実 admin を seed（created_by の FK 制約を満たすため）。
  // resetDb は admins / auth.users を消さないので毎回 upsert 的に作り直す。
  const ADMIN_EMAIL = "req-test-admin@example.com";
  const { data: existingAdmin } = await db
    .from("admins").select("id").eq("email", ADMIN_EMAIL).maybeSingle();
  if (existingAdmin) {
    await db.auth.admin.deleteUser(existingAdmin.id); // admins へ cascade
  }
  const { data: createdUser, error: userError } = await db.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: "req-test-admin-pw",
    email_confirm: true,
  });
  if (userError) throw userError;
  await db.from("admins").insert({
    id: createdUser.user!.id,
    email: ADMIN_EMAIL,
    name: "テスト管理者",
  });
  admin = { role: "admin", adminId: createdUser.user!.id, roleLevel: 1 };

  const { data: owner } = await db.from("owners").insert({ name: "オーナーA" }).select().single();
  const { data: property } = await db
    .from("properties").insert({ owner_id: owner!.id, name: "物件A" }).select().single();
  propertyId = property!.id;
});

describe("cleaning_requests データアクセス（管理者CRUD）", () => {
  it("管理者は依頼を作成・取得できる", async () => {
    const created = await createRequest(admin, {
      property_id: propertyId,
      checkin_date: dateStr(3),
      checkout_date: dateStr(5),
      guest_count: 2,
    });
    expect(created.status).toBe("unassigned");
    expect(created.assignment_deadline).toBeTruthy();
    const list = await listRequests(admin);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });

  it("管理者以外は作成できない", async () => {
    await expect(
      createRequest(staff, {
        property_id: propertyId,
        checkin_date: dateStr(3),
        checkout_date: dateStr(5),
        guest_count: 2,
      }),
    ).rejects.toThrow("管理者権限が必要です");
  });

  it("チェックイン日が当日以前なら拒否する", async () => {
    await expect(
      createRequest(admin, {
        property_id: propertyId,
        checkin_date: dateStr(0),
        checkout_date: dateStr(2),
        guest_count: 2,
      }),
    ).rejects.toThrow("チェックイン日は翌日以降");
  });

  it("チェックアウトがチェックイン以前なら拒否する", async () => {
    await expect(
      createRequest(admin, {
        property_id: propertyId,
        checkin_date: dateStr(5),
        checkout_date: dateStr(3),
        guest_count: 2,
      }),
    ).rejects.toThrow("チェックアウト日はチェックイン日より後");
  });

  it("依頼を編集できる", async () => {
    const created = await createRequest(admin, {
      property_id: propertyId,
      checkin_date: dateStr(3),
      checkout_date: dateStr(5),
      guest_count: 2,
    });
    await updateRequest(admin, created.id, { guest_count: 4 });
    const fetched = await getRequest(admin, created.id);
    expect(fetched?.guest_count).toBe(4);
  });

  it("cancelRequest は status を cancelled にする", async () => {
    const created = await createRequest(admin, {
      property_id: propertyId,
      checkin_date: dateStr(3),
      checkout_date: dateStr(5),
      guest_count: 2,
    });
    await cancelRequest(admin, created.id);
    const fetched = await getRequest(admin, created.id);
    expect(fetched?.status).toBe("cancelled");
  });
});

describe("cleaning_requests 割当・進行遷移", () => {
  // 担当スタッフ付きの依頼を1件作るヘルパー
  async function seedAssignedStaffAndRequest() {
    const { data: st } = await db.from("staff").insert({ name: "スタッフX" }).select().single();
    await db.from("staff_assignments").insert({ staff_id: st!.id, property_id: propertyId });
    const req = await createRequest(admin, {
      property_id: propertyId,
      checkin_date: dateStr(3),
      checkout_date: dateStr(5),
      guest_count: 2,
    });
    return { staffId: st!.id as string, requestId: req.id };
  }

  it("担当スタッフは未割当の依頼を承認できる（early claim）", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    const staffActor: Actor = { role: "staff", staffId };
    await claimRequest(staffActor, requestId);
    const req = await getRequest(admin, requestId);
    expect(req?.status).toBe("assigned");
    expect(req?.assigned_staff_id).toBe(staffId);
  });

  it("既に割当済みの依頼を承認すると RequestAlreadyClaimedError", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    const staffActor: Actor = { role: "staff", staffId };
    await claimRequest(staffActor, requestId);
    // 別スタッフも同物件担当にして二重承認を試みる
    const { data: st2 } = await db.from("staff").insert({ name: "スタッフY" }).select().single();
    await db.from("staff_assignments").insert({ staff_id: st2!.id, property_id: propertyId });
    await expect(
      claimRequest({ role: "staff", staffId: st2!.id }, requestId),
    ).rejects.toThrow(RequestAlreadyClaimedError);
  });

  it("担当外スタッフは承認できない", async () => {
    const { requestId } = await seedAssignedStaffAndRequest();
    const { data: outsider } = await db.from("staff").insert({ name: "担当外" }).select().single();
    await expect(
      claimRequest({ role: "staff", staffId: outsider!.id }, requestId),
    ).rejects.toThrow("この物件の担当ではありません");
  });

  it("管理者は手動でスタッフを割り当てられる", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    await assignRequest(admin, requestId, staffId);
    const req = await getRequest(admin, requestId);
    expect(req?.status).toBe("assigned");
    expect(req?.assigned_staff_id).toBe(staffId);
  });

  it("割当→開始→報告（startRequest）の遷移", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    const staffActor: Actor = { role: "staff", staffId };
    await claimRequest(staffActor, requestId);
    await startRequest(staffActor, requestId);
    const req = await getRequest(admin, requestId);
    expect(req?.status).toBe("in_progress");
  });

  it("未割当の依頼は開始できない（状態機械で拒否）", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    await expect(
      startRequest({ role: "staff", staffId }, requestId),
    ).rejects.toThrow("自分が担当する依頼ではありません");
  });

  it("confirmRequest は reported → confirmed に遷移する", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    // reported まで進める
    await db
      .from("cleaning_requests")
      .update({ status: "reported", assigned_staff_id: staffId })
      .eq("id", requestId);
    await confirmRequest(admin, requestId);
    const req = await getRequest(admin, requestId);
    expect(req?.status).toBe("confirmed");
  });

  it("listRequestsForStaff は担当物件の未割当＋自分の割当分を物件名付きで返す", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    const staffActor: Actor = { role: "staff", staffId };
    const list = await listRequestsForStaff(staffActor);
    const found = list.find((r) => r.id === requestId);
    expect(found).toBeTruthy();
    expect(found?.property_name).toBe("物件A");
  });

  it("getRequestForStaff は担当物件の依頼を物件名・チェックリスト付きで返す", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    const result = await getRequestForStaff({ role: "staff", staffId }, requestId);
    expect(result?.id).toBe(requestId);
    expect(result?.property.name).toBe("物件A");
    expect(Array.isArray(result?.property.checklist_template)).toBe(true);
  });

  it("getRequestForStaff は担当外物件の依頼に null を返す", async () => {
    const { requestId } = await seedAssignedStaffAndRequest();
    const { data: outsider } = await db.from("staff").insert({ name: "担当外2" }).select().single();
    const result = await getRequestForStaff({ role: "staff", staffId: outsider!.id }, requestId);
    expect(result).toBeNull();
  });

  it("assertStaffAssignedToRequest は担当本人なら通過する", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    await expect(
      assertStaffAssignedToRequest({ role: "staff", staffId }, requestId),
    ).resolves.toBeUndefined();
  });

  it("assertStaffAssignedToRequest は担当外スタッフを拒否する（写真アップロード IDOR 防止）", async () => {
    const { requestId } = await seedAssignedStaffAndRequest();
    const { data: outsider } = await db.from("staff").insert({ name: "担当外3" }).select().single();
    await expect(
      assertStaffAssignedToRequest({ role: "staff", staffId: outsider!.id }, requestId),
    ).rejects.toThrow("この物件の担当ではありません");
  });
});

describe("cleaning_requests 競合制御（TOCTOU）", () => {
  async function seedAssignedStaffAndRequest() {
    const { data: st } = await db.from("staff").insert({ name: "競合スタッフ" }).select().single();
    await db.from("staff_assignments").insert({ staff_id: st!.id, property_id: propertyId });
    const req = await createRequest(admin, {
      property_id: propertyId,
      checkin_date: dateStr(3),
      checkout_date: dateStr(5),
      guest_count: 2,
    });
    return { staffId: st!.id as string, requestId: req.id };
  }

  it("confirmRequest を同時に二重実行しても確定は1回だけ（重複オーナー通知を防ぐ）", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    await db
      .from("cleaning_requests")
      .update({ status: "reported", assigned_staff_id: staffId })
      .eq("id", requestId);

    const results = await Promise.allSettled([
      confirmRequest(admin, requestId),
      confirmRequest(admin, requestId),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

    // 通知は確定した1回ぶんのみ（request 単位で隔離。request_id は payload 内）
    const { data: logs } = await db
      .from("notifications_log")
      .select("id")
      .eq("kind", "request_confirmed")
      .eq("payload->>request_id", requestId);
    expect(logs ?? []).toHaveLength(1);
  });

  it("cancelRequest を同時に二重実行しても成功は1回だけ", async () => {
    const { requestId } = await seedAssignedStaffAndRequest();
    const results = await Promise.allSettled([
      cancelRequest(admin, requestId),
      cancelRequest(admin, requestId),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });

  it("startRequest を同時に二重実行しても開始は1回だけ", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    const staffActor: Actor = { role: "staff", staffId };
    await claimRequest(staffActor, requestId); // assigned

    const results = await Promise.allSettled([
      startRequest(staffActor, requestId),
      startRequest(staffActor, requestId),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });

  it("assignRequest は開始済み依頼を割当で上書きしない（start と競合しても torn state にしない）", async () => {
    const { staffId, requestId } = await seedAssignedStaffAndRequest();
    const staffActor: Actor = { role: "staff", staffId };
    await claimRequest(staffActor, requestId); // assigned to X
    const { data: stY } = await db.from("staff").insert({ name: "競合Y" }).select().single();
    await db.from("staff_assignments").insert({ staff_id: stY!.id, property_id: propertyId });

    await Promise.allSettled([
      startRequest(staffActor, requestId), // assigned → in_progress (X)
      assignRequest(admin, requestId, stY!.id), // reassign → assigned (Y)
    ]);

    const req = await getRequest(admin, requestId);
    // 内部整合: in_progress なら担当は X のまま / assigned なら担当は Y。
    // start の in_progress(X) を assign が担当だけ Y に書き換える torn state を禁止。
    if (req?.status === "in_progress") {
      expect(req?.assigned_staff_id).toBe(staffId);
    } else {
      expect(req?.status).toBe("assigned");
      expect(req?.assigned_staff_id).toBe(stY!.id);
    }
  });
});
