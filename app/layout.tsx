import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";
import Image from 'next/image';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MySonic - Web3 Points Dashboard",
  description: "Track your points and see how you rank against other users",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white`}>
        <div className="flex h-full overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col h-full overflow-auto">
            {/* Top Header Bar */}
            <header className="sticky top-0 z-30 w-full bg-gradient-to-r from-gray-900/80 to-gray-800/80 border-b border-gray-800/60 px-8 py-4 flex items-center justify-between shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-3">
                <Image src="/globe.svg" alt="Logo" className="w-8 h-8" width={32} height={32} />
                <span className="text-2xl font-bold tracking-tight">Sonic <span className="text-orange-500">Points</span></span>
              </div>
              <div className="flex items-center gap-4">
                <button className="relative p-2 rounded-full hover:bg-gray-800/60">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500/60 to-orange-600/60 flex items-center justify-center text-white font-bold text-lg shadow-inner border-2 border-orange-400">A</div>
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
