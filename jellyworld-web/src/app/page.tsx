import React from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const JELLYFIN_URL = "http://192.168.220.148:8096";
const JELLYFIN_TOKEN = "0111461657f84b4384c8fe7afe4a50de";

async function getFirstUserId() {
  const url = `${JELLYFIN_URL}/Users`;
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`, 'Accept': 'application/json' }, cache: 'no-store' });
    if (!res.ok) return null;
    const users = await res.json();
    return users[0]?.Id || null;
  } catch { return null; }
}

async function getUserLibraries(userId: string) {
  const url = `${JELLYFIN_URL}/Users/${userId}/Views`;
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`, 'Accept': 'application/json' }, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  } catch { return []; }
}

async function getMoviesByLibrary(parentId: string, userId: string) {
  const url = `${JELLYFIN_URL}/Users/${userId}/Items?ParentId=${parentId}&IncludeItemTypes=Movie,BoxSet&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags,Overview&Limit=14`;
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`, 'Accept': 'application/json' }, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    
    return (data.Items || []).map((item: any) => ({
      ...item,
      computedImageUrl: `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${JELLYFIN_TOKEN}`,
      backdropUrl: `${JELLYFIN_URL}/Items/${item.Id}/Images/Backdrop?api_key=${JELLYFIN_TOKEN}`
    }));
  } catch { return []; }
}

export default async function Home() {
  const userId = await getFirstUserId();
  if (!userId) return <div className="text-white p-8">Backend Jellyfin Introuvable</div>;

  const libraries = await getUserLibraries(userId);
  const librariesWithMovies = await Promise.all(
    libraries.map(async (lib: any) => {
      const movies = await getMoviesByLibrary(lib.Id, userId);
      return { Id: lib.Id, Name: lib.Name, movies: movies };
    })
  );

  const activeLibraries = librariesWithMovies.filter(lib => lib.movies.length > 0);
  const heroMovie = activeLibraries[0]?.movies[0];

  return (
    <div className="min-h-screen w-screen bg-[#07060b] text-[#f1f5f9] font-sans overflow-x-hidden relative antialiased selection:bg-purple-600/30">
      
      {/* 🌌 FLUID NEON BACKDROP GLOWS */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[400px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="absolute top-[15%] right-1/4 w-[600px] h-[350px] bg-pink-600/5 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* 🧭 NAVIGATION SUPÉRIEURE (MAQUETTE ALIGNMENT) */}
      <header className="h-24 px-8 md:px-16 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent fixed top-0 left-0 right-0 z-50 transition-all duration-300">
        <div className="flex items-center gap-12 flex-1">
          {/* Logo Officiel réaligné */}
          <Link href="/" className="flex items-center group shrink-0">
            <img src="/logo.png" alt="JellyWorld Logo" className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-102" />
          </Link>

          {/* Liens Centraux rétablis sans blocage Mobile/Desktop */}
          <nav className="flex items-center gap-8 text-[14px] font-light text-zinc-300/90 tracking-wide pl-4">
            {activeLibraries.map((lib) => (
              <Link key={lib.Id} href={`/${lib.Id}`} className="hover:text-white transition-colors duration-200 relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-purple-500 after:transition-all hover:after:w-full">
                {lib.Name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bloc Icônes Droite de la Maquette */}
        <div className="flex items-center gap-6 text-zinc-300 shrink-0">
          <button className="hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/5 duration-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
          
          <button className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-purple-500 to-pink-500 p-[1.5px] cursor-pointer hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
            <div className="w-full h-full bg-[#07060b] rounded-full flex items-center justify-center text-[10px] font-black text-white uppercase tracking-wider">
              A
            </div>
          </button>
        </div>
      </header>

      {/* 🎬 HERO BANNER INTEGRATION */}
      {heroMovie && (
        <section className="relative h-[85vh] w-full flex items-center px-8 md:px-16 overflow-hidden">
          {/* Masque dégradé 3 directions pour noyer le fond de la maquette */}
          <div className="absolute inset-0 z-0">
            <img 
              src={heroMovie.backdropUrl || heroMovie.computedImageUrl} 
              alt={heroMovie.Name} 
              className="w-full h-full object-cover object-center filter brightness-[0.5] contrast-[1.02]"
            />
            {/* Dégradé bas vers haut */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#07060b] via-[#07060b]/30 to-transparent" />
            {/* Dégradé gauche vers droite */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#07060b] via-transparent to-transparent" />
            {/* Dégradé haut vers bas (pour fondre la barre supérieure) */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
          </div>

          {/* Métadonnées du film */}
          <div className="relative z-10 max-w-3xl space-y-5 text-left mt-16">
            <span className="inline-flex text-[10px] font-black uppercase tracking-[0.25em] text-purple-400 bg-purple-500/10 px-3 py-1 rounded-md border border-purple-500/20 backdrop-blur-md">
              À la une sur JellyWorld
            </span>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase leading-none filter drop-shadow-md">
              {heroMovie.Name}
            </h2>
            <p className="text-xs md:text-sm text-zinc-400/90 line-clamp-3 leading-relaxed font-normal max-w-2xl drop-shadow">
              {heroMovie.Overview || "Aucune description disponible pour ce média. Cliquez sur détails pour en savoir plus."}
            </p>
            
            {/* Actions boutons style Maquette */}
            <div className="flex items-center gap-4 pt-3">
              <button className="flex items-center gap-2.5 bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 hover:opacity-95 text-white font-bold text-xs px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-purple-600/30 tracking-widest uppercase">
                <span>▶</span> Regarder Maintenant
              </button>
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold text-xs px-7 py-3.5 rounded-xl transition-all border border-white/5 tracking-widest uppercase backdrop-blur-md">
                ℹ️ Détails
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 🗂️ LOGIQUE DE RAILS DES BIBLIOTHÈQUES (ALIGNÉES) */}
      <div className="px-8 md:px-16 pb-32 space-y-14 relative z-20 -mt-16">
        {activeLibraries.map((lib) => (
          <section key={lib.Id} className="space-y-5 text-left">
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
              <h3 className="text-xs font-black text-white tracking-[0.2em] uppercase bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                {lib.Name}
              </h3>
              <Link href={`/${lib.Id}`} className="text-[10px] font-black text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-widest">
                Voir tout →
              </Link>
            </div>

            {/* Liste horizontale */}
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {lib.movies.map((movie: any) => (
                <div key={movie.Id} className="w-[140px] md:w-[175px] shrink-0 group cursor-pointer flex flex-col">
                  <div className="aspect-[2/3] w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-900 group-hover:border-purple-500/50 transition-all duration-300 shadow-xl relative group-hover:-translate-y-1">
                    {movie.ImageTags?.Primary ? (
                      <img 
                        src={movie.computedImageUrl} 
                        alt={movie.Name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-800 text-xs font-bold">🎬 NO POSTER</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <p className="mt-3 text-[11px] font-bold truncate text-zinc-400 group-hover:text-white transition-colors tracking-wide pl-0.5">
                    {movie.Name}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

    </div>
  );
}