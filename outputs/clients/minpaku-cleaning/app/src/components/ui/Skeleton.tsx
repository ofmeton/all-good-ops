import type { HTMLAttributes } from "react";

/**
 * shimmer 付きグレーバー。loading.tsx などで使う。
 * 角丸はデフォルト rounded、必要なら className で上書き。
 */
export function Skeleton({
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`skeleton ${className}`} {...rest} />;
}
