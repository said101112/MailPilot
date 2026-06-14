import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextStep Apply | Job Application Automation",
  description: "Automate your job applications with single forms or bulk CSV uploads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        suppressHydrationWarning
        className={`${inter.className} bg-[#0A0F1C] text-[#F9FAFB] min-h-screen antialiased`}
      >
        <div className="flex min-h-screen relative">
          <Navbar />
          <main className="flex-1 h-screen overflow-y-auto relative z-10 pt-[57px] md:pt-0">
            {children}
          </main>
        </div>
        <Toaster position="bottom-right" theme="dark" richColors />
      </body>
    </html>
  );
}
