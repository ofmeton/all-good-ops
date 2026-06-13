# StayClean バグ探索レポート (2026-06-06)

6次元 fan-out + 各findingを2レンズ敵対的検証 / 124エージェント。
**検出 59 → 確定 43 (critical 7 / high 17 / medium 18 / low 1) / 棄却 16**

## CRITICAL (7)

### CRITICAL IDOR: Staff can upload photos for any request ID ★全員一致
- **場所**: `src/app/api/staff/photos/route.ts:8-36` / 次元: auth-access
- **内容**: スタッフが任意のリクエスト ID で写真をアップロード可能。攻撃者は他のスタッフが担当する request ID を知っていれば、その request の写真をアップロードして、報告内容を改竄できます。
- **修正案**: uploadReportPhoto を呼ぶ前に、requestId がスタッフの担当物件に属する request であることを確認してください。例: await assertStaffAssignedToRequestProperty(db, actor.staffId, requestId); (requests.ts に既に実装あり)

### TOCTOU Race Condition in confirmRequest - Allows Double Confirmation ★全員一致
- **場所**: `src/lib/db/requests.ts:291-302` / 次元: business-logic
- **内容**: confirmRequest reads the status in a separate query, validates it with assertTransition, then updates without a conditional check. Between the SELECT and UPDATE, another request could change the status to 'confirmed', allowing duplicate confirmation and potentially notifying the owner twice.
- **修正案**: Use conditional UPDATE: `.update({...}).eq("id", requestId).eq("status", "reported")` to ensure status hasn't changed between read and write. This guarantees atomic state transition.

### TOCTOU Race Condition in cancelRequest - Allows Double Cancel ★全員一致
- **場所**: `src/lib/db/requests.ts:166-178` / 次元: business-logic
- **内容**: Similar to confirmRequest, cancelRequest reads status, validates it, but doesn't use conditional UPDATE. Another concurrent request could cancel the same cleaning request, leading to duplicate cancellation notifications or inconsistent state.
- **修正案**: Change to: `.update({status: "cancelled"}).eq("id", id).eq("status", req.status)` to prevent re-entry after state change.

### No Prevention of Double-Confirm on Already-Confirmed Requests ★全員一致
- **場所**: `src/lib/db/requests.ts:298-303` / 次元: business-logic
- **内容**: The assertTransition check at line 298 should reject confirmed→confirmed transitions (ALLOWED[confirmed]=[] at status-machine.ts:18), but if a second confirmRequest call comes in before the first UPDATE completes, both could pass validation and both could execute, sending duplicate owner notifications.
- **修正案**: Change confirmRequest update to: `.update({status: "confirmed"}).eq("id", requestId).eq("status", "reported")` - this guarantees that UPDATE only succeeds if status is still 'reported', preventing double confirmation.

### タイムゾーン計算ミス: JST と UTC の日付不整合 ★全員一致
- **場所**: `src/lib/db/notifications.ts:60-68` / 次元: notifications
- **内容**: hasSentToday() で `new Date()` を使用しており、サーバーのローカルタイムゾーンで日付を計算しています。Vercel サーバーが UTC で動作している場合、JST（UTC+9）での「当日」と実際の日付が9時間ずれます。同一 kind+recipient への重複送信チェックが機能しなくなり、冪等性が破綻します。
- **修正案**: UTC ベースで日付を計算すべき。例: const today = new Date(new Date().toISOString().split('T')[0]); または、Supabase での timezone 設定を統一し、JST での計算が必要なら Date-fns/day.js などライブラリを使用して明示的に timezone を指定してください。

### タイムゾーン計算ミス: tomorrowDateStr() で翌日の日付ずれリスク △検証割れ
- **場所**: `src/app/api/cron/remind/route.ts:9-12` / 次元: notifications
- **内容**: tomorrowDateStr() も `new Date()` でローカルタイムゾーンを使用しており、サーバーがUTCの場合は計算結果がずれます。コメントで「Cron は UTC 08:00 起動」と記載されていますが、その時点での JST 日付と一致するという仮定は脆弱です。サーバータイムゾーンが変更されたら冪等性が破綻します。
- **修正案**: UTC での日付計算に統一。例: const tomorrow = new Date(Date.now() + 24*3600*1000).toISOString().slice(0, 10); または、day.js/date-fns の timezone 機能を使用してください。

