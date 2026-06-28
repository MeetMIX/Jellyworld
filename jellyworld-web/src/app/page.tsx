import React from 'react';

// 👤 1. Récupérer le premier utilisateur actif du serveur
async function getFirstUserId() {
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Users`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${process.env.JELLYFIN_API_KEY}"`,
        'Accept': 'application/json'
      },
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    const users = await res.json();
    return users[0]?.Id || null;
  } catch (error) {
    console.error("Erreur récupération utilisateur:", error);
    return null;
  }
}

// 📂 2. Récupérer toutes les bibliothèques de l'utilisateur
async function getUserLibraries(userId: string) {
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Users/${userId}/Views`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${process.env.JELLYFIN_API_KEY}"`,
        'Accept': 'application/json'
      },
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  } catch (error) {
    console.error("Erreur récupération des vues utilisateur:", error);
    return [];
  }
}

// 🎬 3. Récupérer les films et les BoxSets (Collections)
async function getMoviesByLibrary(parentId: string) {
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Items?ParentId=${parentId}&IncludeItemTypes=Movie,BoxSet&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags,ProductionYear,RunTimeTicks&Limit=40`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${process.env.JELLYFIN_API_KEY}"`,
        'Accept': 'application/json'
      },
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  } catch (error) {
    return [];
  }
}

