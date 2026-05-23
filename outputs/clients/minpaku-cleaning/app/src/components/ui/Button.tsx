import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type Size = "sm" | "md" | "lg" | "xl";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  children?: ReactNode;
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 hover:shadow-card focus-visible:ring-brand-500/40",
  secondary:
    "bg-white text-ink-800 ring-1 ring-ink-200 hover:bg-ink-50 hover:ring-ink-300 focus-visible:ring-brand-500/40",
  ghost:
    "text-ink-700 hover:bg-ink-100 hover:text-ink-900 focus-visible:ring-ink-300",
  danger:
    "bg-st-cancelled-bg text-st-cancelled-text hover:bg-red-100 focus-visible:ring-st-cancelled-dot/40",
  dark: "bg-ink-900 text-white hover:bg-ink-800 hover:shadow-card focus-visible:ring-ink-400",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[12px]",
  md: "h-9 px-3.5 text-[13px]",
  lg: "h-11 px-5 text-[14px]",
  xl: "h-14 px-6 text-[16px] rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading = false,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-1.5 font-medium rounded-lg select-none whitespace-nowrap " +
    "transition-[background-color,color,box-shadow,transform,opacity] duration-150 ease-out " +
    "cursor-pointer active:scale-[0.98] " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-white " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  const iconSize = size === "xl" ? 18 : size === "lg" ? 16 : 14;
  const isDisabled = disabled || loading;
  return (
    <button
      className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Loader2
          size={iconSize}
          className="inline-block shrink-0 animate-spin"
          aria-hidden="true"
        />
      ) : (
        icon && <Icon name={icon} size={iconSize} />
      )}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
}
