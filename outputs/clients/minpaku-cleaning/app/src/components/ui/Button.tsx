import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type Size = "sm" | "md" | "lg" | "xl";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  children?: ReactNode;
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "bg-white text-ink-800 ring-1 ring-ink-200 hover:bg-ink-50",
  ghost: "text-ink-700 hover:bg-ink-100",
  danger: "bg-st-cancelled-bg text-st-cancelled-text hover:bg-red-100",
  dark: "bg-ink-900 text-white hover:bg-ink-800",
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
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors select-none whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed";
  const iconSize = size === "xl" ? 18 : size === "lg" ? 16 : 14;
  return (
    <button className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
}
