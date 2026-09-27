interface PagePlaceholderProps {
  title: string;
  milestone: string;
}

/**
 * Generic "not built yet" placeholder for scaffolded routes (T-0002). Replaced
 * screen by screen as each milestone implements the real UI.
 */
export function PagePlaceholder({ title, milestone }: PagePlaceholderProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">Coming in {milestone}</p>
    </div>
  );
}
