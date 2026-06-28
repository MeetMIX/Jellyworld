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

// 📂 2. Récupérer les bibliothèques de cet utilisateur
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

// 🎬 3. Récupérer les films d'une bibliothèque spécifique
async function getMoviesByLibrary(parentId: string) {
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Items?ParentId=${parentId}&IncludeItemTypes=Movie&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags&Limit=25`;
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

  const activeLibraries = librariesWithMovies.filter(lib => lib.movies.length > 0);

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#e2e8f0] font-sans antialiased relative overflow-x-hidden selection:bg-green-500/30 tracking-tight">
      
      {/* 🌌 FLUID GLASS BACKDROP LAYER (Effet d'ambiance cinéma en arrière-plan) */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-[#1b281f]/20 via-[#0a110d]/5 to-transparent pointer-events-none blur-3xl z-0" />

      {/* 🔲 MASTER GRID */}
      <div className="flex relative z-10">
        
        {/* 👈 SIDEBAR ULTRA-PREMIUM (Floutée, fine et moderne) */}
        <aside className="w-64 bg-[#0d0f12]/70 border-r border-zinc-800/30 h-screen sticky top-0 overflow-y-auto flex flex-col backdrop-blur-xl hidden lg:flex z-50">
          
          {/* Brand */}
          <div className="p-6 flex items-center justify-between">
            <span className="text-lg font-black tracking-widest text-white flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]" /> 
              JELLYWORLD
            </span>
          </div>

          {/* Navigation Principale */}
          <div className="px-4 py-2 space-y-7 text-[13px]">
            <div className="space-y-1">
              <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/40 text-white font-medium border border-zinc-700/20 transition-all shadow-sm">
                <span className="text-base">🏠</span> Accueil
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/20 transition-all">
                <span className="text-base">⭐</span> Favoris
              </a>
            </div>

            {/* Liste des Médias style Emby */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 px-3">
                Mes Médias
              </p>
              <nav className="space-y-0.5 max-h-[65vh] overflow-y-auto pr-1">
                {activeLibraries.map((lib) => (
                  <a
                    key={lib.id}
                    href={`#lib-${lib.id}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/30 border border-transparent hover:border-zinc-800/50 transition-all truncate group"
                  >
                    <span className="text-zinc-600 group-hover:text-green-500 transition-colors text-sm">📁</span>
                    <span className="truncate tracking-wide font-medium">{lib.name}</span>
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* 👉 MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 bg-gradient-to-b from-transparent to-[#090a0c]">
          
          {/* 🔝 TOPBAR COMPACTE & TRANSLUCIDE */}
          <header className="h-16 border-b border-zinc-900/40 px-8 flex items-center justify-between bg-[#090a0c]/40 backdrop-blur-md sticky top-0 z-40">
            <div className="relative w-80">
              <input 
                type="text" 
                placeholder="Rechercher un film..." 
                className="w-full bg-zinc-900/50 border border-zinc-800/60 rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-green-500/30 focus:bg-zinc-900/80 text-zinc-200 placeholder:text-zinc-500 transition-all"
              />
              <span className="absolute left-3 top-2 text-zinc-500 text-xs">🔍</span>
            </div>

            <div className="flex items-center gap-5 text-zinc-400">
              <span className="cursor-pointer hover:text-white text-sm transition-colors">📺</span>
              <span className="cursor-pointer hover:text-white text-sm transition-colors">⚙️</span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 p-[1px] shadow-md">
                <div className="w-full h-full rounded-full bg-[#090a0c] flex items-center justify-center font-bold text-xs text-white">
                  M
                </div>
              </div>
            </div>
          </header>

          {/* 🎬 CARROUSELS */}
          <div className="p-8 lg:p-12 space-y-14 max-w-[1700px] mx-auto">
            
            {/* SECTION 1 : VIGNETTES DE DOSSIERS "MES MÉDIAS" (Identique à ton screen Emby) */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-wide">Mes Médias</h2>
              <div className="flex gap-5 overflow-x-auto pb-4 snap-x scrollbar-none">
                {activeLibraries.map((lib) => {
                  const sampleMovie = lib.movies[0];
                  const imageUrl = sampleMovie ? `http://192.168.220.148:8096/Items/${sampleMovie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}` : null;
                  
                  return (
                    <a 
                      key={lib.id} 
                      href={`#lib-${lib.id}`} 
                      className="w-64 shrink-0 bg-[#0f1115]/90 border border-zinc-800/40 rounded-xl overflow-hidden hover:border-zinc-600 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-300 group snap-start relative"
                    >
                      {/* Container Image 16/9 flouté style Reflet Emby */}
                      <div className="aspect-[16/9] w-full bg-zinc-900/80 flex items-center justify-center relative overflow-hidden border-b border-zinc-800/50">
                        {imageUrl ? (
                          <>
                            <img src={imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-30 blur-[2px]" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] via-transparent to-transparent opacity-80" />
                          </>
                        ) : null}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <span className="text-2xl drop-shadow-md group-hover:scale-110 transition-transform">📂</span>
                        </div>
                      </div>
                      <div className="p-4 bg-[#0f1115]">
                        <h3 className="font-semibold text-xs text-zinc-200 group-hover:text-white truncate tracking-wide">{lib.name}</h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">{lib.movies.length} titres</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>

            {/* SECTIONS FILMS PAR BIBLIOTHÈQUES */}
            {activeLibraries.map((lib) => (
              <section key={lib.id} id={`lib-${lib.id}`} className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white tracking-wide hover:text-green-400 cursor-pointer transition-colors flex items-center gap-2 group">
                    {lib.name} 
                    <span className="text-zinc-600 group-hover:text-green-400 group-hover:translate-x-1 transition-all font-light text-xl">›</span>
                  </h2>
                </div>

                {/* SLIDER HORIZONTAL COMPACT & ÉLÉGANT */}
                <div className="flex gap-4.5 overflow-x-auto pb-4 snap-x scrollbar-thin">
                  {lib.movies.map((movie: any) => {
                    const imageUrl = `http://192.168.220.148:8096/Items/${movie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}`;
                    
                    return (
                      <div 
                        key={movie.Id} 
                        className="w-[170px] shrink-0 bg-[#0f1115] border border-zinc-800/30 rounded-lg overflow-hidden hover:border-green-500/50 transition-all duration-300 shadow-md hover:shadow-[0_12px_24px_rgba(0,0,0,0.6)] cursor-pointer group snap-start relative"
                      >
                        {/* Affiche Verticale 2/3 */}
                        <div className="aspect-[2/3] w-full bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                          {movie.ImageTags && movie.ImageTags.Primary ? (
                            <img 
                              src={imageUrl} 
                              alt={movie.Name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-[1.02] group-hover:brightness-105 transition-all duration-300"
                            />
                          ) : (
                            <div className="text-center opacity-20">
                              <span className="text-2xl">🎬</span>
                            </div>
                          )}
                          {/* Dark overlay subtil au survol */}
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>

                        {/* Infos Titre & Année */}
                        <div className="p-3 bg-[#0f1115]/95">
                          <h3 className="font-semibold text-[12px] tracking-wide truncate text-zinc-300 group-hover:text-white transition-colors">
                            {movie.Name}
                          </h3>
                          {movie.ProductionYear ? (
                            <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
                              {movie.ProductionYear}
                            </p>
                          ) : (
                            <p className="text-[10px] text-transparent mt-0.5">0000</p>
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

      {/* Rendu des scrollbars masquées / fines en CSS classique pour éviter les conflits */}
      <style>{`
        /* Masquer la scrollbar pour Mes Médias */
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Personnalisation fine pour les lignes de films */
        .scrollbar-thin::-webkit-scrollbar { height: 5px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.03); border-radius: 10px; }
        .scrollbar-thin:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); }
      `}</style>

    </div>
  );
}