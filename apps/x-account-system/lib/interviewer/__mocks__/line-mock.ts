/**
 * LINE mock: jest 内で LINE 送信を捕捉するための helper.
 * 実 LINE_DRY_RUN=true の log を memory capture したい時に使う。
 */
export const sentMessages: Array<{ to: string; text: string; ts: number }> = [];

export function captureLineSend(to: string, text: string): void {
  sentMessages.push({ to, text, ts: Date.now() });
}

export function resetMock(): void {
  sentMessages.length = 0;
}
