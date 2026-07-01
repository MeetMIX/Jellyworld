'use client';

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { JellyfinLibrary } from "@/lib/jellyfin";

interface Session { userId: string; token: string; username: string; }

// Composant logo isolé — force les styles après hydration React
function JellyWorldLogo() {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Force appliqué après que React et Tailwind ont fini leur travail
    if (!imgRef.current) return;
    const el = imgRef.current;
    el.style.setProperty("height", "168px", "important");
    el.style.setProperty("width", "auto", "important");
    el.style.setProperty("min-height", "168px", "important");
    el.style.setProperty("max-height", "168px", "important");
    el.style.setProperty("max-width", "480px", "important");
    el.style.setProperty("object-fit", "contain", "important");
    el.style.setProperty("display", "block", "important");
    el.style.setProperty("flex-shrink", "0", "important");
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src="/logo.png"
      alt="JellyWorld"
      // Attribut HTML width/height = hint navigateur avant CSS
      width={480}
      height={168}
      style={{
        height: "68px",
        width: "auto",
        minHeight: "68px",
        maxHeight: "68px",
        maxWidth: "280px",
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
}

export default function NavBar({ libraries, session }: {
  libraries: JellyfinLibrary[];
  session?: Session | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showNavLinks, setShowNavLinks] = useState(true);
  const [showThumbs, setShowThumbs] = useState(true);
  const [hiddenLibs, setHiddenLibs] = useState<Set<string>>(new Set());

  useEffect(() => { if (searchOpen) inputRef.current?.focus(); }, [searchOpen]);

  // Réglages d'affichage — lus une fois au montage (localStorage n'existe pas
  // côté serveur, d'où l'état par défaut à true/vide pour matcher le rendu SSR).
  useEffect(() => {
    setShowNavLinks(localStorage.getItem("jw_show_nav_links") !== "0");
    setShowThumbs(localStorage.getItem("jw_show_library_thumbs") !== "0");
    try {
      const raw = localStorage.getItem("jw_hidden_libraries");
      setHiddenLibs(new Set(raw ? JSON.parse(raw) : []));
    } catch { setHiddenLibs(new Set()); }
  }, []);

  // Le dispatchEvent est différé (setTimeout 0) plutôt qu'appelé en synchrone :
  // un composant tiers (LibraryShowcase) écoute cet évènement et fait son
  // propre setState en réaction — si ça arrive pendant que React est encore
  // en train de committer le rendu de NavBar, React log un warning "Cannot
  // update a component while rendering a different component".
  function updateSetting(key: string, setter: (v: boolean) => void, value: boolean) {
    setter(value);
    localStorage.setItem(key, value ? "1" : "0");
    setTimeout(() => window.dispatchEvent(new Event("jw:settings-changed")), 0);
  }

  function toggleLibrary(id: string, checked: boolean) {
    // Calculé hors de l'updater setHiddenLibs — un updater React doit rester
    // pur (pas d'effet de bord comme localStorage/dispatchEvent dedans).
    const next = new Set(hiddenLibs);
    if (checked) next.delete(id); else next.add(id);
    setHiddenLibs(next);
    localStorage.setItem("jw_hidden_libraries", JSON.stringify([...next]));
    setTimeout(() => window.dispatchEvent(new Event("jw:settings-changed")), 0);
  }

  const visibleLibraries = libraries.filter(l => !hiddenLibs.has(l.Id));

  // Particules de la barre lumineuse — générées une fois, trajectoires/durées
  // randomisées pour un mouvement perpétuel qui ne se synchronise jamais.
  const glowParticles = useMemo(() => Array.from({ length: 4 }).map(() => ({
    width: 70 + Math.random() * 110,
    duration: 5 + Math.random() * 7,
    delay: Math.random() * 6,
    opacity: 0.55 + Math.random() * 0.45,
  })), []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false); setQuery("");
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login"); router.refresh();
  }

  return (
    <>
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "88px",
        display: "flex", alignItems: "center",
        padding: "0 32px",
        gap: 20,
        background: "rgba(7,6,11,0.96)",
        backdropFilter: "blur(20px)",
      }}>

        {/* ══ LOGO — div parent sans contrainte de hauteur ══ */}
        <Link href="/" style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          textDecoration: "none",
          // Pas de height ici pour ne pas contraindre l'image
        }}>
          <JellyWorldLogo />
        </Link>

        {/* Séparateur */}
        {!searchOpen && (
          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
        )}

        {/* Nav desktop */}
        {!searchOpen && showNavLinks && (
          <nav style={{
            display: "flex", alignItems: "center", gap: 20,
            flex: 1, flexWrap: "nowrap", // pas de scroll ni de retour à la ligne
          }}>
            {visibleLibraries.map(lib => (
              <Link key={lib.Id} href={`/${lib.Id}`} className="jw-nav-link" style={{
                fontSize: 13, fontWeight: pathname === `/${lib.Id}` ? 700 : 500,
                color: pathname === `/${lib.Id}` ? "#fff" : "rgba(255,255,255,0.50)",
                textDecoration: "none",
              }}>{lib.Name}</Link>
            ))}
          </nav>
        )}
        {/* Espaceur — garde les actions collées à droite quand les liens sont masqués */}
        {!searchOpen && !showNavLinks && <div style={{ flex: 1 }} />}

        {/* Recherche inline */}
        {searchOpen && (
          <form onSubmit={handleSearch} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher un film, une série…"
                style={{
                  width: "100%", padding: "10px 14px 10px 40px",
                  background: "var(--jw-card)", border: "1px solid var(--jw-border-strong)",
                  borderRadius: "var(--jw-r-md)", fontSize: 15,
                  color: "var(--jw-text-1)", outline: "none", boxSizing: "border-box",
                }}
              />
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.4, pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <button type="button" onClick={() => { setSearchOpen(false); setQuery(""); }}
              style={{ background: "none", border: "none", color: "var(--jw-text-2)", cursor: "pointer", fontSize: 13, padding: "6px 4px", whiteSpace: "nowrap" }}>
              Annuler
            </button>
          </form>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <button onClick={() => setSearchOpen(!searchOpen)} style={{
            width: 38, height: 38, borderRadius: 10, padding: 0,
            background: searchOpen ? "rgba(107,47,217,0.2)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${searchOpen ? "rgba(107,47,217,0.4)" : "rgba(255,255,255,0.10)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(255,255,255,0.6)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>

          {/* Hamburger menu pour les bibliothèques sur petits écrans */}
          {showNavLinks && (
            <button onClick={() => setMenuOpen(!menuOpen)} style={{
              width: 38, height: 38, borderRadius: 10, padding: 0,
              background: menuOpen ? "rgba(107,47,217,0.2)" : "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              display: "none", // caché sur desktop, visible via @media dans globals
              alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.6)",
            }} className="jw-hamburger">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          )}

          {/* Réglages d'affichage — liens navbar / vignettes bibliothèques */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setSettingsOpen(v => !v)} title="Réglages d'affichage" style={{
              width: 38, height: 38, borderRadius: 10, padding: 0,
              background: settingsOpen ? "rgba(107,47,217,0.2)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${settingsOpen ? "rgba(107,47,217,0.4)" : "rgba(255,255,255,0.10)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.6)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/>
                <line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/>
                <line x1="4" y1="18" x2="20" y2="18"/><circle cx="7" cy="18" r="2" fill="currentColor" stroke="none"/>
              </svg>
            </button>

            {settingsOpen && (
              <>
                <div onClick={() => setSettingsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 98 }} />
                <div style={{
                  position: "absolute", top: 46, right: 0, zIndex: 99, width: 270,
                  maxHeight: "70vh", overflowY: "auto",
                  background: "rgba(18,15,26,0.98)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, padding: 14, backdropFilter: "blur(16px)",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                  display: "flex", flexDirection: "column", gap: 12,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--jw-text-3)" }}>
                    Affichage
                  </span>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#fff", cursor: "pointer" }}>
                    <input type="checkbox" checked={showNavLinks}
                      onChange={e => updateSetting("jw_show_nav_links", setShowNavLinks, e.target.checked)} />
                    Liens des bibliothèques dans la barre
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#fff", cursor: "pointer" }}>
                    <input type="checkbox" checked={showThumbs}
                      onChange={e => updateSetting("jw_show_library_thumbs", setShowThumbs, e.target.checked)} />
                    Vignettes bibliothèques sur l'accueil
                  </label>

                  {libraries.length > 0 && (
                    <>
                      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "2px 0" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--jw-text-3)" }}>
                        Bibliothèques à afficher
                      </span>
                      {libraries.map(lib => (
                        <label key={lib.Id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#fff", cursor: "pointer" }}>
                          <input type="checkbox" checked={!hiddenLibs.has(lib.Id)}
                            onChange={e => toggleLibrary(lib.Id, e.target.checked)} />
                          {lib.Name}
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {session ? (
            <button onClick={logout} title={`${session.username} — Déconnexion`} style={{
              height: 38, borderRadius: 10, flexShrink: 0, boxSizing: "border-box",
              // Fond noir + contour dégradé (technique double-background
              // padding-box/border-box, un vrai gradient sur `border` n'existe pas en CSS).
              border: "4px solid transparent",
              backgroundColor: "#000",
              backgroundImage: "linear-gradient(#000,#000), linear-gradient(110deg, #6B2FD9 0%, #B83FA0 50%, #E03050 100%)",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
              display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
              fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", whiteSpace: "nowrap",
            }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                {session.username.charAt(0).toUpperCase()}
              </span>
              <span className="jw-username">{session.username}</span>
            </button>
          ) : (
            <Link href="/login" style={{ height: 38, borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 13, color: "#fff" }}>
              Connexion
            </Link>
          )}
        </div>
      </header>

      {/* Barre lumineuse — trait fin sous la navbar avec particules animées */}
      <div style={{
        position: "fixed", top: 88, left: 0, right: 0, height: 2, zIndex: 99,
        overflow: "hidden", background: "rgba(255,255,255,0.05)",
      }}>
        {glowParticles.map((p, i) => (
          <span key={i} className="jw-glow-particle" style={{
            width: p.width,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }} />
        ))}
      </div>

      {/* Menu mobile déroulant */}
      {menuOpen && showNavLinks && (
        <div style={{
          position: "fixed", top: 88, left: 0, right: 0, zIndex: 99,
          background: "rgba(7,6,11,0.98)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          padding: "12px 32px 16px",
          display: "flex", flexDirection: "column", gap: 0,
        }}>
          {visibleLibraries.map(lib => (
            <Link key={lib.Id} href={`/${lib.Id}`}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "12px 0",
                fontSize: 14, fontWeight: pathname === `/${lib.Id}` ? 700 : 500,
                color: pathname === `/${lib.Id}` ? "#fff" : "rgba(255,255,255,0.6)",
                textDecoration: "none",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>{lib.Name}</Link>
          ))}
        </div>
      )}

      {/* Styles responsive */}
      <style>{`
        /* Nav desktop : affiche tous les liens */
        @media (min-width: 1200px) {
          .jw-hamburger { display: none !important; }
        }
        /* Nav compressée : cache certains liens, affiche hamburger */
        @media (max-width: 1199px) {
          .jw-hamburger { display: flex !important; }
        }
        /* Très petit écran : cache le nom utilisateur */
        @media (max-width: 640px) {
          .jw-username { display: none !important; }
        }

        /* Barre lumineuse : particules en mouvement perpétuel et non-synchronisé */
        .jw-glow-particle {
          position: absolute;
          top: 0; left: -15%;
          height: 100%;
          background: linear-gradient(90deg, transparent, #A06EF0, #E03050, transparent);
          filter: blur(1.5px);
          border-radius: 2px;
          animation-name: jw-glow-travel;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes jw-glow-travel {
          0%   { left: -15%; opacity: 0; }
          10%  { opacity: 1; }
          30%  { left: 22%; }
          45%  { left: 13%; }
          62%  { left: 58%; }
          75%  { left: 42%; }
          90%  { opacity: 1; }
          100% { left: 112%; opacity: 0; }
        }

        /* Lien de bibliothèque : tronqué au repos, s'agrandit au survol pour
           révéler le nom complet, avec un fond pour rester lisible. */
        .jw-nav-link {
          position: relative;
          display: inline-block;
          max-width: 130px;
          min-width: 0;
          flex-shrink: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          vertical-align: middle;
          transform-origin: left center;
          transition: max-width 0.32s cubic-bezier(.2,.8,.2,1),
                      transform 0.32s cubic-bezier(.2,.8,.2,1),
                      color 0.2s ease;
        }
        .jw-nav-link:hover {
          max-width: 320px;
          overflow: visible;
          transform: scale(1.12);
          color: #fff !important;
          z-index: 5;
        }
        .jw-nav-link:hover::after {
          content: "";
          position: absolute;
          inset: -7px -12px;
          background: rgba(18,15,26,0.9);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          z-index: -1;
          backdrop-filter: blur(10px);
        }
      `}</style>
    </>
  );
}
