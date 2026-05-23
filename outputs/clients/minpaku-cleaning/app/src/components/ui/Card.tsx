import type { ReactNode, HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
  children: ReactNode;
};

export function Card({
  className = "",
  hoverable = false,
  children,
  ...rest
}: CardProps) {
  const base = "bg-white rounded-xl ring-soft shadow-card";
  const hover = hoverable
    ? "transition-shadow duration-150 ease-out hover:shadow-card-hi cursor-pointer"
    : "";
  return (
    <div className={`${base} ${hover} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
