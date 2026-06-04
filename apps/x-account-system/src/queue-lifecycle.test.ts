import { decideRunStatus } from "./queue.js";

test("成功は ok", () => {
  expect(decideRunStatus({ ok: true, attempt: 1, maxAttempts: 4 })).toBe("ok");
});
test("失敗かつ attempt<maxAttempts は running（再試行に委ねる）", () => {
  expect(decideRunStatus({ ok: false, attempt: 2, maxAttempts: 4 })).toBe("running");
});
test("失敗かつ attempt>=maxAttempts は error（最終失敗）", () => {
  expect(decideRunStatus({ ok: false, attempt: 4, maxAttempts: 4 })).toBe("error");
});
