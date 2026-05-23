import type { ReactNode } from "react";

type Tone = "brand" | "neutral" | "dark" | "success" | "warn" | "danger";

type BadgeProps = {
  tone?: Tone;
  className?: string;
  children: ReactNode;
};

const TONES: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700",
  neutral: "bg-ink-100 text-ink-700",
  dark: "bg-ink-900 text-white",
  success: "bg-st-confirmed-bg text-st-confirmed-text",
  warn: "bg-st-warn-bg text-st-warn-text",
  danger: "bg-st-cancelled-bg text-st-cancelled-text",
};

export function Badge({ tone = "brand", className = "", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center h-5 px-2 rounded-md text-[10.5px] font-semibold tracking-wide whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
