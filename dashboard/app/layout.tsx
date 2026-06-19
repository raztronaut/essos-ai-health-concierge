import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/layout/sidebar";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

/** UI sans typeface, exposed to the token system as --font-inter. */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
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
    <html className={inter.variable} lang="en">
      <body>
        <ConvexClientProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1 overflow-x-hidden px-6 py-8 md:px-10">
              <div className="mx-auto w-full max-w-[var(--w-content)]">
                {children}
              </div>
            </main>
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
