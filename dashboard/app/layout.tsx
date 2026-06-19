import type { Metadata } from "next";
import localFont from "next/font/local";
import { ConvexConnectionBanner } from "@/components/layout/convex-connection-banner";
import { Sidebar } from "@/components/layout/sidebar";
import { DemoIdentityProvider } from "@/features/demo/demo-identity";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

/**
 * ABC Repro — the Essos UI/body typeface. Loaded as a variable font so the
 * full weight axis is available, exposed to the token system as --font-repro.
 */
const repro = localFont({
  src: "../fonts/ABCReproVariableTrial.ttf",
  display: "swap",
  weight: "100 900",
  variable: "--font-repro",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
});

/** ABC Repro Mono — for code, IDs, and tabular/technical strings. */
const reproMono = localFont({
  src: "../fonts/ABCReproMonoVariableTrial.ttf",
  display: "swap",
  weight: "100 900",
  variable: "--font-repro-mono",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

/** PS Times — the Essos serif display face used for the masthead and headings. */
const psTimes = localFont({
  src: "../fonts/PSTimesTrial-Regular.woff2",
  display: "swap",
  weight: "400",
  variable: "--font-ps-times",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  title: "Essos Concierge — Operations",
  description:
    "Single pane of glass for the Essos AI health-tourism concierge: conversations, escalations, and agent telemetry.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      className={`${repro.variable} ${reproMono.variable} ${psTimes.variable}`}
      lang="en"
    >
      <body>
        <ConvexClientProvider>
          <DemoIdentityProvider>
            <ConvexConnectionBanner />
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="min-w-0 flex-1 overflow-x-hidden px-6 py-8 md:px-10">
                <div className="mx-auto w-full max-w-content">
                  {children}
                </div>
              </main>
            </div>
          </DemoIdentityProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
