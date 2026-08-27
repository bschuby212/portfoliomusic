import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
];

export function SiteNav({ current }: { current: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#f7f6f3]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
        <Link href="/" className="text-sm font-medium tracking-tight text-neutral-900">
          Blake Schubert
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                current === link.href
                  ? "text-neutral-900"
                  : "text-neutral-500 transition-colors hover:text-neutral-900"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
