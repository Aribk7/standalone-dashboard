import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Backdrop } from "@/components/ui/Backdrop";
import { Toaster } from "@/components/ui/Toaster";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Loop Analytics", template: "%s · Loop Analytics" },
  description: "Your subscription analytics, powered by your 24F API key.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#060607",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh">
        <Backdrop />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
