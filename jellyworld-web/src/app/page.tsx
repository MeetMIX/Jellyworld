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

  return (
    <div className="h-screen bg-[#070709] text-[#f8fafc] font-sans antialiased relative overflow-hidden flex selection:bg-purple-500/30 tracking-tight">
      
      {/* 👈 SIDEBAR DESIGN MINI & GLASS (Discrète, n'empiète pas sur l'image) */}
      <aside className="w-64 bg-[#0a0a0f]/40 border-r border-zinc-900/60 h-full flex flex-col backdrop-blur-xl hidden lg:flex shrink-0 z-30">
        <div className="p-8">
          <span className="text-sm font-black tracking-[0.2em] bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
            JELLYWORLD <span className="text-[9px] bg-purple-600/20 text-purple-400 px-1.5 py-0.5 rounded-md border border-purple-500/20 font-mono tracking-normal">PREMIUM</span>
          </span>
        </div>

        <div className="px-4 py-2 space-y-1 text-xs shrink-0">
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-600/10 text-purple-400 font-bold border border-purple-500/10 shadow-sm">
            <span>🏠</span> Accueil
          </a>
        </div>

        <div className="px-4 flex-1 overflow-y-auto space-y-3 text-xs pt-6 pb-10 custom-sidebar-scroll">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-600 px-4">
            Mes Médias
          </p>
          <nav className="space-y-0.5">
            {activeLibraries.map((lib) => (
              <a
                key={lib.id}
                href={`#lib-${lib.id}`}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900/40 border border-transparent hover:border-zinc-800/30 transition-all duration-300 group truncate"
              >
                <span className="text-zinc-600 group-hover:text-purple-400 transition-colors text-base shrink-0">❖</span>
                <span className="truncate tracking-wide font-medium group-hover:translate-x-0.5 transition-transform duration-300">{lib.name}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* 👉 ZONE PRINCIPALE DE DÉFILEMENT (À DROITE) */}
      <main className="flex-1 overflow-y-auto scroll-smooth h-full custom-content-scroll bg-[#070709] relative">
        
        {/* 🔝 TOPBAR COMPACTE SUSPENDUE */}
        <header className="h-20 px-10 flex items-center justify-between absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <div className="relative w-80 pointer-events-auto">
            <input 
              type="text" 
              placeholder="Rechercher un film, une série..." 
              className="w-full bg-black/40 border border-zinc-800/60 hover:border-zinc-700/80 rounded-full py-2 pl-4 pr-4 text-xs focus:outline-none focus:border-purple-500/40 focus:bg-zinc-900/40 text-zinc-200 placeholder:text-zinc-500 transition-all duration-300 backdrop-blur-md"
            />
          </div>

          <div className="flex items-center gap-6 text-zinc-400 text-xs pointer-events-auto">
            <span className="cursor-pointer hover:text-white transition-colors">Applications</span>
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-lg">
              M
            </div>
          </div>
        </header>

        {/* 🌌 HERO BANNER HEROIQUE (Le grand retour du style épuré) */}
        <section className="relative h-[55vh] flex items-end p-10 lg:p-14 overflow-hidden bg-gradient-to-r from-purple-950/20 via-transparent to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(107,33,168,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/30 to-transparent z-10" />
          
          <div className="relative z-20 max-w-2xl space-y-4 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
              À la une aujourd'hui
            </span>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Bienvenue dans<br />Jellyworld
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-lg font-light">
              Votre lecteur multimédia personnel est prêt. Retrouvez tout votre catalogue synchronisé ici avec une interface réinventée et épurée.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button className="bg-white text-black font-bold text-xs px-6 py-2.5 rounded-lg hover:bg-zinc-200 transition-all shadow-lg flex items-center gap-2">
                ▶ Lecture rapide
              </button>
              <button className="bg-zinc-900/60 border border-zinc-800 text-zinc-300 font-semibold text-xs px-5 py-2.5 rounded-lg hover:bg-zinc-800 transition-all backdrop-blur-md">
                Plus d'infos
              </button>
            </div>
          </div>
        </section>

        {/* 🎬 CONTENU DES CATALOGUES HORIZONTAUX */}
        <div className="px-10 lg:px-14 pb-40 space-y-16 relative z-20 -mt-10">
          
          {/* SECTION : MES MÉDIAS (Format tuiles épurées) */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-500">Mes Médias</h3>
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x scrollbar-none">
              {activeLibraries.map((lib) => (
                <a 
                  key={lib.id} 
                  href={`#lib-${lib.id}`}
                  className="w-56 shrink-0 bg-[#0f0f15]/60 border border-zinc-900/80 hover:border-zinc-700/50 rounded-xl p-4 transition-all duration-300 group snap-start backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-purple-600/10 border border-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-sm group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                      📂
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-zinc-200 group-hover:text-purple-400 truncate transition-colors duration-300">{lib.name}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">{lib.movies.length} titres</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* SECTIONS DYNAMIQUES PAR BIBLIOTHÈQUE */}
          {activeLibraries.map((lib) => (
            <section key={lib.id} id={`lib-${lib.id}`} className="space-y-4 scroll-mt-24">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white tracking-wider uppercase group cursor-pointer flex items-center gap-1">
                  {lib.name} 
                  <span className="text-zinc-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all text-base ml-1">›</span>
                </h2>
              </div>

              {/* Slider Horizontal (Affiches 2/3 de films) */}
              <div className="flex gap-5 overflow-x-auto pb-4 snap-x scrollbar-thin">
                {lib.movies.map((movie: any) => {
                  const imageUrl = `http://192.168.220.148:8096/Items/${movie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}`;
                  
                  return (
                    <div 
                      key={movie.Id} 
                      className="w-[155px] shrink-0 group snap-start cursor-pointer relative"
                    >
                      {/* Jaquette du film */}
                      <div className="aspect-[2/3] w-full bg-zinc-900 rounded-lg overflow-hidden shadow-md group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.7)] border border-zinc-900 group-hover:border-purple-500/30 transition-all duration-300 ease-out">
                        {movie.ImageTags && movie.ImageTags.Primary ? (
                          <img 
                            src={imageUrl} 
                            alt={movie.Name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-20 text-[10px]">🎬</div>
                        )}
                      </div>

                      {/* Titre & année en dessous */}
                      <div className="mt-2.5 px-0.5 space-y-0.5">
                        <h4 className="font-semibold text-xs tracking-wide truncate text-zinc-300 group-hover:text-white transition-colors duration-200">
                          {movie.Name}
                        </h4>
                        {movie.ProductionYear && (
                          <p className="text-[10px] text-zinc-500 font-medium font-mono">
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
  );
}