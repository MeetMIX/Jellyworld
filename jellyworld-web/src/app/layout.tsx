import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "../styles/globals.css";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JellyWorld",
  description: "Votre Media Hub Personnel",
};

// Navigation horizontale (NavBar) : chaque page fixe elle-même son espacement
// sous la barre (héros plein écran = pas de padding, nav flotte par-dessus ;
// pages de listing = padding-top calc(var(--jw-nav-height) + ...)). Pas de
// wrapper commun ici - cf. Sidebar.tsx (ancien layout, conserve pour rollback).
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={geist.variable}>
      <body style={{ margin: 0, padding: 0, background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
        {children}
      </body>
    </html>
  );
}
