import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Essos Concierge — Operations",
  description:
    "Single pane of glass for the Essos AI health-tourism concierge: conversations, escalations, and agent telemetry.",
};

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/conversations", label: "Conversations" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <aside className="hidden w-60 shrink-0 flex-col border-r border-secondary/60 bg-card px-5 py-6 md:flex">
            <Link href="/" className="serif text-2xl tracking-tight">
              Essos
            </Link>
            <p className="mt-1 text-xs text-muted">Concierge operations</p>
            <nav className="mt-8 flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-ink/80 transition hover:bg-surface hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto text-[11px] leading-relaxed text-muted">
              Notional demo data. Read/writes hit the shared local SQLite store.
            </div>
          </aside>
          <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
