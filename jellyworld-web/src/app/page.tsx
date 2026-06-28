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
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Items?ParentId=${parentId}&IncludeItemTypes=Movie&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags&Limit=20`;
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
    <div className="min-h-screen bg-[#101214] text-gray-200 font-sans antialiased relative overflow-x-hidden selection:bg-green-500/30">
      
      {/* 🌌 BACKGROUND IMMERSIF */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#101214]/95 to-[#101214] pointer-events-none" />

      {/* 🔲 STRUCTURE PRINCIPALE */}
      <div className="flex relative z-10">
        
        {/* 👈 SIDEBAR STYLE EMBY */}
        <aside className="w-64 bg-[#141619]/95 border-r border-zinc-800/40 h-screen sticky top-0 overflow-y-auto flex flex-col backdrop-blur-md hidden lg:flex">
          <div className="p-5 border-b border-zinc-800/40 flex items-center gap-2.5">
            <span className="text-xl font-black tracking-tighter text-white flex items-center gap-1.5">
              <span className="text-green-500 text-2xl">❖</span> JELLYWORLD
            </span>
          </div>

          <div className="p-4">
            <input 
              type="text" 
              placeholder="Recherche..." 
              className="w-full bg-[#1c2024] border border-zinc-700/30 rounded-md py-1.5 px-3 text-xs focus:outline-none focus:border-green-500/50 text-zinc-200 placeholder:text-zinc-500"
            />
          </div>

          <div className="px-3 py-2 flex-1 space-y-6 text-xs">
            <div className="space-y-0.5">
              <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md bg-green-600/10 text-green-400 font-medium border border-green-500/20">
                <span>🏠</span> Accueil
              </a>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold tracking-wider uppercase text-zinc-500 px-3 mb-2">
                Mes Médias
              </p>
              <nav className="space-y-0.5 max-h-[60vh] overflow-y-auto pr-1">
                {activeLibraries.map((lib) => (
                  <a
                    key={lib.id}
                    href={`#lib-${lib.id}`}
                    className="flex items-center justify-between px-3 py-2 rounded-md text-zinc-400 hover:text-white hover:bg-[#1c2024] transition-all group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-zinc-600 group-hover:text-green-500 transition-colors">📁</span>
                      <span className="truncate tracking-wide">{lib.name}</span>
                    </div>
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* 👉 ZONE DE CONTENU PRINCIPALE */}
        <main className="flex-1 min-w-0">
          
          {/* 🔝 TOPBAR COMPACTE */}
          <header className="h-14 border-b border-zinc-800/20 px-8 flex items-center justify-between bg-[#101214]/40 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-4 text-sm font-medium">
              <button className="text-white bg-zinc-800/60 px-4 py-1 rounded-full text-xs font-semibold shadow-sm">Accueil</button>
              <button className="text-zinc-400 hover:text-white text-xs transition-colors">Favoris</button>
            </div>
            <div className="flex items-center gap-4 text-zinc-400 text-sm">
              <span className="cursor-pointer hover:text-white">📺</span>
              <span className="cursor-pointer hover:text-white">⚙️</span>
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white">
                M
              </div>
            </div>
          </header>

          {/* 🎬 CONTENU DES CARROUSELS HORIZONTAUX */}
          <div className="p-8 space-y-12 max-w-[1600px] mx-auto">
            
            {/* SECTION : MES MÉDIAS */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white tracking-wide">Mes Médias</h2>
              <div className="flex gap-4 overflow-x-auto pb-3 snap-x">
                {activeLibraries.map((lib) => {
                  const sampleMovie = lib.movies[0];
                  const imageUrl = sampleMovie ? `http://192.168.220.148:8096/Items/${sampleMovie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}` : null;
                  
                  return (
                    <a key={lib.id} href={`#lib-${lib.id}`} className="w-56 shrink-0 bg-[#141619] border border-zinc-800/40 rounded-md overflow-hidden hover:border-zinc-600 transition-all shadow-md group snap-start">
                      <div className="aspect-[16/9] w-full bg-zinc-900 flex items-center justify-center relative overflow-hidden border-b border-zinc-800/60">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 blur-[1px] opacity-60" />
                        ) : null}
                        <span className="absolute text-2xl z-10">📁</span>
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-xs text-zinc-300 group-hover:text-white truncate">{lib.name}</h3>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>

            {/* SECTIONS DYNAMIQUES DES BIBLIOTHÈQUES */}
            {activeLibraries.map((lib) => (
              <section key={lib.id} id={`lib-${lib.id}`} className="space-y-4 scroll-mt-20">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold text-white tracking-wide hover:text-green-400 cursor-pointer transition-colors">
                    {lib.name} <span className="text-zinc-500 font-normal text-sm ml-1">›</span>
                  </h2>
                </div>

                {/* FIL HORIZONTAL DÉFILANT */}
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                  {lib.movies.map((movie: any) => {
                    const imageUrl = `http://192.168.220.148:8096/Items/${movie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}`;
                    
                    return (
                      <div 
                        key={movie.Id} 
                        className="w-44 shrink-0 bg-[#141619] border border-zinc-800/30 rounded-md overflow-hidden hover:border-green-500/40 transition-all duration-200 shadow-lg cursor-pointer group snap-start"
                      >
                        <div className="aspect-[2/3] w-full bg-[#1c2024] flex items-center justify-center relative border-b border-zinc-800/60">
                          {movie.ImageTags && movie.ImageTags.Primary ? (
                            <img 
                              src={imageUrl} 
                              alt={movie.Name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:brightness-110 transition-all"
                            />
                          ) : (
                            <span className="text-xl opacity-20">🎬</span>
                          )}
                        </div>
                        <div className="p-2.5 bg-[#141619] space-y-0.5">
                          <h3 className="font-medium text-[11px] tracking-wide truncate text-zinc-300 group-hover:text-white">
                            {movie.Name}
                          </h3>
                          {movie.ProductionYear && (
                            <p className="text-[10px] text-zinc-500 font-medium">
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
    </div>
  );
}