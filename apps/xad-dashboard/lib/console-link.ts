/** Console の session UI への link。base 未設定なら null（壊れリンクを出さない）。 */
export function consoleSessionUrl(sessionId: string | null | undefined): string | null {
  const base = process.env.XAD_CONSOLE_SESSION_BASE;
  if (!base || !sessionId) return null;
  return `${base.replace(/\/$/, "")}/${sessionId}`;
}
