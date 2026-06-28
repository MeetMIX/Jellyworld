import React from 'react';

// 📂 1. Récupérer les bibliothèques de l'utilisateur (ex: Films, Séries, Dessins Animés...)
async function getLibraries() {
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/UserViews`;
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
    // On ne garde que les bibliothèques de films ou de vidéos pour ce cas précis
    return data.Items.filter((item: any) => item.CollectionType === 'movies' || item.CollectionType === 'homevideos') || [];
  } catch (error) {
    console.error("Erreur bibliothèques:", error);
    return [];
  }
}

// 🎬 2. Récupérer les films d'une bibliothèque spécifique via son ParentId
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
  const libraries = await getLibraries();
  
  // On construit un tableau d'objets contenant la bibliothèque ET ses films
  const librariesWithMovies = await Promise.all(
    libraries.map(async (lib: any) => {
      const movies = await getMoviesByLibrary(lib.Id);
      return {
        id: lib.Id,
        name: lib.Name,
        movies: movies
      };
    })
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/60 border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
            JELLYWORLD
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-xs">
          M
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 md:px-12 py-8 max-w-7xl mx-auto space-y-16">
        
        {librariesWithMovies.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">Aucune bibliothèque de films trouvée.</div>
        ) : (
          librariesWithMovies.map((lib) => (
            // On cache les bibliothèques vides s'il y en a
            lib.movies.length > 0 && (
              <section key={lib.id} className="space-y-6">
                {/* Titre de la bibliothèque dynamique */}
                <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                  <h2 className="text-xl font-bold tracking-tight">
                    {lib.name} <span className="text-purple-400 font-medium text-sm ml-1">({lib.movies.length})</span>
                  </h2>
                </div>

                {/* Grille des films de CETTE bibliothèque */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
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
                            <span className="text-2xl">🎬</span>
                          )}
                        </div>
                        <h3 className="font-semibold text-xs truncate text-zinc-200 group-hover:text-purple-400 transition-colors">
                          {movie.Name}
                        </h3>
                      </div>
                    );
                  })}
                </div>
              </section>
            )
          ))
        )}
      </main>
    </div>
  );
}