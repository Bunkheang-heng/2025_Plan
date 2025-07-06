import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav, Footer } from "@/components";
import 'regenerator-runtime/runtime';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Heng Bunkheang's Planner | Daily, Weekly & Monthly Planning",
  description: "Personal productivity planner for Heng Bunkheang - Organize daily tasks, weekly goals, and monthly objectives with an elegant dark-themed interface.",
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
        <main className="flex-1 pt-20">
          {children}
        </main>
        <Footer/>
      </body>
    </html>
  );
}
