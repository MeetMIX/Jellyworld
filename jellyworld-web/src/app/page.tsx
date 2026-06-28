import React from 'react';
import MovieRow from './MovieRow';

// ⚡ FORCE NEXT.JS À INTERROGER LE BACKEND À CHAQUE CHARGEMENT (FINI LE BLOCAGE DE MAINTENANCE)
export const dynamic = 'force-dynamic';

async function getFirstUserId() {
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Users`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${process.env.JELLYFIN_API_KEY}"`,
        'Accept': 'application/json'
      },
      cache: 'no-store' // Évite aussi le cache au niveau du fetch
    });
    if (!res.ok) return null;
    const users = await res.json();
    return users[0]?.Id || null;
  } catch (error) {
    return null;
  }
}

async function getUserLibraries(userId: string) {
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Users/${userId}/Views`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${process.env.JELLYFIN_API_KEY}"`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  } catch (error) {
    return [];
  }
}

async function getMoviesByLibrary(parentId: string, userId: string) {
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Users/${userId}/Items?ParentId=${parentId}&IncludeItemTypes=Movie,BoxSet&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags,ProductionYear,UserData&Limit=40`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${process.env.JELLYFIN_API_KEY}"`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    
    // 🛡️ SÉCURISATION : On pré-calcule l'URL de l'image ici avec la clé serveur pour éliminer tout freeze côté client
    const apiKey = process.env.JELLYFIN_API_KEY || "";
    return (data.Items || []).map((item: any) => ({
      ...item,
      computedImageUrl: `http://192.168.220.148:8096/Items/${item.Id}/Images/Primary?api_key=${apiKey}`
    }));
  } catch (error) {
    return [];
  }
}