export default async function Home() {
  const userId = await getFirstUserId();
  let librariesWithMovies = [];

  if (userId) {
    const libraries = await getUserLibraries(userId);
    
    librariesWithMovies = await Promise.all(
      libraries.map(async (lib: any) => {
        const movies = await getMoviesByLibrary(lib.Id);
        return {
          id: lib.Id,
          name: lib.Name,
          movies: movies
        };
      })
    );
  }

  const activeLibraries = librariesWithMovies.filter(
    lib => lib.movies.length > 0 || lib.name.toLowerCase().includes('collection')
  );

  return (
    <div className="h-screen bg-[#07080a] text-[#f8fafc] font-sans antialiased relative overflow-hidden flex flex-col selection:bg-emerald-500/30 tracking-tight">
      
      {/* 🌌 AMBIENT CINEMA GLOW (Gradients ultra-diffuses pour casser le fond noir plat) */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-emerald-900/10 rounded-full pointer-events-none blur-[140px] z-0 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-950/10 rounded-full pointer-events-none blur-[120px] z-0" />

      {/* 🔝 TOPBAR MINIMALISTE ET TRANSLUCIDE */}
      <header className="h-20 border-b border-zinc-900/40 px-10 flex items-center justify-between bg-[#07080a]/60 backdrop-blur-xl shrink-0 z-40 relative">
        <div className="relative w-80 group">
          <span className="absolute left-3.5 top-[13px] text-zinc-500 text-sm group-focus-within:text-emerald-400 transition-colors">🔍</span>
          <input 
            type="text" 
            placeholder="Titres, réalisateurs, collections..." 
            className="w-full bg-zinc-900/30 border border-zinc-800/60 hover:border-zinc-700/80 rounded-full py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-emerald-500/40 focus:bg-zinc-900/60 text-zinc-200 placeholder:text-zinc-500 transition-all duration-300"
          />
        </div>

        <div className="flex items-center gap-8 text-zinc-400 text-sm">
          <button className="hover:text-white transition-colors relative group py-2">
            Applications
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-500 transition-all group-hover:w-full" />
          </button>
          <div className="flex items-center gap-5 border-l border-zinc-800/60 pl-8">
            <span className="cursor-pointer hover:text-white transition-colors text-base">⚙️</span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 p-[1px] shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="w-full h-full rounded-full bg-[#07080a] flex items-center justify-center font-bold text-xs text-white">
                M
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 🔲 MASTER VIEWER */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        
        {/* 👈 SIDEBAR ACRYLIC PREMIUM */}
        <aside className="w-64 bg-[#0a0c10]/60 border-r border-zinc-900/40 h-full flex flex-col backdrop-blur-2xl hidden lg:flex shrink-0 z-30">
          {/* Brand Logo */}
          <div className="p-8 border-b border-zinc-900/30">
            <span className="text-sm font-black tracking-[0.25em] text-white flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,1)]" /> 
              JELLYWORLD
            </span>
          </div>

          {/* Navigation */}
          <div className="px-4 py-6 space-y-1 text-xs shrink-0">
            <a href="#" className="flex items-center gap-3.5 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent text-emerald-400 font-bold border border-emerald-500/10">
              <span className="text-base">🏠</span> Home
            </a>
          </div>

          {/* Library Section (Arborescence Emby nettoyée) */}
          <div className="px-4 flex-1 overflow-y-auto space-y-3 text-xs pb-10 custom-sidebar-scroll">
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-500 px-4">
              Mes Médias
            </p>
            <nav className="space-y-0.5">
              {activeLibraries.map((lib) => (
                <a
                  key={lib.id}
                  href={`#lib-${lib.id}`}
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900/30 border border-transparent hover:border-zinc-800/30 transition-all duration-300 group truncate"
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-zinc-600 group-hover:text-emerald-400 transition-colors text-base shrink-0">
                      {lib.name.toLowerCase().includes('collection') ? '🗂️' : '📁'}
                    </span>
                    <span className="truncate tracking-wide font-medium group-hover:translate-x-0.5 transition-transform duration-300">{lib.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {lib.movies.length}
                  </span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* 👉 COMPARTIMENT DE CONTENU DROITE */}
        <main className="flex-1 overflow-y-auto scroll-smooth h-full bg-gradient-to-b from-zinc-950/20 to-[#07080a] custom-content-scroll">
          <div className="p-10 lg:p-14 space-y-20 max-w-[1800px] mx-auto pb-40">
            
            {/* 🟦 HUB "MES MÉDIAS" 16/9 EXPERT */}
            <section className="space-y-6">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Mes Médias</h2>
              <div className="flex gap-6 overflow-x-auto pb-4 snap-x scrollbar-none">
                {activeLibraries.map((lib) => {
                  const sampleMovie = lib.movies[0];
                  const imageUrl = sampleMovie ? `http://192.168.220.148:8096/Items/${sampleMovie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}` : null;
                  
                  return (
                    <a 
                      key={lib.id} 
                      href={`#lib-${lib.id}`} 
                      className="w-72 shrink-0 bg-[#0e1116]/40 backdrop-blur-md border border-zinc-900 hover:border-zinc-700/60 rounded-2xl overflow-hidden transition-all duration-500 group snap-start shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
                    >
                      <div className="aspect-[16/9] w-full bg-zinc-950/80 flex items-center justify-center relative overflow-hidden">
                        {imageUrl && (
                          <>
                            <img src={imageUrl} alt="" className="w-full h-full object-cover opacity-[0.15] group-hover:opacity-30 blur-[4px] group-hover:scale-110 transition-all duration-700 ease-out" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0e1116] via-transparent to-transparent" />
                          </>
                        )}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 group-hover:bg-transparent transition-colors duration-500">
                          <span className="text-3xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-500 ease-out">
                            {lib.name.toLowerCase().includes('collection') ? '🗂️' : '📂'}
                          </span>
                        </div>
                      </div>
                      <div className="p-5 border-t border-zinc-900/60 bg-[#0c0e12]/80">
                        <h4 className="font-bold text-sm text-zinc-200 group-hover:text-emerald-400 truncate tracking-wide transition-colors duration-300">{lib.name}</h4>
                        <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase tracking-wider">{lib.movies.length} Éléments</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>

            {/* 🟥 CARROUSELS DEJAQUETTES ULTRA-PREMIUM */}
            {activeLibraries.map((lib) => (
              <section key={lib.id} id={`lib-${lib.id}`} className="space-y-6 scroll-mt-6">
                <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
                  <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2 group cursor-pointer">
                    {lib.name} 
                    <span className="text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1.5 transition-all duration-300 font-light text-2xl">›</span>
                  </h2>
                </div>

                {/* Film Rail Slider */}
                <div className="flex gap-5 overflow-x-auto pb-6 snap-x scrollbar-thin">
                  {lib.movies.map((movie: any) => {
                    const imageUrl = `http://192.168.220.148:8096/Items/${movie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}`;
                    
                    return (
                      <div 
                        key={movie.Id} 
                        className="w-[180px] shrink-0 bg-[#0c0e12] border border-zinc-900 rounded-xl overflow-hidden hover:border-emerald-500/40 transition-all duration-500 ease-out shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.8)] group snap-start cursor-pointer relative"
                      >
                        {/* Wrapper Image Portrait 2/3 */}
                        <div className="aspect-[2/3] w-full bg-zinc-950 relative overflow-hidden border-b border-zinc-900/60">
                          {movie.ImageTags && movie.ImageTags.Primary ? (
                            <img 
                              src={imageUrl} 
                              alt={movie.Name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out group-hover:brightness-[1.05]"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center opacity-20 text-[10px] uppercase font-mono tracking-widest">No Cover</div>
                          )}

                          {/* Overlay Premium au survol (Apparition du bouton Play) */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center z-10">
                            <div className="h-12 w-12 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.6)] translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out">
                              ▶
                            </div>
                          </div>
                        </div>

                        {/* Text Metadata Panel */}
                        <div className="p-4 bg-[#0c0e12]/95 relative z-20">
                          <h3 className="font-bold text-xs tracking-wide truncate text-zinc-200 group-hover:text-white transition-colors duration-300">
                            {movie.Name}
                          </h3>
                          <div className="flex items-center justify-between mt-1.5">
                            {movie.ProductionYear ? (
                              <span className="text-[10px] text-zinc-500 font-bold font-mono">
                                {movie.ProductionYear}
                              </span>
                            ) : (
                              <span className="text-[10px] text-transparent font-mono">0000</span>
                            )}
                            <span className="text-[9px] text-zinc-600 bg-zinc-900/60 border border-zinc-800/50 px-1.5 py-0.5 rounded font-mono uppercase">
                              4K
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>

      {/* INJECTION STYLES SCROLLBARS MINIMALISTES */}
      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        
        .scrollbar-thin::-webkit-scrollbar { height: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.01); border-radius: 99px; }
        .scrollbar-thin:hover::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.25); }

        .custom-content-scroll::-webkit-scrollbar { width: 5px; }
        .custom-content-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-content-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.02); border-radius: 99px; }
        .custom-content-scroll:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); }

        .custom-sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb { background: transparent; }
        .custom-sidebar-scroll:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.04); }
      `}</style>

    </div>
  );
}