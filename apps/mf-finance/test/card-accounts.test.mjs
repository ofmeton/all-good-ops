import { test } from "node:test";
import assert from "node:assert/strict";
import { isKnownCardAccount } from "../lib/cashflow/card-accounts.mjs";

test("isKnownCardAccount: account_balances kind=card 由来を true にする", () => {
  assert.equal(
    isKnownCardAccount("三井住友カード (VpassID)", {
      accountBalanceCards: [{ account: "三井住友カード (VpassID)" }],
      nextMonthCards: [],
      guessKindFn: () => "other",
    }),
    true,
  );
});

test("isKnownCardAccount: getNextMonthCardCharge().byCard 由来を true にする", () => {
  assert.equal(
    isKnownCardAccount("みずほJCBデビット", {
      accountBalanceCards: [],
      nextMonthCards: [{ account: "みずほJCBデビット", amount: 12000 }],
      guessKindFn: () => "other",
    }),
    true,
  );
});

test("isKnownCardAccount: guessKind 由来のカードを true にし空文字と非カードは false", () => {
  const guessKindFn = (account) => (account === "ポケットカード" ? "card" : "bank");
  assert.equal(
    isKnownCardAccount("ポケットカード", {
      accountBalanceCards: [],
      nextMonthCards: [],
      guessKindFn,
    }),
    true,
  );
  assert.equal(
    isKnownCardAccount("普通預金", {
      accountBalanceCards: [],
      nextMonthCards: [],
      guessKindFn,
    }),
    false,
  );
  assert.equal(
    isKnownCardAccount("  ", {
      accountBalanceCards: [{ account: "  " }],
      nextMonthCards: [{ account: "  ", amount: 1 }],
      guessKindFn: () => "card",
    }),
    false,
  );
});
