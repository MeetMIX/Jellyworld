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
  
  // On sélectionne le premier film de la première catégorie pour la section "À la une" (Hero)
  const heroMovie = activeLibraries[0]?.movies[0];

  return (
    <div className="min-h-screen w-screen bg-[#060609] text-[#f1f5f9] font-sans overflow-x-hidden relative">
      
      {/* 🌌 EFFET DE LUMIÈRE D'ARRIÈRE-PLAN (NEON GLOW) */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none z-0" />
      <div className="absolute top-[20%] right-1/4 w-[500px] h-[300px] bg-pink-600/5 rounded-full blur-[130px] pointer-events-none z-0" />

      {/* 🧭 NAVIGATION SUPÉRIEURE (CONFORME À LA MAQUETTE) */}
      <header className="h-20 px-6 md:px-12 flex items-center justify-between bg-gradient-to-b from-[#060609]/90 to-[#060609]/0 backdrop-blur-md fixed top-0 left-0 right-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-10">
          {/* Logo officiel */}
          <Link href="/" className="flex items-center gap-2 group">
            <img src="/logo.png" alt="JellyWorld Logo" className="h-9 w-auto object-contain group-hover:scale-105 transition-transform" />
          </Link>

          {/* Liens de navigation centraux */}
          <nav className="hidden xl:flex items-center gap-6 text-[13px] font-medium text-zinc-400">
            {activeLibraries.map((lib) => (
              <Link key={lib.Id} href={`/${lib.Id}`} className="hover:text-white transition-colors tracking-wide">
                {lib.Name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Icones Droite */}
        <div className="flex items-center gap-6 text-zinc-400">
          <button className="hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 p-[1.5px] cursor-pointer">
            <div className="w-full h-full bg-[#060609] rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase">A</div>
          </div>
        </div>
      </header>

      {/* 🎬 HERO BANNER (SECTION À LA UNE) */}
      {heroMovie && (
        <section className="relative h-[70vh] md:h-[80vh] w-full flex items-center px-6 md:px-12 overflow-hidden pt-20">
          {/* Image de fond avec masquage dégradé cinéma */}
          <div className="absolute inset-0 z-0">
            <img 
              src={heroMovie.backdropUrl || heroMovie.computedImageUrl} 
              alt={heroMovie.Name} 
              className="w-full h-full object-cover object-center scale-105 filter brightness-[0.45] contrast-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060609] via-[#060609]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#060609] via-transparent to-transparent" />
          </div>

          {/* Contenu textuel */}
          <div className="relative z-10 max-w-2xl space-y-4 md:space-y-6 text-left mt-12">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              À la une sur JellyWorld
            </span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase leading-tight drop-shadow-md">
              {heroMovie.Name}
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 line-clamp-3 leading-relaxed font-light drop-shadow">
              {heroMovie.Overview || "Aucune description disponible pour ce média. Cliquez sur détails pour en savoir plus."}
            </p>
            
            {/* Boutons conformes au design */}
            <div className="flex items-center gap-4 pt-2">
              <button className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-lg shadow-purple-600/20 tracking-wide uppercase">
                <span>▶</span> Regarder Maintenant
              </button>
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all border border-white/10 tracking-wide uppercase backdrop-blur-sm">
                ℹ️ Détails
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 🗂️ CATALOGUE ET HORIZONTAL RAILS */}
      <div className="px-6 md:px-12 pb-24 space-y-12 relative z-20 -mt-12 md:-mt-20">
        {activeLibraries.map((lib) => (
          <section key={lib.Id} className="space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-black text-white tracking-widest uppercase bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                {lib.Name}
              </h3>
              <Link href={`/${lib.Id}`} className="text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-wider">
                Voir tout →
              </Link>
            </div>

            {/* Ligne horizontale de films */}
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {lib.movies.map((movie: any) => (
                <div key={movie.Id} className="w-[150px] md:w-[170px] shrink-0 group cursor-pointer flex flex-col">
                  <div className="aspect-[2/3] w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-900 group-hover:border-purple-500/60 transition-all duration-300 shadow-lg relative group-hover:-translate-y-1">
                    {movie.ImageTags?.Primary ? (
                      <img 
                        src={movie.computedImageUrl} 
                        alt={movie.Name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs font-bold">🎬 NO POSTER</div>
                    )}
                    {/* Overlay d'ombre discret en bas de carte */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <p className="mt-3 text-[11px] font-bold truncate text-zinc-400 group-hover:text-white transition-colors tracking-wide pl-1">
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