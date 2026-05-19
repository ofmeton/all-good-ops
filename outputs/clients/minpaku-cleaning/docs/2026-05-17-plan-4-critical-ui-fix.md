# Plan 4 Critical UI Gap 補修 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 検収段階で発覚した Critical 3 件の UI ギャップを塞ぎ、クライアントが独立運用できる状態にする。

**Architecture:** 既存パターン（`/admin/[entity]/page.tsx` + `<Form>.tsx`）を踏襲。API は実装済みなので UI のみ追加。新規ファイルは最小限、既存 component の inline 編集に留める。

**Tech Stack:** Next.js 16 App Router / TypeScript / Supabase / Tailwind / Vitest

**前提（確認済み）:**
- DB 層 `updateProperty(owner_id 含む)` / `updateStaff(line_user_id + property_ids 一括)` / `archiveProperty` / `archiveStaff` 実装済み
- API route PATCH/DELETE 実装済み: `/api/admin/properties` / `/api/admin/staff`
- 不足は `getProperty(id)` / `getStaff(id)` の DB 関数のみ
- 設計書 (`docs/2026-05-14-design.md`) に `capacity` 列の定義なし → 検収シナリオ記述ミスを書き直しのみで対応

**スコープ外（Major のまま放置・OPS_GUIDE で工藤代行運用を明記）:**
- オーナー編集 UI（年に数回の操作なので工藤代行で十分）

---

## ファイル構成（新規・変更）

```
outputs/clients/minpaku-cleaning/app/
  src/
    lib/db/
      properties.ts        # getProperty(id) 追加
      staff.ts             # getStaff(id) 追加
    app/admin/
      properties/
        page.tsx           # 各物件に「詳細」リンク追加
        [id]/
          page.tsx         # 新規: 詳細・編集ページ
          EditPropertyForm.tsx  # 新規: 編集フォーム（owner_id 変更含む）
      staff/
        page.tsx           # 各スタッフに「詳細」リンク追加
        [id]/
          page.tsx         # 新規: 詳細・編集ページ
          EditStaffForm.tsx     # 新規: 編集フォーム（LINE ID + property_ids 変更）
  tests/db/
    properties.test.ts     # getProperty + updateProperty owner_id 変更ケース追加
    staff.test.ts          # getStaff + updateStaff LINE ID/property_ids 更新ケース追加

outputs/clients/minpaku-cleaning/handoff/client-facing/
  04-acceptance-test.md    # 検収シナリオ書き直し（capacity 削除・新動線反映）
  01-admin-guide.md        # 編集動線の追記（必要なら）
```

---

## Task 1: 物件詳細・編集ページ実装

**Files:**
- Create: `app/src/app/admin/properties/[id]/page.tsx`
- Create: `app/src/app/admin/properties/[id]/EditPropertyForm.tsx`
- Modify: `app/src/lib/db/properties.ts` (getProperty 追加)
- Modify: `app/src/app/admin/properties/page.tsx` (各行に「詳細」リンク追加)
- Test: `app/tests/db/properties.test.ts` (getProperty test 追加)

### Step 1-1: getProperty(id) を `lib/db/properties.ts` に追加

```typescript
export async function getProperty(actor: Actor, id: string): Promise<Property | null> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("properties")
    .select("*")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  return (data as Property) ?? null;
}
```

### Step 1-2: properties.test.ts に getProperty test 追加

```typescript
it("getProperty: 既存物件を返す", async () => {
  const created = await createProperty(adminActor, {
    owner_id: ownerId, name: "詳細テスト", address: null,
  });
  const fetched = await getProperty(adminActor, created.id);
  expect(fetched?.id).toBe(created.id);
  expect(fetched?.name).toBe("詳細テスト");
});

it("getProperty: 存在しないIDは null", async () => {
  const fetched = await getProperty(adminActor, "00000000-0000-0000-0000-000000000000");
  expect(fetched).toBeNull();
});

it("getProperty: archived は null", async () => {
  const created = await createProperty(adminActor, { owner_id: ownerId, name: "削除対象" });
  await archiveProperty(adminActor, created.id);
  const fetched = await getProperty(adminActor, created.id);
  expect(fetched).toBeNull();
});
```

### Step 1-3: EditPropertyForm.tsx 実装

クライアントコンポーネント。フォーム項目: name (required), address, access_info_note, owner_id (select)
PATCH `/api/admin/properties` body: `{ id, name, address, access_info_note, owner_id }`

削除ボタンも同 component に: DELETE `/api/admin/properties?id=<id>` 確認 alert あり

### Step 1-4: app/admin/properties/[id]/page.tsx 実装