### Path traversal in uploadReportPhoto via unvalidated requestId ★全員一致
- **場所**: `src/lib/storage.ts:19` / 次元: storage-image
- **内容**: requestId parameter is directly interpolated into storage path without sanitization. An attacker could pass requestId like '../../malicious/path' to escape the intended directory structure and potentially overwrite or access arbitrary files in the bucket.
- **修正案**: Validate requestId to only contain alphanumeric characters, hyphens, and underscores. Use a whitelist pattern: /^[a-zA-Z0-9-]+$/ and reject any requestId containing path traversal sequences like '..' or '/'.

## HIGH (17)

### HIGH IDOR: Supply request allows arbitrary request_id without validation ★全員一致
- **場所**: `src/lib/db/supplies.ts:23-61` / 次元: auth-access
- **内容**: スタッフが備品補充依頼を作成する際、request_id オプションが検証されていません。スタッフが他の物件やスタッフの request ID を紐づけることで、不正なデータ関連付けが可能です。
- **修正案**: request_id が指定されている場合、以下を確認してください:
1. request が存在する
2. request の property_id が入力の property_id と一致する
3. request のステータスが有効な状態である
コード例: if (input.request_id) { const req = await db.from('cleaning_requests').select('property_id').eq('id', input.request_id).maybeSingle(); if (req?.property_id !== input.property_id) throw new Error(...); }

### Missing UUID validation on query string ID parameters △検証割れ
- **場所**: `src/app/api/admin/admins/route.ts:73` / 次元: api-routes
- **内容**: DELETE メソッドで query string から取得した id パラメータが UUID スキーマで検証されていない。無効な id が DB クエリに直接渡される可能性がある。
- **修正案**: z.string().uuid() スキーマで id をバリデーションする。例: const idSchema = z.object({ id: z.string().uuid() }); const parsed = idSchema.safeParse({ id }); if (!parsed.success) return ...

### Missing UUID validation on query string ID parameters (properties) ★全員一致
- **場所**: `src/app/api/admin/properties/route.ts:60` / 次元: api-routes
- **内容**: DELETE メソッドで query string から取得した id パラメータが UUID スキーマで検証されていない。
- **修正案**: z.string().uuid() スキーマで id をバリデーションする

### Missing UUID validation on query string ID parameters (staff) ★全員一致
- **場所**: `src/app/api/admin/staff/route.ts:61` / 次元: api-routes
- **内容**: DELETE メソッドで query string から取得した id パラメータが UUID スキーマで検証されていない。
- **修正案**: z.string().uuid() スキーマで id をバリデーションする

### Missing UUID validation on query string ID parameters (tokens) ★全員一致
- **場所**: `src/app/api/admin/tokens/route.ts:37` / 次元: api-routes
- **内容**: DELETE メソッドで query string から取得した id パラメータが UUID スキーマで検証されていない。
- **修正案**: z.string().uuid() スキーマで id をバリデーションする

### File upload missing size, MIME type, and count restrictions ★全員一致
- **場所**: `src/app/api/staff/photos/route.ts:8-35` / 次元: api-routes
- **内容**: 写真アップロードエンドポイントに対して：(1) ファイルサイズの上限制限がない、(2) MIME タイプチェックが不十分（file.type は改竄可能・実ファイル内容検証なし）、(3) 複数回アップロードを防止する制限がない、(4) requestId パラメータの UUID バリデーションがない。
- **修正案**: (1) MAX_FILE_SIZE（例10MB）で file.arrayBuffer() のサイズをチェック、(2) uploadReportPhoto() 内で sharp の metadata で実ファイルの Magic Numbers を確認、(3) per-request の photo count を制限、(4) requestId を z.string().uuid() で検証

### Missing UUID validation on dynamic route parameter [id] △検証割れ
- **場所**: `src/app/api/staff/requests/[id]/route.ts:36, 69` / 次元: api-routes
- **内容**: 動的ルートパラメータ id がスキーマで検証されていない。また、photoPaths の各要素、checklistResult の label も検証されていない。
- **修正案**: id を z.string().uuid() で検証。photoPaths の各要素をストレージパス形式で検証。checklistResult.label をホワイトリストで検証。

