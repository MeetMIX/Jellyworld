import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JellyWorld",
  description: "Votre Media Hub Personnel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* On vire le "flex flex-col" qui écrasait toute la mise en page absolue du lecteur */}
      <body className="min-h-full bg-[#07060b] m-0 p-0 text-[#f1f5f9]">
        {children}
      </body>
    </html>
  );
}