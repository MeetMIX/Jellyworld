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
async function getMoviesByLibrary(parentId: string, userId: string) {
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Users/${userId}/Items?ParentId=${parentId}&IncludeItemTypes=Movie,BoxSet&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags,ProductionYear,UserData&Limit=40`;
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
        const movies = await getMoviesByLibrary(lib.Id, userId);
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

  const backdropMovie = activeLibraries.find(l => l.movies.length > 0)?.movies[0];
  const globalBackdropUrl = backdropMovie ? `http://192.168.220.148:8096/Items/${backdropMovie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}` : null;

  return (
    <div className="h-screen bg-[#090a0c] text-[#f1f5f9] font-sans antialiased relative overflow-hidden flex tracking-normal">
      
      {/* 🖼️ EMBY DYNAMIC BACKDROP */}
      {globalBackdropUrl && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src={globalBackdropUrl} alt="" className="w-full h-full object-cover opacity-[0.07] blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#090a0c]/10 via-[#090a0c]/80 to-[#090a0c]" />
        </div>
      )}

      {/* 👈 SIDEBAR */}
      <aside className="w-64 bg-[#0c0e12]/95 border-r border-zinc-900 h-full flex flex-col hidden lg:flex shrink-0 z-30">
        <div className="p-6 border-b border-zinc-900/50 flex items-center gap-2">
          <span className="text-white font-black tracking-widest text-sm">JELLYWORLD</span>
        </div>
        <div className="px-3 py-4 text-sm shrink-0">
          <a href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-zinc-800 text-white font-semibold">
            <span>🏠</span> Accueil
          </a>
        </div>
        <div className="px-3 flex-1 overflow-y-auto space-y-2 text-xs pb-10 custom-sidebar-scroll">
          <p className="text-[11px] font-bold uppercase text-zinc-500 px-4 mb-2 tracking-wider">Mes Médias</p>
          <nav className="space-y-0.5">
            {activeLibraries.map((lib) => (
              <a key={lib.id} href={`#lib-${lib.id}`} className="flex items-center gap-3 px-4 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/40 truncate">
                <span className="text-zinc-500">📁</span>
                <span className="truncate tracking-wide font-medium">{lib.name}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* 👉 ZONE DE CONTENU PRINCIPALE */}
      <main className="flex-1 overflow-y-auto scroll-smooth h-full custom-content-scroll bg-transparent relative z-10">
        <header className="h-16 px-8 flex items-center justify-between bg-[#090a0c]/60 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-40">
          <div className="relative w-80">
            <input type="text" placeholder="Rechercher..." className="w-full bg-zinc-950/50 border border-zinc-800 rounded-md py-1.5 px-4 text-xs text-zinc-200 focus:outline-none" />
          </div>
          <div className="flex items-center gap-4 text-zinc-400 text-xs">
            <span>Applications</span>
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white">M</div>
          </div>
        </header>

        <div className="p-8 lg:p-10 space-y-12 max-w-[1750px] mx-auto pb-40">
          
          {/* SECTION : MES MÉDIAS INTAILLÉES */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white tracking-wide">Mes Médias</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {activeLibraries.map((lib) => {
                const sampleMovies = lib.movies.slice(0, 3);
                return (
                  <a key={lib.id} href={`#lib-${lib.id}`} className="w-72 shrink-0 bg-gradient-to-b from-zinc-900/60 to-zinc-950/90 border border-zinc-800/80 hover:border-zinc-600 rounded-lg overflow-hidden group shadow-md">
                    <div className="aspect-[16/9] w-full bg-zinc-950 flex relative overflow-hidden border-b border-zinc-900/60">
                      {sampleMovies.length > 0 ? (
                        <div className="flex w-full h-full opacity-40">
                          {sampleMovies.map((m: any) => (
                            <img key={m.Id} src={`http://192.168.220.148:8096/Items/${m.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}`} alt="" className="w-1/3 h-full object-cover border-r border-black/40 last:border-0" />
                          ))}
                        </div>
                      ) : <div className="w-full h-full flex items-center justify-center text-zinc-700">📁</div>}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                    </div>
                    <div className="p-3 bg-zinc-950/40">
                      <h4 className="font-bold text-xs text-zinc-200 group-hover:text-emerald-400 truncate">{lib.name}</h4>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>

          {/* TRAITEMENT DES CARROUSELS AVEC BOUTON BLANC CLIENT */}
          {activeLibraries.map((lib) => (
            <MovieRowClient key={lib.id} lib={lib} />
          ))}

        </div>
      </main>
    </div>
  );
}

// 🛠️ COMPOSANT INTERNE DE GESTION DU RAILS AVEC BOUTON DE DEFILEMENT STYLE EMBY
'use client';
function MovieRowClient({ lib }: { lib: any }) {
  const rowRef = React.useRef<HTMLDivElement>(null);

  const scrollRight = () => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: 500, behavior: 'smooth' });
    }
  };

  return (
    <section id={`lib-${lib.id}`} className="space-y-3 scroll-mt-20 relative group">
      <h2 className="text-sm font-bold text-white tracking-wide hover:text-emerald-400 cursor-pointer flex items-center gap-1">
        {lib.name} <span className="text-zinc-600 text-base ml-1">›</span>
      </h2>

      {/* Conteneur englobant pour positionner le bouton absolu */}
      <div className="relative">
        <div 
          ref={rowRef}
          className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-none"
        >
          {lib.movies.map((movie: any) => {
            const imageUrl = `http://192.168.220.148:8096/Items/${movie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}`;
            const isWatched = movie.UserData?.Played === true;

            return (
              <div key={movie.Id} className="w-[150px] shrink-0 group/card snap-start cursor-pointer relative">
                
                {/* Jaquette */}
                <div className="aspect-[2/3] w-full bg-zinc-900 rounded-md overflow-hidden border border-zinc-900 group-hover/card:border-zinc-600 transition-all duration-200 relative">
                  {movie.ImageTags && movie.ImageTags.Primary ? (
                    <img src={imageUrl} alt={movie.Name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20 text-xs">🎬</div>
                  )}

                  {/* Bouton Play & Menu Contextuel flouté Emby au Hover de la carte */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
                    <div className="flex justify-start">
                      <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-[10px] text-white">⋮</div>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center text-sm backdrop-blur-sm pl-0.5">▶</div>
                    </div>
                    <div className="flex justify-between text-[11px] text-white/80">
                      <span className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">⬇</span>
                      <span className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">♡</span>
                    </div>
                  </div>

                  {/* Badge vert de validation Emby si vu */}
                  {isWatched && (
                    <div className="absolute top-2 right-2 z-20 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-md border border-black/20">
                      ✓
                    </div>
                  )}
                </div>

                {/* Métadonnées */}
                <div className="mt-2 px-0.5">
                  <h4 className="font-semibold text-xs truncate text-zinc-300 group-hover/card:text-white transition-colors">
                    {movie.Name}
                  </h4>
                  {movie.ProductionYear && (
                    <p className="text-[10px] text-zinc-500 font-medium font-mono mt-0.5">{movie.ProductionYear}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 🔘 LE GROS BOUTON BLANC DE DEFILEMENT HORIZONTAL (Apparait uniquement au survol de la ligne) */}
        <button 
          onClick={scrollRight}
          className="absolute right-3 top-[35%] z-30 w-11 h-11 bg-white text-black rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-105"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </section>
  );
}