### TOCTOU Race Condition in assignRequest - Allows Invalid Re-assignments ★全員一致
- **場所**: `src/lib/db/requests.ts:241-258` / 次元: business-logic
- **内容**: assignRequest validates that status is unassigned or assigned (line 247-249), but the UPDATE at line 250-258 doesn't use a conditional check. This allows reassigning a request that has already moved to in_progress or beyond, potentially overwriting a legitimate assignment.
- **修正案**: Add condition to UPDATE: `.update({...}).eq("id", requestId).in("status", ["unassigned", "assigned"])` to prevent assigning requests outside the valid state range.

### TOCTOU Race Condition in startRequest - Allows Starting Unassigned Requests ★全員一致
- **場所**: `src/lib/db/requests.ts:268-282` / 次元: business-logic
- **内容**: startRequest reads status and assigned_staff_id in a separate query (line 268-271), validates them, but the UPDATE at line 278-281 doesn't include a conditional check on status. Another request could reassign or cancel before the UPDATE executes.
- **修正案**: Use conditional UPDATE: `.update({status: "in_progress"}).eq("id", requestId).eq("status", "assigned")` to ensure the request is still in assigned state when starting.

### Fragile Timezone Logic in Cron Reminder - Will Break on Schedule Change ★全員一致
- **場所**: `src/app/api/cron/remind/route.ts:9-13` / 次元: business-logic
- **内容**: The tomorrowDateStr() function uses UTC-based Date arithmetic (d.setDate(d.getDate() + 1)) instead of JST. The code comment admits it only works because Cron runs at UTC 08:00 which coincidentally matches JST date. If Cron schedule changes to any time before UTC 15:00, it will pick the wrong date and miss reminders for today's (JST) requests.
- **修正案**: Use JST-aware calculation like other cron routes: `new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date(Date.now() + 86400000))` to get tomorrow's date in JST regardless of system timezone.

### Missing Conditional Update in assignRequest Allows Idempotency Violation ★全員一致
- **場所**: `src/lib/db/requests.ts:250-258` / 次元: business-logic
- **内容**: Even with the status validation at line 247-249, the UPDATE succeeds unconditionally. If called twice with the same requestId and staffId, it will update twice, firing notifications twice and creating duplicate audit trails. The function should be idempotent.
- **修正案**: Check UPDATE result count or use conditional clause. Better: `.update({...}).eq("id", requestId).select("id")` and verify data.length === 1, OR add `.in("status", ["unassigned", "assigned"])` to enforce atomic transition.

### エラーメッセージに個人情報漏洩: email/LINE SDK の例外が payload に含まれる △検証割れ
- **場所**: `src/lib/notify.ts:66, 89` / 次元: notifications
- **内容**: notify.ts で LINE/Resend 送信失敗時に例外メッセージを payload に含めて notifications_log に記録しています。Resend や LINE SDK のエラーメッセージには email アドレスやユーザーID、リクエスト本文などの個人情報が含まれる可能性があります。notifications_log は無期限に保存されるため、個人情報漏洩のリスクが高い。
- **修正案**: エラーメッセージの個人情報をサニタイズしてから記録してください。例: error: (e as Error).message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+/g, '[REDACTED]') など、またはエラーコードのみを記録し、詳細ログは別の secure ログシステムに送ってください。

### リトライロジック欠落: 外部 API 失敗時に再試行なし △検証割れ
- **場所**: `src/lib/line.ts, src/lib/email.ts:line.ts 17-20, email.ts 16-19` / 次元: notifications
- **内容**: pushLineMessage() と sendMail() は外部 API 呼び出しに失敗した場合、即座に例外を throw しており、リトライロジックがありません。一時的なネットワーク障害や API のレート制限で通知が失敗した場合、ユーザーに通知が届きません。
- **修正案**: exponential backoff を用いたリトライロジックを実装してください。例: 1秒、3秒、10秒で最大3回リトライ、または専用のリトライライブラリ（p-retry など）を使用してください。

