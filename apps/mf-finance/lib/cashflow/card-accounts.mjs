export function isKnownCardAccount(account, sources = {}) {
  const acc = typeof account === "string" ? account.trim() : "";
  if (!acc) return false;

  for (const row of sources.accountBalanceCards ?? []) {
    const candidate = typeof row === "string" ? row : row?.account;
    if (candidate === acc) return true;
  }

  for (const row of sources.nextMonthCards ?? []) {
    const candidate = typeof row === "string" ? row : row?.account;
    if (candidate === acc) return true;
  }

  return sources.guessKindFn?.(acc) === "card";
}
