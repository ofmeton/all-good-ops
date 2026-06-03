export async function pushLine(to: string, text: string, token: string): Promise<void> {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) throw new Error(`LINE push failed: ${res.status} ${await res.text()}`);
}

/**
 * Flex Message を 1 件 push する。
 * contents は LINE Flex の bubble / carousel JSON (型はクライアント側で組み立てるため unknown)。
 * altText は通知 / 非対応端末で表示されるフォールバックテキスト。
 */
export async function pushLineFlex(
  to: string,
  altText: string,
  contents: unknown,
  token: string,
): Promise<void> {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to, messages: [{ type: "flex", altText, contents }] }),
  });
  if (!res.ok) throw new Error(`LINE flex push failed: ${res.status} ${await res.text()}`);
}
