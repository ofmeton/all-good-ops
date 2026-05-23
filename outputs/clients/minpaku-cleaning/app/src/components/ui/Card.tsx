import type { ReactNode, HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <div className={`bg-white rounded-xl ring-soft shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}