### Cron routes で DB エラー発生時の unhandled exception ★全員一致
- **場所**: `src/app/api/cron/remind/route.ts, src/app/api/cron/unassigned-alerts/route.ts:remind: 43-44, unassigned-alerts: 34-38` / 次元: notifications
- **内容**: resolveStaffRecipients() や resolveAllAdmins()、resolveOwnerForProperty() は DB エラー発生時に例外を throw します。Cron routes では try-catch されていないため、エラーが unhandled exception となり、Vercel が 5xx エラーで応答します。また、notify() も notifyOne() 内の例外を catch しますが、resolveStaffRecipients() は notify() の外で呼ばれるため、DB エラーはコントロールできません。
- **修正案**: Cron routes に try-catch を追加し、エラーを適切にハンドリングしてください。例: try { ... } catch (e) { console.error('cron error:', e); return NextResponse.json({ error: 'internal error', details: e.message }, { status: 500 }); }

### Orphaned Storage files accumulate due to silent error suppression △検証割れ
- **場所**: `src/app/api/cron/cleanup-photos/route.ts:28-32` / 次元: storage-image
- **内容**: Storage deletion errors are silently caught (catch block without re-throw), but DB rows are still deleted regardless. This causes orphaned files to accumulate indefinitely in Storage. The code acknowledges this but presents it as acceptable, creating unbounded storage growth.
- **修正案**: Implement atomic deletion: only delete DB row if Storage deletion succeeds. If Storage deletion fails, log the error and leave the DB row in a 'deletion_failed' state for retry. Alternatively, use a transaction-like pattern with rollback logic.

### Race condition: signed URLs remain valid after file deletion ★全員一致
- **場所**: `src/app/api/cron/cleanup-photos/route.ts:6-42` / 次元: storage-image
- **内容**: Photos are deleted from Storage when expires_at passes, but existing signed URLs (with default 5-minute expiry from getPhotoSignedUrl) can still reference deleted files. Users viewing photos may see broken images if the signed URL was issued before cleanup and the file is deleted before the URL expires.
- **修正案**: Coordinate expiration: ensure signed URL expiry (5 min default) is always shorter than the grace period before cleanup. Or implement a check in the signed URL generation to verify the file still exists before issuing URLs for near-expiration photos.

### requestId parameter not validated for path traversal in upload endpoint △検証割れ
- **場所**: `src/app/api/staff/photos/route.ts:11` / 次元: storage-image
- **内容**: requestId form parameter is accepted without validation and passed directly to uploadReportPhoto. Combined with the lack of validation in storage.ts, this allows path traversal attacks.
- **修正案**: Validate requestId with strict alphanumeric pattern: /^[a-zA-Z0-9-]+$/ before using it. Reject any requestId containing '.', '/', '\', or other special path characters.

## MEDIUM (18)

### MEDIUM: Timing attack vulnerability in cron authentication ★全員一致
- **場所**: `src/lib/cron-auth.ts:10` / 次元: auth-access
- **内容**: Cron secret の検証に === 演算子を使用しています。JavaScript の === は タイミング安全ではなく、攻撃者が応答時間を計測して CRON_SECRET をブルートフォースできる可能性があります。
- **修正案**: タイミング安全な比較関数を使用してください:
```
import { timingSafeEqual } from 'node:crypto';
export function isCronAuthenticated(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  const expected = `Bearer ${secret}`;
  if (!header || header.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch { return false; }
}
```

### MEDIUM: Access tokens have no expiration (unbounded lifetime) ★全員一致
- **場所**: `supabase/migrations/0001_initial_schema.sql:58-71` / 次元: auth-access
- **内容**: access_tokens テーブルに有効期限（expires_at）がありません。トークンは一度発行されると、revoke されない限り永遠に有効です。盗まれたトークンのリスク期間が無制限になります。
- **修正案**: access_tokens に expires_at カラムを追加し、token 生成時に有効期限を設定してください:

1. Migration: ALTER TABLE access_tokens ADD COLUMN expires_at timestamptz;

2. tokens.ts の issueToken/reissueToken で:
```
const expiresAt = new Date(Date.now() + 30*24*60*60*1000); // 30 days
await db.from('access_tokens').insert({ 
  token: tokenValue, 
  type, 
  expires_at: expiresAt.toISOString(),
  ...
});
```

3. auth.ts の resolveActorByToken で:
```
const now = new Date().toISOString();
if (!data || data.revoked_at || (data.expires_at && data.expires_at < now)) return null;
```

