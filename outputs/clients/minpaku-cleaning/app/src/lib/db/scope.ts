import type { Actor } from "@/lib/auth";

export class AuthorizationError extends Error {}

// スタッフ専用の操作を admin/owner が呼んだときに投げる。
export class StaffOnlyError extends Error {}

// 管理者専用操作のガード。管理者以外は AuthorizationError。
export function assertAdmin(
  actor: Actor,
): asserts actor is Extract<Actor, { role: "admin" }> {
  if (actor.role !== "admin") {
    throw new AuthorizationError("管理者権限が必要です");
  }
}
