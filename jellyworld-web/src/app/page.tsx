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

// 📂 2. Récupérer TOUTES les bibliothèques (y compris Collections) de cet utilisateur
async function getUserLibraries(userId: string) {
  // On ne filtre pas arbitrairement sur les types pour être certain de lever "Collection"
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

// 🎬 3. Récupérer les items d'une bibliothèque spécifique (Films ou Éléments de Collection)
async function getMoviesByLibrary(parentId: string) {
  // On ouvre la recherche aux types "Movie" et "BoxSet" (Collections) pour remplir la section
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Items?ParentId=${parentId}&IncludeItemTypes=Movie,BoxSet&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags&Limit=40`;
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

  // On garde les bibliothèques actives ou nommées "Collection" / "Collections" au cas où
  const activeLibraries = librariesWithMovies.filter(
    lib => lib.movies.length > 0 || lib.name.toLowerCase().includes('collection')
  );

  return (
    <div className="h-screen bg-[#0a0c0e] text-[#f1f5f9] font-sans antialiased relative overflow-hidden flex flex-col selection:bg-emerald-500/30">
      
      {/* 🌌 Lueur d'ambiance en arrière-plan */}
      <div className="absolute top-0 left-64 right-0 h-[600px] bg-gradient-to-tr from-emerald-950/10 via-zinc-900/5 to-transparent pointer-events-none blur-3xl z-0" />

      {/* 🔝 BARRE SUPÉRIEURE FLOUTÉE COMPACTE */}
      <header className="h-16 border-b border-zinc-900/30 px-8 flex items-center justify-between bg-[#0a0c0e]/60 backdrop-blur-md shrink-0 z-40 relative">
        <div className="relative w-72">
          <input 
            type="text" 
            placeholder="Recherche rapide..." 
            className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-emerald-500/30 text-zinc-300 placeholder:text-zinc-600 transition-all"
          />
          <span className="absolute left-3 top-2 text-zinc-600 text-xs">🔍</span>
        </div>

        <div className="flex items-center gap-6 text-zinc-400">
          <span className="cursor-pointer hover:text-white text-sm transition-colors">📺</span>
          <span className="cursor-pointer hover:text-white text-sm transition-colors">⚙️</span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 p-[1px] shadow-sm">
            <div className="w-full h-full rounded-full bg-[#0a0c0e] flex items-center justify-center font-bold text-xs text-white">
              M
            </div>
          </div>
        </div>
      </header>

      {/* 🔲 MASTER VIEWER COMPARTIMENTÉ */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        
        {/* 👈 SIDEBAR EMBY BLOQUÉE (Ne bouge jamais lors du scroll de droite) */}
        <aside className="w-64 bg-[#0d0f12]/80 border-r border-zinc-900/50 h-full flex flex-col backdrop-blur-2xl hidden lg:flex shrink-0">
          
          {/* Logo */}
          <div className="p-6 border-b border-zinc-900/40">
            <span className="text-xl font-black tracking-widest bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16_185_129,0.7)]" /> 
              JELLYWORLD
            </span>
          </div>

          {/* Navigation haute */}
          <div className="px-3 py-4 space-y-1 text-xs shrink-0">
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/10 shadow-sm">
              <span className="text-sm">🏠</span> Accueil
            </a>
          </div>

          {/* Vos Médias */}
          <div className="px-3 flex-1 overflow-y-auto space-y-2 mt-2 text-xs pb-6">
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 px-3 mb-1">
              Mes Médias
            </p>
            <nav className="space-y-0.5">
              {activeLibraries.map((lib) => (
                <a
                  key={lib.id}
                  href={`#lib-${lib.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900/60 border border-transparent hover:border-zinc-800/50 transition-all group truncate"
                >
                  <span className="text-zinc-600 group-hover:text-emerald-400 transition-colors text-sm shrink-0">📁</span>
                  <span className="truncate tracking-wide font-medium">{lib.name}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* 👉 ZONE DE DEFILEMENT DU CONTENU DE DROITE */}
        <main className="flex-1 overflow-y-auto scroll-smooth h-full custom-content-scroll">
          <div className="p-8 lg:p-12 space-y-14 max-w-[1700px] mx-auto pb-32">
            
            {/* 🟦 TOP VIGNETTES "MES MÉDIAS" */}
            <section className="space-y-4">
              <h2 className="text-base font-bold text-zinc-400 text-xs uppercase tracking-wide">Mes Médias</h2>
              <div className="flex gap-5 overflow-x-auto pb-4 snap-x scrollbar-none">
                {activeLibraries.map((lib) => {
                  const sampleMovie = lib.movies[0];
                  const imageUrl = sampleMovie ? `http://192.168.220.148:8096/Items/${sampleMovie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}` : null;
                  
                  return (
                    <a 
                      key={lib.id} 
                      href={`#lib-${lib.id}`} 
                      className="w-60 shrink-0 bg-gradient-to-b from-zinc-900/40 to-zinc-950/80 border border-zinc-800/40 rounded-xl overflow-hidden hover:border-zinc-700 transition-all duration-300 group snap-start shadow-md hover:shadow-xl"
                    >
                      <div className="aspect-[16/9] w-full bg-zinc-950 flex items-center justify-center relative overflow-hidden border-b border-zinc-900/60">
                        {imageUrl && (
                          <>
                            <img src={imageUrl} alt="" className="w-full h-full object-cover opacity-25 group-hover:opacity-40 blur-[3px] group-hover:scale-105 transition-all duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                          </>
                        )}
                        <span className="absolute text-xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-md">
                          {lib.name.toLowerCase().includes('collection') ? '🗂️' : '📂'}
                        </span>
                      </div>
                      <div className="p-3.5">
                        <h3 className="font-semibold text-xs text-zinc-200 group-hover:text-emerald-400 truncate tracking-wide transition-colors">{lib.name}</h3>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>

            {/* 🟥 SLIDERS DES FILMS & COLLECTIONS */}
            {activeLibraries.map((lib) => (
              <section key={lib.id} id={`lib-${lib.id}`} className="space-y-4 scroll-mt-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white tracking-wide hover:text-emerald-400 cursor-pointer transition-colors flex items-center gap-1 group">
                    {lib.name} 
                    <span className="text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all text-lg font-light ml-1">›</span>
                  </h2>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-thin">
                  {lib.movies.map((movie: any) => {
                    const imageUrl = `http://192.168.220.148:8096/Items/${movie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}`;
                    
                    return (
                      <div 
                        key={movie.Id} 
                        className="w-[160px] shrink-0 bg-[#0d0f12] border border-zinc-900 rounded-lg overflow-hidden hover:border-emerald-500/30 transition-all duration-300 shadow-md group snap-start cursor-pointer"
                      >
                        <div className="aspect-[2/3] w-full bg-zinc-950 relative overflow-hidden">
                          {movie.ImageTags && movie.ImageTags.Primary ? (
                            <img 
                              src={imageUrl} 
                              alt={movie.Name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 group-hover:brightness-110"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-10 text-xs">Primary Image</div>
                          )}
                        </div>

                        <div className="p-3 bg-[#0d0f12]">
                          <h3 className="font-medium text-[11px] tracking-wide truncate text-zinc-300 group-hover:text-white transition-colors">
                            {movie.Name}
                          </h3>
                          {movie.ProductionYear && (
                            <p className="text-[10px] text-zinc-600 font-semibold mt-0.5">
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
      </div>

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        
        .scrollbar-thin::-webkit-scrollbar { height: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.02); border-radius: 10px; }
        .scrollbar-thin:hover::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.2); }

        .custom-content-scroll::-webkit-scrollbar { width: 6px; }
        .custom-content-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-content-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.03); border-radius: 10px; }
        .custom-content-scroll:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); }
      `}</style>

    </div>
  );
}