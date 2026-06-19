import type { ParsedReservation, Bucket, Activity } from "./types";

export function dedupActivities(activities: Activity[]): Activity[] {
  const seen = new Set<string>();
  const out: Activity[] = [];
  for (const a of activities) {
    if (seen.has(a.dedupId)) continue;
    seen.add(a.dedupId);
    out.push(a);
  }
  return out;
}

export function mergeIntoBucket(existing: Bucket | null, p: ParsedReservation): Bucket {
  if (!existing) {
    return {
      reservationKey: p.reservationKey,
      firstSeenAt: p.receivedAt,
      customer: p.customer,
      stay: p.stay,
      dashboardUrl: p.dashboardUrl,
      activities: [p.activity],
      messageIds: [p.messageId],
    };
  }
  const messageIds = existing.messageIds.includes(p.messageId)
    ? existing.messageIds
    : [...existing.messageIds, p.messageId];
  return {
    ...existing,
    dashboardUrl: existing.dashboardUrl || p.dashboardUrl,
    activities: dedupActivities([...existing.activities, p.activity]),
    messageIds,
  };
}
