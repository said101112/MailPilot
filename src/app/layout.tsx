import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import AppHeader from "@/components/AppHeader";
import Navbar from "@/components/Navbar";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";
import { BulkUploadProvider } from "@/context/BulkUploadContext";
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
    <html lang="fr" className="h-full">
      <body
        suppressHydrationWarning
        className={`${inter.variable} h-full overflow-hidden bg-[var(--editorial-background)] antialiased`}
      >
        <BulkUploadProvider>
          <div className="flex h-screen h-dvh w-full max-w-full overflow-hidden">
            <Navbar />
            <div className="flex h-full min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden bg-[var(--editorial-background)]">
              <AppHeader />
              <main className="min-w-0 w-full max-w-full flex-1 overflow-y-auto overflow-x-hidden pt-14 lg:pt-0">
                {children}
              </main>
            </div>
          </div>
          <Toaster position="bottom-right" richColors />
        </BulkUploadProvider>
      </body>
    </html>
  );
}
