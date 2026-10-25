import Link from "next/link";
import { PurpleBackground } from "@/components/PurpleBackground";

const nav = [
  { href: "/practice", label: "练习" },
  { href: "/review", label: "复习" },
  { href: "/progress", label: "进度" },
  { href: "/settings", label: "设置" },
];

export function AppShell({
  children,
  title,
  subtitle,
  padBottom = false,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  padBottom?: boolean;
}) {
  return (
    <div className="relative min-h-screen text-[var(--text-primary)]">
      <PurpleBackground />
      <div
        className={`relative z-10 mx-auto flex min-h-screen w-full flex-col px-4 pt-6 md:px-8 ${padBottom ? "pb-36" : "pb-8"}`}
      >
        <header className="mb-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link
              href="/"
              className="text-sm font-medium tracking-wide text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              GoBackToHomeIELTS
            </Link>
            <nav className="flex flex-wrap justify-end gap-1.5 text-xs">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md border border-[var(--border-quiet)] px-2.5 py-1 text-[var(--text-secondary)] transition hover:border-[var(--glow-soft)] hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <h1 className="text-xl font-semibold leading-snug">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {subtitle}
            </p>
          ) : null}
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
