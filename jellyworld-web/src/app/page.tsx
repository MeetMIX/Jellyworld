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
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Items?ParentId=${parentId}&IncludeItemTypes=Movie&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags`;
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

  // On ne garde que les sections qui contiennent des films
  const activeLibraries = librariesWithMovies.filter(lib => lib.movies.length > 0);

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-purple-500/30 scroll-smooth">
      
      {/* 🔝 HEADER FIXE */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/60 border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-500 bg-clip-text text-transparent">
            JELLYWORLD
          </span>
          <span className="text-[10px] uppercase tracking-widest bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full font-bold border border-purple-500/20">
            Premium
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-xs shadow-md border border-purple-400/20">
          M
        </div>
      </header>

      {/* 🔲 CONTENEUR PRINCIPAL (Sidebar + Contenu) */}
      <div className="flex min-h-[calc(100-screen-73px)]">
        
        {/* 👈 SIDEBAR GAUCHE (Fixe lors du scroll) */}
        <aside className="w-64 border-r border-zinc-900 bg-zinc-950/50 p-6 hidden md:block sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto space-y-8">
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 px-2">
              Bibliothèques
            </p>
            <nav className="space-y-1">
              {activeLibraries.map((lib) => (
                <a
                  key={lib.id}
                  href={`#lib-${lib.id}`}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-purple-400 hover:bg-purple-500/5 border border-transparent hover:border-purple-500/10 transition-all group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-zinc-600 group-hover:text-purple-400 transition-colors">📂</span>
                    <span className="truncate">{lib.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold bg-zinc-900 text-zinc-500 group-hover:bg-purple-500/10 group-hover:text-purple-400 px-2 py-0.5 rounded-md transition-all border border-zinc-800 group-hover:border-purple-500/10">
                    {lib.movies.length}
                  </span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* 👉 GRILLE DE FILMS À DROITE */}
        <main className="flex-1 px-6 md:px-12 py-8 space-y-16 overflow-x-hidden">
          {activeLibraries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-zinc-950/40 border border-dashed border-zinc-900 rounded-2xl text-center p-6">
              <span className="text-3xl mb-3">📂</span>
              <p className="text-sm font-medium text-zinc-400">Aucune bibliothèque disponible.</p>
            </div>
          ) : (
            activeLibraries.map((lib) => (
              // L'id sert de point d'ancrage pour la Sidebar avec le défilement fluide
              <section key={lib.id} id={`lib-${lib.id}`} className="space-y-6 scroll-mt-24">
                
                {/* Titre de la section */}
                <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                  <h2 className="text-xl font-bold tracking-tight">
                    {lib.name} <span className="text-purple-400 font-medium text-sm ml-1">({lib.movies.length})</span>
                  </h2>
                </div>

                {/* Grille */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {lib.movies.map((movie: any) => {
                    const imageUrl = `http://192.168.220.148:8096/Items/${movie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY}`;
                    
                    return (
                      <div key={movie.Id} className="group relative bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-3 transition-all duration-300 hover:scale-[1.03] hover:bg-zinc-900 hover:border-purple-500/40 cursor-pointer">
                        <div className="aspect-[2/3] w-full rounded-xl mb-3 overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center relative shadow-inner">
                          {movie.ImageTags && movie.ImageTags.Primary ? (
                            <img 
                              src={imageUrl} 
                              alt={movie.Name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-zinc-700 group-hover:text-zinc-500 transition-colors">
                              <span className="text-2xl">🎬</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1 px-1">
                          <h3 className="font-semibold text-xs truncate text-zinc-200 group-hover:text-purple-400 transition-colors">
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
            ))
          )}
        </main>

      </div>
    </div>
  );
}