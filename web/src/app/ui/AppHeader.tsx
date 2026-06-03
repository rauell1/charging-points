import Link from "next/link";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/hubs", label: "Roam Hubs" },
  { href: "/points", label: "Roam Points" },
  { href: "/settings", label: "Settings" },
] as const;

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-black/5 bg-background/80 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-brand" aria-hidden="true" />
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Roam Infrastructure Tracker
          </Link>
        </div>
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

