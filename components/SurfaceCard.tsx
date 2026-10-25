export function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-[var(--border-quiet)] bg-[var(--bg-surface)] p-4 backdrop-blur-sm ${className}`}
    >
      {children}
    </section>
  );
}
