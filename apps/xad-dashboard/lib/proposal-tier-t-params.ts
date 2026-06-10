// SSOT: apps/x-account-system/lib/optimizer-apply/validation.ts TIER_T_PARAM_IDS のミラー。
// 変更時は両方同期すること（dashboard は x-account-system を import できないため）。
export const TIER_T_PARAM_IDS = [
  "posting_time_morning", "posting_time_noon", "posting_time_afternoon", "posting_time_evening", "posting_time_midnight",
  "hook_number_lead", "hook_negation_lead", "hook_question_lead", "hook_emotion_lead", "hook_authority_lead", "hook_promise_lead", "hook_other",
  "xfmt_short", "xfmt_medium", "xfmt_long", "xfmt_thread",
] as const;
