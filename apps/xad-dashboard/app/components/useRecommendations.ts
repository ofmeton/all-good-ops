"use client";
import { useCallback, useState } from "react";
import {
  modeOf,
  type Recommendation,
  type RecommendMaterialInput,
} from "@/lib/curation-formats";

/**
 * useRecommendations — AI 推薦 fetch の共通フック（CurationClient から抽出）。
 *
 * `/api/curation/recommend` を叩く。worker hang 対策で timeout 25s・fail-open
 * （取得失敗でも error state を返すだけで throw しない＝最終決定は人）。
 * キュレーションダイアログ（要件1）と承認の修正依頼ダイアログ（要件5）で共用する。
 *
 * 注意: 既存 CurationClient の挙動と完全一致させること（drift 禁止）。
 *   - timeout 25s / AbortError 文言 / recs 0 件時の error 文言。
 */
export const RECOMMEND_TIMEOUT_MS = 25_000;

export interface UseRecommendationsResult {
  recommendations: Recommendation[];
  loading: boolean;
  error: string | null;
  /** 推薦を取得し、成功時は最頻 templateId/fmat を返す（pre-fill 用）。
   *  payload が空（本文のある素材なし）なら error をセットし null を返す。 */
  run: (
    materials: RecommendMaterialInput[],
  ) => Promise<{ templateId: string; fmat: string } | null>;
  /** 結果をリセット（ダイアログ open のたびに前回値の残留を防ぐ）。 */
  reset: () => void;
}

export function useRecommendations(): UseRecommendationsResult {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setRecommendations([]);
    setError(null);
  }, []);

  const run = useCallback(
    async (
      materials: RecommendMaterialInput[],
    ): Promise<{ templateId: string; fmat: string } | null> => {
      const payload = (materials ?? []).filter((m) => (m.text ?? "").trim().length > 0);
      if (payload.length === 0) {
        setError("本文のある素材が選択されていません");
        return null;
      }
      setLoading(true);
      setError(null);
      // worker hang で「推薦中…」のまま固まらないよう timeout で打ち切る。
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), RECOMMEND_TIMEOUT_MS);
      try {
        const res = await fetch("/api/curation/recommend", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ materials: payload }),
          signal: ctrl.signal,
        });
        const body = (await res.json().catch(() => ({}))) as {
          recommendations?: Recommendation[];
        };
        const recs = Array.isArray(body.recommendations) ? body.recommendations : [];
        setRecommendations(recs);
        if (recs.length === 0) {
          setError("推薦を取得できませんでした（既定のまま送信できます）");
          return null;
        }
        return modeOf(recs);
      } catch (e) {
        const msg =
          (e as Error)?.name === "AbortError"
            ? "推薦がタイムアウトしました（既定のまま送信できます）"
            : `推薦の取得に失敗しました: ${(e as Error).message}`;
        setError(msg);
        return null;
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    },
    [],
  );

  return { recommendations, loading, error, run, reset };
}
