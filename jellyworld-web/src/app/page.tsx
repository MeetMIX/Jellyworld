import React from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const JELLYFIN_URL = "http://192.168.220.148:8096";
const JELLYFIN_TOKEN = "0111461657f84b4384c8fe7afe4a50de";

async function getFirstUserId() {
  const url = `${JELLYFIN_URL}/Users`;
  try {
    const res = await fetch(url, { 
      method: 'GET', 
      headers: { 'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`, 'Accept': 'application/json' }, 
      cache: 'no-store' 
    });
    if (!res.ok) return null;
    const users = await res.json();
    return users[0]?.Id || null;
  } catch { return null; }
}

async function getUserLibraries(userId: string) {
  const url = `${JELLYFIN_URL}/Users/${userId}/Views`;
  try {
    const res = await fetch(url, { 
      method: 'GET', 
      headers: { 'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`, 'Accept': 'application/json' }, 
      cache: 'no-store' 
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.Items || []).filter((lib: any) => lib.CollectionType !== "boxsets");
  } catch { return []; }
}

async function getMoviesByLibrary(parentId: string, userId: string) {
  const url = `${JELLYFIN_URL}/Users/${userId}/Items?ParentId=${parentId}&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags,Overview&Limit=12`;
  try {
    const res = await fetch(url, { 
      method: 'GET', 
      headers: { 'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`, 'Accept': 'application/json' }, 
      cache: 'no-store' 
    });
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
    <div className="min-h-screen w-screen bg-[#07060b] text-[#f1f5f9] font-sans overflow-x-hidden relative antialiased">
      
      <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* 🧭 BARRE DE NAVIGATION SUPÉRIEURE */}
      <header className="h-24 px-6 md:px-12 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/40 to-transparent fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-12 overflow-x-auto scrollbar-none">
          <Link href="/" className="flex items-center shrink-0">
            <img src="/logo.png" alt="JellyWorld" className="h-16 md:h-20 w-auto object-contain transition-transform duration-300 hover:scale-102" />
          </Link>

          <nav className="flex items-center gap-6 md:gap-8 text-[14px] font-medium text-zinc-300 shrink-0 whitespace-nowrap">
            {/* Correction ici : ajout du type explicite (lib: any) */}
            {libraries.map((lib: any) => (
              <Link key={lib.Id} href={`/${lib.Id}`} className="hover:text-white transition-colors duration-200 relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-purple-500 after:transition-all hover:after:w-full">
                {lib.Name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-zinc-400 shrink-0 ml-4">
          <button className="hover:text-white p-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 p-[1.5px]">
            <div className="w-full h-full bg-[#07060b] rounded-full flex items-center justify-center text-[10px] font-bold text-white">A</div>
          </div>
        </div>
      </header>

      {/* 🎬 HERO BANNER DYNAMIQUE */}
      {heroMovie && (
        <section className="relative h-[75vh] md:h-[85vh] w-full flex items-center px-6 md:px-12 overflow-hidden pt-16">
          <div className="absolute inset-0 z-0">
            <img src={heroMovie.backdropUrl || heroMovie.computedImageUrl} alt={heroMovie.Name} className="w-full h-full object-cover object-center filter brightness-[0.45] contrast-[1.02]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07060b] via-[#07060b]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07060b] via-transparent to-transparent" />
          </div>

          <div className="relative z-10 max-w-2xl space-y-4 text-left mt-16">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 bg-purple-500/10 px-3 py-1 rounded-md border border-purple-500/20">À la une sur JellyWorld</span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase leading-tight">{heroMovie.Name}</h2>
            <p className="text-xs md:text-sm text-zinc-400 line-clamp-3 leading-relaxed">{heroMovie.Overview || "Aucune description disponible."}</p>
            <div className="flex items-center gap-4 pt-2">
              <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs px-6 py-3.5 rounded-xl uppercase tracking-wider shadow-lg shadow-purple-600/20">▶ Regarder Maintenant</button>
              <button className="bg-white/10 text-white font-bold text-xs px-6 py-3.5 rounded-xl uppercase tracking-wider border border-white/5 backdrop-blur-md">ℹ️ Détails</button>
            </div>
          </div>
        </section>
      )}

      {/* 🗂️ LES RAILS HORIZONTAUX */}
      <div className="px-6 md:px-12 pb-24 space-y-12 relative z-20 -mt-12">
        {activeLibraries.map((lib) => (
          <section key={lib.Id} className="space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-xs font-black text-white tracking-widest uppercase">{lib.Name}</h3>
              <Link href={`/${lib.Id}`} className="text-[11px] font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider">Voir tout →</Link>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {lib.movies.map((movie: any) => (
                <div key={movie.Id} className="w-[140px] md:w-[170px] shrink-0 group cursor-pointer">
                  <div className="aspect-[2/3] w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-900 group-hover:border-purple-500/60 transition-all duration-300 shadow-lg group-hover:-translate-y-0.5">
                    <img src={movie.computedImageUrl} alt={movie.Name} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" />
                  </div>
                  <p className="mt-2 text-[11px] font-bold truncate text-zinc-400 group-hover:text-white pl-1">{movie.Name}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

    </div>
  );
}