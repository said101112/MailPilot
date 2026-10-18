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
        <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
          <Navbar />
          <main className="flex min-h-screen min-w-0 w-full max-w-full flex-1 flex-col bg-[var(--editorial-background)] pt-14 lg:pt-0 overflow-x-hidden">
            <AppHeader />
            <div className="min-w-0 w-full max-w-full flex-1 overflow-x-hidden">{children}</div>
          </main>
        </div>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
