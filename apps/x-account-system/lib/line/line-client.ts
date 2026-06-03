export async function pushLine(to: string, text: string, token: string): Promise<void> {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) throw new Error(`LINE push failed: ${res.status} ${await res.text()}`);
}

/**
 * LINE push API のレスポンス型 (必要部分のみ)。
 * sentMessages[].id は引用リプライ紐づけ (quotedMessageId) に使う message id。
 */
export type LinePushResponse = {
  sentMessages?: Array<{ id?: string; quoteToken?: string }>;
};

/**
 * 複数メッセージを 1 回の push API 呼び出しで送る (LINE 仕様で最大 5 件)。
 * messages は LINE Messaging API の message object 配列 (text / flex 等)。
 * パース済みレスポンスを返す (sentMessages[].id を呼び出し側で紐づけに使う)。
 */
export async function pushLineMessages(
  to: string,
  messages: unknown[],
  token: string,
): Promise<LinePushResponse> {
  if (messages.length > 5) {
    throw new Error(`LINE push: messages exceeds 5 (got ${messages.length})`);
  }
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to, messages }),
  });
  if (!res.ok) throw new Error(`LINE push failed: ${res.status} ${await res.text()}`);
  return (await res.json().catch(() => ({}))) as LinePushResponse;
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
