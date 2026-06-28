import './globals.css';
import React from 'react';

export const metadata = {
  title: 'JellyWorld',
  description: 'Votre Media Hub Personnel',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="bg-[#07060b]">
      <body className="min-h-screen w-screen text-[#f1f5f9] font-sans antialiased m-0 p-0 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}