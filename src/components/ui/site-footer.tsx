import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/agencies", label: "For Agencies" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/privacy#cookies", label: "Cookies" },
];

export function SiteFooter({ showCredit = true }: { showCredit?: boolean }) {
  const pathname = usePathname();

  const filtered = links.filter((l) => l.href !== pathname);

  return (
    <footer className="flex flex-col items-center gap-4 pb-12 pt-4 text-[13px] text-white/35">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
        {filtered.map((l, i) => (
          <span key={l.href} className="flex items-center gap-5">
            {i > 0 && <span className="text-white/15">·</span>}
            <a href={l.href} className="transition-colors hover:text-white/60">{l.label}</a>
          </span>
        ))}
      </div>
      {showCredit && (
        <span>
          Made by{" "}
          <a href="https://zoo.studio" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white/60">
            Zoo Studio
          </a>
        </span>
      )}
    </footer>
  );
}
