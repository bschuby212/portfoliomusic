import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { PillNav } from "@/components/nav/PillNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blake Schubert",
  description: "Portfolio with a persistent music player.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#f7f6f3] font-sans text-neutral-900">
        <PillNav />
        {children}
      </body>
    </html>
  );
}