export default async function Home() {
  const userId = await getFirstUserId();
  
  // 🚧 ÉCRAN DE MAINTENANCE
  if (!userId) {
    return (
      <div className="h-screen w-screen bg-[#07070a] text-[#f1f5f9] font-sans flex flex-col items-center justify-center relative overflow-hidden p-6 text-center select-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-purple-600 via-pink-600 to-red-500 rounded-full opacity-10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-blue-600 rounded-full opacity-5 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-md space-y-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-600 via-purple-600 via-pink-600 to-red-500 rounded-2xl p-[2px] shadow-[0_0_40px_rgba(219,39,119,0.25)] flex items-center justify-center">
            <div className="w-full h-full bg-[#07070a] rounded-[14px] flex items-center justify-center">
              <span className="text-xl animate-pulse">🛠️</span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-white via-purple-200 to-zinc-400 bg-clip-text text-transparent uppercase">
              Jellyworld en maintenance
            </h1>
            <p className="text-sm text-zinc-400 font-medium px-4 leading-relaxed">
              Le backend est actuellement indisponible pour des raisons techniques ou de synchronisation.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-red-500/10 border border-pink-500/20 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
            <span className="text-[11px] font-black tracking-widest text-pink-400 uppercase font-mono">
              De retour ASAP
            </span>
          </div>

          <p className="text-[10px] text-zinc-600 font-medium pt-4 tracking-wide">
            Rafraîchissez la page pour tenter une reconnexion...
          </p>
        </div>
      </div>
    );
  }

  // --- RENDU NORMAL DU CATALOGUE ---
  let librariesWithMovies = [];
  const libraries = await getUserLibraries(userId);
  
  librariesWithMovies = await Promise.all(
    libraries.map(async (lib: any) => {
      const movies = await getMoviesByLibrary(lib.Id, userId);
      return { id: lib.Id, name: lib.Name, movies: movies };
    })
  );

  const activeLibraries = librariesWithMovies.filter(
    lib => lib.movies.length > 0 || lib.name.toLowerCase().includes('collection')
  );

  const backdropMovie = activeLibraries.find(l => l.movies.length > 0)?.movies[0];
  const globalBackdropUrl = backdropMovie ? backdropMovie.computedImageUrl : null;

  return (
    <div className="h-screen bg-[#07070a] text-[#f1f5f9] font-sans antialiased relative overflow-hidden flex tracking-normal">
      {globalBackdropUrl && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src={globalBackdropUrl} alt="" className="w-full h-full object-cover opacity-[0.08] blur-[4px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07070a]/20 via-[#07070a]/85 to-[#07070a]" />
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-[#0b0c10]/95 border-r border-zinc-900 h-full flex flex-col hidden lg:flex shrink-0 z-30">
        <div className="p-6 border-b border-zinc-900/50 flex items-center gap-3">
          <div className="w-7 h-7 relative flex items-center justify-center bg-gradient-to-tr from-blue-600 via-purple-600 via-pink-600 to-red-500 rounded-lg p-[1.5px] shadow-[0_0_15px_rgba(219,39,119,0.3)]">
            <div className="w-full h-full bg-[#0b0c10] rounded-[6px] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-white" stroke="currentColor" strokeWidth="2.5">
                <polygon points="6 3 20 12 6 21 6 3" strokeLinejoin="round" fill="url(#logo-grad)" />
                <defs>
                  <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <span className="text-xs font-black tracking-[0.2em] bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            JELLYWORLD
          </span>
        </div>

        <div className="px-3 py-4 text-sm shrink-0">
          <a href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600/20 via-pink-600/10 to-transparent text-white font-semibold border-l-2 border-pink-500 shadow-sm">
            <span className="text-pink-400">🏠</span> Accueil
          </a>
        </div>

        <div className="px-3 flex-1 overflow-y-auto space-y-2 text-xs pb-10">
          <p className="text-[10px] font-bold uppercase text-zinc-500 px-4 mb-2 tracking-widest">Mes Médias</p>
          <nav className="space-y-0.5">
            {activeLibraries.map((lib) => (
              <a key={lib.id} href={`#lib-${lib.id}`} className="flex items-center gap-3 px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900/60 truncate group transition-all">
                <span className="text-zinc-600 group-hover:text-pink-400 transition-colors text-sm">❖</span>
                <span className="truncate tracking-wide font-medium">{lib.name}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* Corps Principal */}
      <main className="flex-1 overflow-y-auto scroll-smooth h-full bg-transparent relative z-10">
        <header className="h-16 px-8 flex items-center justify-between bg-[#07070a]/60 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-40">
          <div className="relative w-80">
            <input type="text" placeholder="Rechercher..." className="w-full bg-zinc-950/50 border border-zinc-800 rounded-md py-1.5 px-4 text-xs text-zinc-200 focus:outline-none focus:border-purple-500/50 transition-all" />
          </div>
          <div className="flex items-center gap-4 text-zinc-400 text-xs">
            <span>Applications</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-bold text-white shadow-md">M</div>
          </div>
        </header>

        <div className="p-8 lg:p-10 space-y-12 max-w-[1750px] mx-auto pb-40">
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Mes Médias</h3>
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {activeLibraries.map((lib) => {
                const sampleMovies = lib.movies.slice(0, 4);
                return (
                  <a key={lib.id} href={`#lib-${lib.id}`} className="w-72 shrink-0 bg-gradient-to-b from-zinc-900/40 to-zinc-950/80 border border-zinc-900 hover:border-purple-500/30 rounded-lg overflow-hidden group shadow-md transition-all duration-300">
                    <div className="aspect-[16/9] w-full bg-zinc-950 flex relative overflow-hidden border-b border-zinc-900/60">
                      {sampleMovies.length > 0 ? (
                        <div className="flex w-full h-full opacity-35 group-hover:opacity-50 transition-opacity">
                          {sampleMovies.map((m: any) => (
                            <img key={m.Id} src={m.computedImageUrl} alt="" className="w-1/4 h-full object-cover border-r border-black/40 last:border-0" />
                          ))}
                        </div>
                      ) : <div className="w-full h-full flex items-center justify-center text-zinc-700">📁</div>}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                    </div>
                    <div className="p-3 bg-zinc-950/20">
                      <h4 className="font-bold text-xs text-zinc-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 truncate transition-all">{lib.name}</h4>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>

          {activeLibraries.map((lib) => (
            <MovieRow key={lib.id} lib={lib} />
          ))}
        </div>
      </main>
    </div>
  );
}