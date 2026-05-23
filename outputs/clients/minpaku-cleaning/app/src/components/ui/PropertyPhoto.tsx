import { Icon } from "./Icon";

type Tone = "a" | "b" | "c" | "d" | "e" | "f";
type Size = "xs" | "sm" | "md" | "lg" | "xl";

type PropertyPhotoProps = {
  tone?: Tone;
  size?: Size;
  className?: string;
  rounded?: string;
};

const SIZES: Record<Size, string> = {
  xs: "h-10 w-10",
  sm: "h-12 w-12",
  md: "h-14 w-14",
  lg: "h-20 w-20",
  xl: "h-32 w-full",
};

export function PropertyPhoto({
  tone = "a",
  size = "md",
  className = "",
  rounded = "rounded-lg",
}: PropertyPhotoProps) {
  const iconSize = size === "xl" ? 32 : size === "lg" ? 24 : 18;
  return (
    <div
      className={`photo-${tone} ${SIZES[size]} ${rounded} flex items-center justify-center text-white/80 ${className}`}
    >
      <Icon name="House" size={iconSize} strokeWidth={1.6} />
    </div>
  );
}
