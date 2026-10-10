import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import AppHeader from "@/components/AppHeader";
import Navbar from "@/components/Navbar";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: `${APP_NAME} | Premium Automation Workspace`,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        suppressHydrationWarning
        className={`${inter.variable} min-h-screen bg-[var(--editorial-background)] antialiased`}
      >
        <div className="flex min-h-screen">
          <Navbar />
          <main className="flex min-h-screen min-w-0 flex-1 flex-col bg-[var(--editorial-background)]">
            <AppHeader />
            <div className="min-w-0 flex-1">{children}</div>
          </main>
        </div>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