サーバーコンポーネント:
- `getProperty(actor, params.id)` で物件取得（null なら notFound）
- `listOwners(actor)` で割当候補オーナー取得
- 担当スタッフ一覧表示（`listStaff(actor)` → property_ids.includes(id) でフィルタ）
- 各担当スタッフから `/admin/staff/[id]` へリンク
- `getActiveToken({ type: "owner", propertyId: id })` でトークン取得
- `<TokenControls>` 再利用

### Step 1-5: properties/page.tsx の各 li に「詳細」リンク追加

```tsx
<div className="flex items-center justify-between">
  <Link href={`/admin/properties/${p.id}`} className="underline">{p.name}</Link>
  {p.address && <span className="text-gray-500">— {p.address}</span>}
</div>
```

### Step 1-6: 全テスト実行

```bash
npm test -- tests/db/properties.test.ts
```

期待: 既存 + 新規ケースすべて pass

### Step 1-7: TypeScript チェック

```bash
npx tsc --noEmit
```

期待: エラーなし

### Step 1-8: Commit

```bash
git add app/src/lib/db/properties.ts \
  app/src/app/admin/properties/page.tsx \
  app/src/app/admin/properties/[id]/page.tsx \
  app/src/app/admin/properties/[id]/EditPropertyForm.tsx \
  app/tests/db/properties.test.ts
git commit -m "feat(minpaku): 物件詳細・編集ページ実装

- getProperty(id) を DB 層に追加
- /admin/properties/[id] で詳細表示・編集・オーナー再割当・削除
- 担当スタッフ一覧表示（スタッフ詳細へリンク）
- 一覧画面から詳細ページへ遷移可能に

Critical UI gap #2 #4 を解消。"
```

---

## Task 2: スタッフ詳細・編集ページ実装

**Files:**
- Create: `app/src/app/admin/staff/[id]/page.tsx`
- Create: `app/src/app/admin/staff/[id]/EditStaffForm.tsx`
- Modify: `app/src/lib/db/staff.ts` (getStaff 追加)
- Modify: `app/src/app/admin/staff/page.tsx` (各行に「詳細」リンク追加)
- Test: `app/tests/db/staff.test.ts` (getStaff + updateStaff のうち未テストケース追加)

### Step 2-1: getStaff(id) を `lib/db/staff.ts` に追加

```typescript
export async function getStaff(actor: Actor, id: string): Promise<Staff | null> {
  assertAdmin(actor);
  const db = createServiceClient();
  const { data, error } = await db
    .from("staff")
    .select("id, name, line_user_id, email, staff_assignments(property_id)")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    name: data.name as string,
    line_user_id: data.line_user_id as string | null,
    email: data.email as string | null,
    property_ids: ((data.staff_assignments as { property_id: string }[]) ?? []).map((a) => a.property_id),
  };
}
```

### Step 2-2: staff.test.ts に getStaff test 追加

```typescript
it("getStaff: 既存スタッフを property_ids 込みで返す", async () => {
  const prop = await createProperty(adminActor, { owner_id: ownerId, name: "P1" });
  const created = await createStaff(adminActor, { name: "山田" }, [prop.id]);
  const fetched = await getStaff(adminActor, created.id);
  expect(fetched?.property_ids).toEqual([prop.id]);
});

it("getStaff: 存在しないIDは null", async () => {
  const fetched = await getStaff(adminActor, "00000000-0000-0000-0000-000000000000");
  expect(fetched).toBeNull();
});

it("updateStaff: LINE ID と property_ids を更新", async () => {
  const p1 = await createProperty(adminActor, { owner_id: ownerId, name: "P1" });
  const p2 = await createProperty(adminActor, { owner_id: ownerId, name: "P2" });
  const created = await createStaff(adminActor, { name: "佐藤" }, [p1.id]);
  await updateStaff(adminActor, created.id, { line_user_id: "Uabc" }, [p2.id]);
  const fetched = await getStaff(adminActor, created.id);
  expect(fetched?.line_user_id).toBe("Uabc");
  expect(fetched?.property_ids).toEqual([p2.id]);
});
```

### Step 2-3: EditStaffForm.tsx 実装

クライアントコンポーネント。フォーム項目: name, email, line_user_id, property_ids (checkbox list)
PATCH `/api/admin/staff` body: `{ id, name, email, line_user_id, property_ids }`

削除ボタンも: DELETE `/api/admin/staff?id=<id>` 確認 alert あり。`archiveStaff` で StaffArchiveBlockedError は 409 で返るので、エラー時は表示。

### Step 2-4: app/admin/staff/[id]/page.tsx 実装

サーバーコンポーネント:
- `getStaff(actor, params.id)` で取得（null なら notFound）
- `listProperties(actor)` で割当候補物件取得
- `<EditStaffForm staff={staff} properties={properties}>`
- `getActiveToken({ type: "staff", staffId: id })`
- `<TokenControls>` 再利用

