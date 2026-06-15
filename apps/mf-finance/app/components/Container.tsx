export function Container({
  variant = "wide",
  children,
}: {
  variant?: "wide" | "readable";
  children: React.ReactNode;
}) {
  const className =
    variant === "readable"
      ? "mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8"
      : "mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8";

  return <div className={className}>{children}</div>;
}
