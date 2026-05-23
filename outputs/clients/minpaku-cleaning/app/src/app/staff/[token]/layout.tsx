import { resolveActorByToken } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const actor = await resolveActorByToken(token);
  if (!actor || actor.role !== "staff") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-ink-50">
        <Card className="w-full max-w-sm p-8 text-center">
          <div className="h-12 w-12 rounded-2xl bg-st-cancelled-bg text-st-cancelled-text flex items-center justify-center mx-auto">
            <Icon name="TriangleAlert" size={22} />
          </div>
          <h1 className="text-[18px] font-bold text-ink-900 mt-4">このURLは無効です</h1>
          <p className="text-[12.5px] text-ink-500 mt-2">
            URLが正しいかご確認のうえ、管理者にお問い合わせください。
          </p>
        </Card>
      </main>
    );
  }
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-20 h-14 bg-white border-b border-ink-200 px-4 flex items-center gap-3">
        <div className="h-7 w-7 rounded-lg bg-brand-600 flex items-center justify-center text-white">
          <Icon name="Sparkles" size={14} />
        </div>
        <div className="leading-tight">
          <div className="font-display font-extrabold text-[14px] text-ink-900">StayClean</div>
          <div className="text-[10px] text-ink-500">Staff</div>
        </div>
        <div className="flex-1" />
        <Badge tone="brand">スタッフ</Badge>
      </header>
      <div className="max-w-2xl mx-auto p-4">{children}</div>
    </div>
  );
}
