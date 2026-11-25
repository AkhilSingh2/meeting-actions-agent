"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

const links = [
  { href: "/", label: "New" },
  { href: "/history", label: "History" },
  { href: "/evals", label: "Evals" },
  { href: "/guide", label: "Guide" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <a className="q-skip" href="#content">
        Skip to content
      </a>
      <div className="q-bar">
        <header className="q-header">
          <Link href="/" className="q-brand">
            <Mark />
            Quorum
          </Link>
          <nav aria-label="Primary">
            <div className="q-nav">
              {links.map((link) => {
                const current = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>
          <ThemeToggle />
        </header>
      </div>
      <main id="content" className="q-main">
        {children}
      </main>
      <footer className="q-footer">
        <p>Demo mode keeps transcripts in this browser. Models and ticket APIs stay off until you configure them.</p>
      </footer>
    </>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#1c1916" />
      <path d="M9 23V9h2.4v11.4H22V23H9z" fill="#f6f1e8" />
      <circle cx="21.5" cy="12" r="3.2" fill="#e08a5d" />
    </svg>
  );
}