### MEDIUM: TOCTOU race condition in claimRequest ★全員一致
- **場所**: `src/lib/db/requests.ts:208-231` / 次元: auth-access
- **内容**: スタッフが request を claim する際、担当チェック と UPDATE が別のクエリです。著者自身がコメント（214-215行目）で TOCTOU を許容と述べていますが、潜在的な競合状態があります。複数スタッフが同時に同じリクエストを claim 試行した場合、条件付き UPDATE で 排他されますが、担当外スタッフが claim できる時間窓が存在します。
- **修正案**: Supabase RPC で join を含むトランザクションに変更するか、チェック＋UPDATE を単一クエリで実行してください:

1. RPC を使用:
```
CREATE FUNCTION claim_request(
  p_staff_id uuid,
  p_request_id uuid
) RETURNS boolean AS $$
BEGIN
  -- Check and update in single transaction
  UPDATE cleaning_requests r
  SET status = 'assigned', assigned_staff_id = p_staff_id
  WHERE r.id = p_request_id
    AND r.status = 'unassigned'
    AND EXISTS (SELECT 1 FROM staff_assignments WHERE staff_id = p_staff_id AND property_id = r.property_id);
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
```

2. または DB レベルの CHECK 制約・トリガーで担当チェック

### Overly Broad Column Selection in requests.ts △検証割れ
- **場所**: `src/lib/db/requests.ts:70, 84, 112, 339` / 次元: db-layer
- **内容**: Multiple query functions use select('*') or select() without column whitelist, exposing internal fields like created_by, updated_at, and updated_at timestamps that may not be necessary for callers.
- **修正案**: Whitelist columns: .select('id, property_id, checkin_date, checkout_date, guest_count, option_memo, status, assigned_staff_id, assignment_deadline'). Remove internal fields like created_by from returned data.

### Missing Owner Scope Check in Owner List Query △検証割れ
- **場所**: `src/lib/db/owners.ts:23-25` / 次元: db-layer
- **内容**: listOwners() returns all owner records without filtering by role or scope. If the system intends for different users to manage different owners, this query exposes all owners globally to any authenticated admin.
- **修正案**: Add RLS policy to filter owners by managed_by or organization_id at database level. At minimum, if all admins see all owners, document this behavior and consider if owner contact info (email/line_user_id) should be accessible to all admins.

### Missing input validation in login action ★全員一致
- **場所**: `src/app/admin/login/actions.ts:5-12` / 次元: api-routes
- **内容**: ログインアクションで email と password の入力が全く検証されていない。長さ制限なし、型チェックなし、レート制限なし。
- **修正案**: Zod で email と password をバリデーション。例: z.object({ email: z.string().email(), password: z.string().min(1).max(1024) }).safeParse()

### Unhandled exceptions leak sensitive error details △検証割れ
- **場所**: `src/app/api/admin/admins/route.ts:31, 48, 66, 83` / 次元: api-routes
- **内容**: 複数の API ルートで 'throw e' されている未処理の例外がある。これらは 500 エラーになり、スタックトレースや DB エラーメッセージが外部に漏える可能性がある。
- **修正案**: すべての例外を try-catch で捕捉し、500 エラーレスポンスで一般的なメッセージを返す。本番環境では詳細なエラー情報をログのみに記録する。

### Database error details exposed in cron endpoints ★全員一致
- **場所**: `src/app/api/cron/unassigned-alerts/route.ts:24` / 次元: api-routes
- **内容**: Cron エンドポイントが DB エラーメッセージをそのまま JSON で返すため、データベーススキーマやクエリ構造が漏れる可能性がある。
- **修正案**: 本番環境では詳細なエラーメッセージを隠し、一般的なメッセージのみを返す。詳細はログに記録。

### Database error details exposed in cleanup cron endpoint △検証割れ
- **場所**: `src/app/api/cron/cleanup-photos/route.ts:18` / 次元: api-routes
- **内容**: Cron エンドポイントが DB エラーメッセージをそのまま返す。
- **修正案**: 本番環境では詳細なエラーメッセージを隠す

