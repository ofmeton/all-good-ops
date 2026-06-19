import { describe, it, expect } from "vitest";
import { mergeIntoBucket, dedupActivities } from "../aggregate";
import { parseReservationMail } from "../parse";
import { SAMPLE_ICE, SAMPLE_NOSAGYO, SAMPLE_ICE_DUP, SAMPLE_SANSAKU } from "./fixtures";

const ice = parseReservationMail(SAMPLE_ICE)!;
const nosagyo = parseReservationMail(SAMPLE_NOSAGYO)!;
const iceDup = parseReservationMail(SAMPLE_ICE_DUP)!;
const sansaku = parseReservationMail(SAMPLE_SANSAKU)!;

describe("mergeIntoBucket", () => {
  it("新規作成で firstSeenAt は初回メール受信時刻", () => {
    const b = mergeIntoBucket(null, ice);
    expect(b.reservationKey).toBe("ac23a431");
    expect(b.firstSeenAt).toBe(ice.receivedAt);
    expect(b.activities).toHaveLength(1);
    expect(b.messageIds).toEqual(["msg-ice-1"]);
  });

  it("3種を集約し firstSeenAt は維持", () => {
    let b = mergeIntoBucket(null, ice);
    b = mergeIntoBucket(b, nosagyo);
    b = mergeIntoBucket(b, sansaku);
    expect(b.activities.map(a => a.name)).toEqual([
      "棚田米アイスづくりと野草茶体験",
      "棚田と里山の農作業体験",
      "棚田散策",
    ]);
    expect(b.firstSeenAt).toBe(ice.receivedAt);
    expect(b.messageIds).toHaveLength(3);
  });

  it("重複（同一dedupId）は1件に畳む", () => {
    let b = mergeIntoBucket(null, ice);
    b = mergeIntoBucket(b, iceDup);
    expect(b.activities).toHaveLength(1);
    expect(b.messageIds).toEqual(["msg-ice-1", "msg-ice-2"]); // メールは両方処理済み記録
  });
});

describe("dedupActivities", () => {
  it("dedupId 一意化で初出順を保持", () => {
    expect(dedupActivities([ice.activity, iceDup.activity, nosagyo.activity]).map(a => a.dedupId)).toEqual([
      "ac23a431_tanada-ice_20260813",
      "ac23a431_tanada-nosagyo_20260813",
    ]);
  });
});
