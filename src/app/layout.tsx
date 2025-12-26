import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: "Heng Bunkheang's Planner | Daily, Weekly & Monthly Planning",
  description: "Personal productivity planner for Heng Bunkheang - Organize daily tasks, weekly goals, and monthly objectives with an elegant dark-themed interface.",
  keywords: ["productivity", "planner", "task management", "daily planning", "weekly planning", "monthly planning"],
  authors: [{ name: "Heng Bunkheang" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Nav/>
        <main className="flex-1 md:pl-72 pt-0">
          {children}
        </main>
      </body>
    </html>
  );
}
