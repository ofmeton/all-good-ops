export type Classification =
  | "income"
  | "fixed"
  | "variable"
  | "transfer"
  | "internal";

export function inferClassification(categoryMajor: string): Classification {
  if (categoryMajor === "収入") return "income";
  if (categoryMajor === "振替" || categoryMajor === "現金・カード") {
    return "transfer";
  }
  if (
    ["住宅", "通信費", "保険", "税・社会保障", "水道・光熱費"].includes(
      categoryMajor,
    )
  ) {
    return "fixed";
  }
  return "variable";
}
