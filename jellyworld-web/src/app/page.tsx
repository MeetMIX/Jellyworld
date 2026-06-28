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
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Items?ParentId=${parentId}&IncludeItemTypes=Movie,BoxSet&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags,ProductionYear&Limit=25`;
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

  // Trouver une image de film en arrière-plan pour l'ambiance globale (style Emby)
  const backdropMovie = activeLibraries.find(l => l.movies.length > 0)?.movies[0];
  const globalBackdropUrl = backdropMovie ? `http://192.168.220.148:8096/Items/${backdropMovie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}` : null;

  return (
    <div className="h-screen bg-[#090a0c] text-[#f1f5f9] font-sans antialiased relative overflow-hidden flex tracking-normal selection:bg-emerald-500/30">
      
      {/* 🖼️ EMBY BACKDROP COMPONENT : Fond d'ambiance dynamique basé sur le catalogue */}
      {globalBackdropUrl && (
        <div className="absolute inset-0 z-0 pointer-events-none transition-all duration-1000">
          <img src={globalBackdropUrl} alt="" className="w-full h-full object-cover opacity-[0.06] blur-[3px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#090a0c]/20 via-[#090a0c]/80 to-[#090a0c]" />
        </div>
      )}

      {/* 👈 SIDEBAR STYLE EMBY ULTRA-VISIBLE */}
      <aside className="w-64 bg-[#0c0e12]/90 border-r border-zinc-900 h-full flex flex-col hidden lg:flex shrink-0 z-30">
        <div className="p-6 border-b border-zinc-900/50 flex items-center gap-2">
          <span className="text-emerald-500 font-bold text-lg">✦</span>
          <span className="text-sm font-black tracking-widest text-white">JELLYWORLD</span>
        </div>

        <div className="px-3 py-4 text-sm shrink-0">
          <a href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-semibold shadow-md">
            <span className="text-base">🏠</span> Accueil
          </a>
        </div>

        <div className="px-3 flex-1 overflow-y-auto space-y-2 text-xs pb-10 custom-sidebar-scroll">
          <p className="text-[11px] font-bold uppercase text-zinc-500 px-4 mb-2 tracking-wider">
            Mes Médias
          </p>
          <nav className="space-y-0.5">
            {activeLibraries.map((lib) => (
              <a
                key={lib.id}
                href={`#lib-${lib.id}`}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/40 border border-transparent transition-all duration-150 group truncate"
              >
                <span className="text-zinc-500 group-hover:text-emerald-400 transition-colors text-sm shrink-0">📁</span>
                <span className="truncate tracking-wide font-medium">{lib.name}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* 👉 ZONE DE CONTENU PRINCIPALE */}
      <main className="flex-1 overflow-y-auto scroll-smooth h-full custom-content-scroll bg-transparent relative z-10">
        
        {/* 🔝 TOPBAR COMPACTE */}
        <header className="h-16 px-8 flex items-center justify-between bg-[#090a0c]/60 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-40">
          <div className="relative w-80">
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-md py-1.5 pl-4 pr-4 text-xs focus:outline-none focus:border-emerald-500/50 text-zinc-200 placeholder:text-zinc-600 transition-all"
            />
          </div>

          <div className="flex items-center gap-4 text-zinc-400 text-xs">
            <span className="cursor-pointer hover:text-white transition-colors">Applications</span>
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white">
              M
            </div>
          </div>
        </header>

        {/* 🎬 CONTENU ET LIGNES DE MÉDIAS */}
        <div className="p-8 lg:p-10 space-y-10 max-w-[1750px] mx-auto pb-40">
          
          {/* 🟦 VRAI BLOC "MES MÉDIAS" 16/9 DYNAMIQUE (Comme sur Emby) */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white tracking-wide">Mes Médias</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-none">
              {activeLibraries.map((lib) => {
                // Essayer de récupérer jusqu'à 3 images de films pour simuler la grille Emby
                const sampleMovies = lib.movies.slice(0, 3);
                
                return (
                  <a 
                    key={lib.id} 
                    href={`#lib-${lib.id}`}
                    className="w-72 shrink-0 bg-gradient-to-b from-zinc-900/60 to-zinc-950/90 border border-zinc-800/80 hover:border-zinc-600 rounded-lg overflow-hidden transition-all duration-200 group snap-start shadow-md"
                  >
                    {/* Grille d'affiches 16/9 style Emby */}
                    <div className="aspect-[16/9] w-full bg-zinc-950 flex relative overflow-hidden border-b border-zinc-900/60">
                      {sampleMovies.length > 0 ? (
                        <div className="flex w-full h-full opacity-40 group-hover:opacity-60 transition-opacity">
                          {sampleMovies.map((m: any, idx: number) => (
                            <img 
                              key={m.Id}
                              src={`http://192.168.220.148:8096/Items/${m.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}`} 
                              alt="" 
                              className="w-1/3 h-full object-cover border-r border-black/40 last:border-0"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">📁</div>
                      )}
                      {/* Miroir / Dégradé sombre */}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                    </div>
                    <div className="p-3 bg-zinc-950/40">
                      <h4 className="font-bold text-xs text-zinc-200 group-hover:text-emerald-400 truncate transition-colors">{lib.name}</h4>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>

          {/* 🟥 CARROUSELS DE FILMS */}
          {activeLibraries.map((lib) => (
            <section key={lib.id} id={`lib-${lib.id}`} className="space-y-3 scroll-mt-20">
              <h2 className="text-sm font-bold text-white tracking-wide hover:text-emerald-400 cursor-pointer transition-colors flex items-center gap-1 group">
                {lib.name} 
                <span className="text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all text-base ml-1">›</span>
              </h2>

              <div className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-thin">
                {lib.movies.map((movie: any) => {
                  const imageUrl = `http://192.168.220.148:8096/Items/${movie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}`;
                  
                  return (
                    <div key={movie.Id} className="w-[150px] shrink-0 group snap-start cursor-pointer">
                      <div className="aspect-[2/3] w-full bg-zinc-900 rounded-md overflow-hidden shadow-sm group-hover:shadow-lg border border-zinc-900 group-hover:border-zinc-700 transition-all duration-200">
                        {movie.ImageTags && movie.ImageTags.Primary ? (
                          <img 
                            src={imageUrl} 
                            alt={movie.Name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-20 text-xs">🎬</div>
                        )}
                      </div>
                      <div className="mt-2 px-0.5">
                        <h4 className="font-semibold text-xs truncate text-zinc-300 group-hover:text-white transition-colors">
                          {movie.Name}
                        </h4>
                        {movie.ProductionYear && (
                          <p className="text-[10px] text-zinc-500 font-medium font-mono mt-0.5">
                            {movie.ProductionYear}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-thin::-webkit-scrollbar { height: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .scrollbar-thin:hover::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.3); }
        .custom-content-scroll::-webkit-scrollbar { width: 6px; }
        .custom-content-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-content-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
}