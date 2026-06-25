import { requireAdmin } from "@/lib/supabase";
import type { Platform, Category, PromptVariant } from "@/lib/types";

interface WeightEntry {
  z: number;
  n: number;
  expl: number;
}

export async function selectVariant(args: {
  platform: Platform;
  category: Category;
}): Promise<PromptVariant> {
  const sb = requireAdmin();

  const { data: variants } = await sb
    .from("prompt_variants")
    .select("*")
    .eq("platform", args.platform)
    .eq("active", true);

  if (!variants || variants.length === 0) {
    throw new Error(`no variants for platform=${args.platform}`);
  }

  const { data: weights } = await sb
    .from("variant_weights")
    .select("*")
    .eq("platform", args.platform)
    .eq("category", args.category);

  const weightMap = new Map<string, WeightEntry>(
    (weights ?? []).map((w) => [
      w.variant_id as string,
      {
        z: Number(w.avg_engagement_z ?? 0),
        n: w.n_observations as number,
        expl: Number(w.exploration_weight ?? 1.5),
      },
    ]),
  );

  // 期待値 = z * trust + expl * (1 - trust), trust = n / (n + 5)
  // n が小さい (cold start) ほど exploration を強める
  const scored = variants.map((v) => {
    const w = weightMap.get(v.variant_id as string);
    if (!w) return { variant: v, score: 1.5 };
    const trust = w.n / (w.n + 5);
    return { variant: v, score: w.z * trust + w.expl * (1 - trust) };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].variant as PromptVariant;
}
