import { icons, type LucideIcon } from "lucide-react";

export type IconName = keyof typeof icons;

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 18, className = "", strokeWidth = 2 }: IconProps) {
  const LucideComp = icons[name] as LucideIcon | undefined;
  if (!LucideComp) return null;
  return (
    <LucideComp
      size={size}
      strokeWidth={strokeWidth}
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
}