### Potential KPI Miscounting - Filter on In-Memory List Without Verifying Latest State △検証割れ
- **場所**: `src/app/admin/page.tsx:72-76` / 次元: business-logic
- **内容**: The KPI counts (thisWeekCount, unassignedCount, reportedCount) are calculated by filtering the in-memory requests list loaded at page render time. If requests are updated during page load or immediately after, the displayed KPIs will be stale. No cache invalidation or real-time refresh ensures accuracy.
- **修正案**: Consider: (1) Add cache headers to force fresh data, (2) Use Next.js revalidation (revalidatePath), or (3) Implement real-time subscription if critical for business decisions. For now, document that KPIs are as-of page render time.

### env var 未設定時の動作が不明確: LINE/Resend の失敗がサイレント ★全員一致
- **場所**: `src/lib/notify.ts:48-70, 73-94` / 次元: notifications
- **内容**: LINE_CHANNEL_ACCESS_TOKEN や RESEND_API_KEY が未設定の場合、pushLineMessage() / sendMail() は例外を throw しますが、notify.ts で catch されて status='failed' で記録されます。通知が実際には送られていないことが、ログを確認するまで気づきにくい。特に本番環境で env var 設定を忘れた場合、通知機能が無言で失敗する可能性があります。
- **修正案**: アプリケーション起動時に env var をチェックし、必須な env var が未設定なら起動を中止してください。例: if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) throw new Error('Missing required env: LINE_CHANNEL_ACCESS_TOKEN'); または、通知機能が disabled mode に入る選択肢を提供してください。

### env var をローカル環境に平文保存: セキュリティリスク ★全員一致
- **場所**: `.env.local:2-3` / 次元: notifications
- **内容**: .env.local に LINE_CHANNEL_ACCESS_TOKEN と RESEND_API_KEY が平文で保存されています。ローカル開発環境で情報漏洩リスクがあります。git で無視されているはずですが、ノート PC の盗難やマルウェア感染時に認証情報が漏洩する可能性があります。
- **修正案**: .env.local を .gitignore に追加し、git で管理しないようにしてください（既にそうだと思われます）。本番環境では Vercel の env var 機能を使用し、ローカル開発時も .env.local ではなく、1password や Vercel CLI のシークレット機能を使用してください。

### 日付計算の仮定に依存: timezone 変更時に冪等性が破綻 △検証割れ
- **場所**: `src/app/api/cron/remind/route.ts:6-13` / 次元: notifications
- **内容**: tomorrowDateStr() のコメントで「Cron は UTC 08:00 起動（vercel.json）でその時点では UTC 日付と JST 日付が一致するため」という仮定に基づいています。しかし、夏時間の開始/終了やサーバーのタイムゾーン設定変更によってこの仮定が破綻する可能性があります。
- **修正案**: UTC 基準の明確な日付計算に統一し、コメントの条件付き動作を廃止してください。JST での計算が必要なら、day.js や date-fns で timezone='Asia/Tokyo' を明示的に指定してください。

### CRON_SECRET が未設定の場合、cron が常に 401 失敗 △検証割れ
- **場所**: `src/lib/cron-auth.ts:6-11` / 次元: notifications
- **内容**: isCronAuthenticated() は CRON_SECRET が未設定なら false を返すため、cron endpoint が常に 401 で応答します。意図的な設計（security by obscurity）と思われますが、env var 設定を忘れたときに cron が無言で失敗するリスクがあります。本来は起動時にチェックして明確なエラーを出すべき。
- **修正案**: アプリケーション起動時に CRON_SECRET をチェックし、未設定なら起動を中止してください。または、アラートをモニタリングして cron が定期的に失敗していることを検出する仕組みを追加してください。

### Client-provided Content-Type can be spoofed ★全員一致
- **場所**: `src/app/api/staff/photos/route.ts:20-21` / 次元: storage-image
- **内容**: file.type comes from the client and can be spoofed. The code uses it to determine output format (PNG vs JPEG) but doesn't validate the actual image format. A malicious client could claim a PNG while uploading a JPEG, or upload a non-image file with a fake Content-Type, wasting processing resources.
- **修正案**: Ignore client Content-Type and instead detect the actual image format using magic bytes or sharp's metadata(). Validate that the file is a valid image before processing. Reject non-image files.

