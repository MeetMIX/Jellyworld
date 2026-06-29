import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "../styles/globals.css";
import { getSession } from "@/lib/auth";
import { getUserLibraries, getFirstUserId } from "@/lib/jellyfin";
import Sidebar from "@/components/Sidebar/Sidebar";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JellyWorld",
  description: "Votre Media Hub Personnel",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let libraries: any[] = [];

  if (session) {
    try {
      libraries = await getUserLibraries(session.userId);
    } catch {}
  }

  const isLoginPage = false; // middleware gère la redirection

  return (
    <html lang="fr" className={geist.variable}>
      <body style={{ margin: 0, padding: 0, background: "var(--jw-bg)", color: "var(--jw-text-1)" }}>
        {session ? (
          <div style={{ display: "flex", minHeight: "100vh" }}>
            {/* Sidebar fixe */}
            <Sidebar libraries={libraries} session={session} />
            {/* Contenu principal — marge gauche pour la sidebar */}
            <main
              id="jw-main"
              style={{
                flex: 1,
                minWidth: 0,
                marginLeft: "240px", // sync avec sidebar width
                transition: "margin-left 250ms ease",
              }}
              className="jw-main-content"
            >
              {children}
            </main>
          </div>
        ) : (
          <>{children}</>
        )}
        <style>{`
          @media (max-width: 768px) {
            .jw-main-content { margin-left: 0 !important; padding-top: 64px; }
          }
        `}</style>
      </body>
    </html>
  );
}
