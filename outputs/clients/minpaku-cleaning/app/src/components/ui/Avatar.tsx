type AvatarProps = {
  name?: string;
  color?: string; // tailwind bg class, default brand-600
  size?: number;
  className?: string;
};

export function Avatar({
  name = "?",
  color = "bg-brand-600",
  size = 28,
  className = "",
}: AvatarProps) {
  const initials = (name || "?").trim().slice(0, 2);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-white font-semibold ${color} ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
    >
      {initials}
    </span>
  );
}
