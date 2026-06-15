export function PageHeader({
  title,
  description,
  actions,
  subnav,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  subnav?: React.ReactNode;
}) {
  return (
    <header className="mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-xs text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {subnav ? <div className="mt-4">{subnav}</div> : null}
    </header>
  );
}
