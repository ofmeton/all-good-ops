import { resolveActorByToken } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

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
      <main className="min-h-screen flex items-center justify-center p-4 bg-ink-50">
        <Card className="w-full max-w-sm p-8 text-center">
          <div className="h-12 w-12 rounded-2xl bg-st-cancelled-bg text-st-cancelled-text flex items-center justify-center mx-auto">
            <Icon name="TriangleAlert" size={22} />
          </div>
          <h1 className="text-[18px] font-bold text-ink-900 mt-4">このURLは無効です</h1>
          <p className="text-[12.5px] text-ink-500 mt-2">
            URLが正しいかご確認のうえ、清掃管理業者にお問い合わせください。
          </p>
        </Card>
      </main>
    );
  }
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="h-14 px-6 bg-white border-b border-ink-200 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
          <Icon name="Sparkles" size={16} />
        </div>
        <div className="font-display font-extrabold text-[15px]">StayClean</div>
        <Badge tone="neutral">オーナー閲覧モード</Badge>
        <div className="flex-1" />
        <Avatar name="O" color="bg-ink-700" size={28} />
      </header>
      <div className="max-w-5xl mx-auto p-4 sm:p-6">{children}</div>
    </div>
  );
}
