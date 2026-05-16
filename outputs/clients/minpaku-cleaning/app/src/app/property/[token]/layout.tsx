import { resolveActorByToken } from "@/lib/auth";

export default async function OwnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "owner") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm text-center space-y-2">
          <h1 className="text-lg font-bold">このURLは無効です</h1>
          <p className="text-sm text-gray-500">
            URLが正しいかご確認のうえ、管理者にお問い合わせください。
          </p>
        </div>
      </main>
    );
  }
  return (
    <div className="min-h-screen">
      <header className="border-b px-4 py-3">
        <span className="text-sm font-bold">物件オーナー閲覧画面</span>
      </header>
      <div className="p-4">{children}</div>
    </div>
  );
}
