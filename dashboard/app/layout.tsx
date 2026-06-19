import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import "./globals.css";

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
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