### sharp failOn: 'none' silently ignores image processing errors ★全員一致
- **場所**: `src/lib/image.ts:12` / 次元: storage-image
- **内容**: failOn: 'none' configuration suppresses all sharp errors including invalid/corrupted images. A user uploading a malformed image will not receive an error, and the processing may produce invalid output. This makes debugging difficult and could result in corrupted images being stored.
- **修正案**: Remove failOn: 'none' or set to 'truncated'. Allow errors to propagate so users know if their image is invalid. Handle specific errors gracefully in the upload endpoint and return descriptive error messages.

### Supabase Storage RLS disabled with no compensating security △検証割れ
- **場所**: `supabase/migrations/0001_initial_schema.sql:2` / 次元: storage-image
- **内容**: RLS (Row Level Security) is intentionally disabled because authorization is performed at the app layer via resolveActor. However, this creates a risk: any misconfiguration in the app layer or unauthorized direct access to Supabase Storage bypasses all security. Additionally, if the bucket is misconfigured as public, all files are accessible to anyone.
- **修正案**: Enable RLS policies on the 'report_photos' table to prevent direct public access even if bucket is misconfigured. Create policies that only allow deletion/selection of photos owned by the authenticated user's property. Verify bucket is set to private (not public) in Supabase console.

### No atomic transaction between Storage and DB deletion ★全員一致
- **場所**: `src/app/api/cron/cleanup-photos/route.ts:24-34` / 次元: storage-image
- **内容**: Storage deletion and DB deletion are separate operations without transactional guarantees. If DB deletion fails after Storage deletion succeeds, the file is deleted but DB row remains, creating an inconsistent state. If a Storage error is silently caught and DB is deleted, orphaned files accumulate.
- **修正案**: Use transactional approach: wrap both deletions in logic that either commits both or rolls back both. Or use a two-phase delete pattern: mark photos as 'deletion_in_progress' in DB first, delete from Storage, only then commit DB deletion.

## LOW (1)

### Cleanup cron provides insufficient reporting for operational issues △検証割れ
- **場所**: `src/app/api/cron/cleanup-photos/route.ts:36-41` / 次元: storage-image
- **内容**: The cleanup response returns only counts (candidates, storageDeleted, dbDeleted) but doesn't report which files failed, why they failed, or how many orphaned files accumulated. This makes it impossible to detect and troubleshoot orphaned file growth.
- **修正案**: Enhance logging: return detailed failure information including which photos failed to delete and their error messages. Log orphaned files separately. Consider sending alerts if storageDeleted < dbDeleted (indicating orphaned files).

## 棄却 (誤検知・防御済み)

- low src/app/admin/requests/[id]/page.tsx:38 — LOW: Request detail pages don't enforce scope at admin level
- critical src/lib/supabase-server.ts:9 — RLS Complete Bypass via Service Role Key
- high src/lib/db/requests.ts:68-71 — Global Data Exposure via Unrestricted listRequests Query
- high src/lib/db/admins.ts:25-27 — Global Data Exposure via Unrestricted listAdmins Query
- medium src/lib/db/properties.ts:29, 41, 52 — Overly Broad Column Selection in properties.ts
- medium src/lib/db/reports.ts:69, 98, 105 — Overly Broad Column Selection in reports.ts
- medium src/lib/db/supplies.ts:44, 71 — Overly Broad Column Selection in supplies.ts and tokens.ts
- medium src/lib/db/tokens.ts:34, 58, 63 — Overly Broad Column Selection in tokens.ts
- medium src/lib/db/properties.ts:54 — Type Safety Issue with .single() and Null Data
- medium src/lib/db/notifications.ts:37-50 — Implicit Service Role Usage in Notification Logging
- high src/app/api/admin/requests/[id]/route.ts:24 — Missing UUID validation on dynamic route parameter [id]
- medium src/lib/db/requests.ts:274 — Null Handling Fragility in startRequest - assigned_staff_id Check
- medium src/lib/status-machine.ts:24-29 — Missing Status Validation in assertTransition - Invalid Enum Values Not Caught
- high src/lib/notify.ts:107-119, 29-104 — 複数受信者への並行送信で部分失敗時の状態不整合
- high src/app/api/staff/photos/route.ts:15-27 — No file size validation before sharp processing - DoS vulnerability
- medium src/lib/storage.ts:28-38 — Signed URL generation has no authorization/ownership check