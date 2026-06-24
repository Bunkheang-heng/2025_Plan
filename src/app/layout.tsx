import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components";
import AuthGate from "@/components/layout/AuthGate";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  title: "Super Assistent | Personal Productivity System",
  description: "Personal productivity system for Heng Bunkheang - Organize daily tasks, weekly goals, and monthly objectives.",
  keywords: ["productivity", "planner", "task management", "daily planning", "weekly planning", "monthly planning"],
  authors: [{ name: "Heng Bunkheang" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f6f4",
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
        <AuthProvider>
          <AuthGate />
          <Nav/>
          <main className="flex-1 md:pl-14 pt-0 bg-[#fafaf9] text-stone-900">
            {children}
          </main>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </AuthProvider>
      </body>
    </html>
  );
}