### Step 2-5: staff/page.tsx の各 li に「詳細」リンク追加

```tsx
<Link href={`/admin/staff/${s.id}`} className="underline">{s.name}</Link>
```

### Step 2-6: 全テスト実行 + tsc

```bash
npm test -- tests/db/staff.test.ts
npx tsc --noEmit
```

### Step 2-7: Commit

```bash
git add app/src/lib/db/staff.ts \
  app/src/app/admin/staff/page.tsx \
  app/src/app/admin/staff/[id]/page.tsx \
  app/src/app/admin/staff/[id]/EditStaffForm.tsx \
  app/tests/db/staff.test.ts
git commit -m "feat(minpaku): スタッフ詳細・編集ページ実装

- getStaff(id) を DB 層に追加
- /admin/staff/[id] で詳細表示・LINE ID 編集・担当物件編集・削除
- 一覧画面から詳細ページへ遷移可能に

Critical UI gap #3 を解消。"
```

---

## Task 3: 検収シナリオ書き直し + ガイド微調整

**Files:**
- Modify: `outputs/clients/minpaku-cleaning/handoff/client-facing/04-acceptance-test.md`
- Modify: `outputs/clients/minpaku-cleaning/handoff/client-facing/01-admin-guide.md` (編集動線追記)

### Step 3-1: 04-acceptance-test.md を実装に合わせて書き直し

修正点:
- 物件作成: 「定員4」削除（capacity 列存在しない）
- A-3 オーナー登録 → 物件作成順序を明示（"オーナーを先に登録" の前提を入れる）
- A-3 物件詳細ページ動線追加（物件一覧 → 物件名クリックで詳細 → そこからスタッフ確認）
- A-4 スタッフ作成時の「担当物件」チェックボックスの存在を明記
- A-5 スタッフトークン発行は一覧画面の TokenControls から
- A-5「LINE userId 登録」は **スタッフ詳細ページ** で行う動線に
- A-7 「スタッフへの通知」=「LINE が token 設定 or 友だち追加されてない場合はメール fallback」と明記
- 旧記述「テスト物件を開く → オーナーを割当」を「テスト物件詳細ページでオーナー再割当（必要なら）」に
- スタッフ作成時の「担当物件」未選択時の挙動と修正方法を補足（詳細ページで再割当可能）

### Step 3-2: 01-admin-guide.md に編集動線追記

§3「物件・オーナー・スタッフを登録する」配下に「**情報を変更する**」セクション 1 つ追加:

```markdown
### 登録した情報を変更する

物件・スタッフは一覧画面で**名前をクリック**すると詳細ページに移動し、編集できます。

- 物件詳細ページ: 名前・住所・アクセス情報・オーナー再割当・物件削除
- スタッフ詳細ページ: 名前・メール・LINE ID・担当物件・スタッフ削除

オーナー情報の変更が必要な場合は工藤陸へご連絡ください（管理画面では編集できません）。
```

### Step 3-3: Commit

```bash
git add outputs/clients/minpaku-cleaning/handoff/client-facing/04-acceptance-test.md \
  outputs/clients/minpaku-cleaning/handoff/client-facing/01-admin-guide.md
git commit -m "docs(handoff): 検収シナリオを Critical UI fix 後の実装に合わせて書き直し

- capacity 言及削除（設計書に列なし）
- 物件/スタッフ詳細ページ動線を反映
- LINE ID 登録動線をスタッフ詳細ページ経由に
- admin-guide に編集動線セクション追加"
```

---

## 検証（全 Task 完了後）

### Vercel デプロイ確認

```bash
git push origin main
```

Vercel 自動 deploy → Ready 待ち。

### 本番動作確認チェックリスト

- [ ] `/admin/properties` で各物件名がリンクになっていて、クリックで詳細ページに遷移
- [ ] 物件詳細ページで物件編集・オーナー再割当・削除ボタンが動作
- [ ] `/admin/staff` で各スタッフ名がリンクになっていて、クリックで詳細ページに遷移
- [ ] スタッフ詳細ページで LINE ID 編集・担当物件編集・削除ボタンが動作
- [ ] 担当物件を編集して保存後、依頼作成 → 該当スタッフにメール届く（既存スモークの再実行）
- [ ] 04-acceptance-test.md の動線が実装と一致

---

## スコープ外（Plan 5+ で対応）

- オーナー編集 UI（年に数回のため工藤代行で十分）
- スタッフ削除のソフト確認 dialog 強化（基本動作で十分）
- 物件のソフト確認 dialog 強化（同上）
- LINE userId 自動取得 webhook（手動運用継続）
