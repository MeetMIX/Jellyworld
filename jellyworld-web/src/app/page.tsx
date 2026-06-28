import React from 'react';

// 🎬 Récupérer TOUS les films avec le champ de leur bibliothèque d'origine
async function getJellyfinMovies() {
  // On ajoute "Fields=LibraryName" pour savoir dans quel dossier est chaque film
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Items?IncludeItemTypes=Movie&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags,LibraryName`;

  try {
    if (!process.env.JELLYFIN_API_KEY) {
      console.error("Clé API Jellyfin manquante.");
      return [];
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${process.env.JELLYFIN_API_KEY}"`,
        'Accept': 'application/json'
      },
      next: { revalidate: 60 }
    });

    if (!res.ok) {
      console.error(`Erreur Jellyfin: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return data.Items || [];
  } catch (error) {
    console.error("Erreur récupération films:", error);
    return [];
  }
}

export default async function Home() {
  const allMovies = await getJellyfinMovies();

  // 📂 Tri et regroupement des films par bibliothèque côté Next.js
  const map: { [key: string]: any[] } = {};
  
  allMovies.forEach((movie: any) => {
    // Si Jellyfin ne renvoie pas de LibraryName, on le met dans "Films" par défaut
    const libraryName = movie.LibraryName || "Films";
    if (!map[libraryName]) {
      map[libraryName] = [];
    }
    map[libraryName].push(movie);
  });

  // Transformation de l'objet en tableau pour pouvoir le mapper proprement en JSX
  const librariesWithMovies = Object.keys(map).map((name) => ({
    name: name,
    movies: map[name]
  }));

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-purple-500/30">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/60 border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-500 bg-clip-text text-transparent">
              JELLYWORLD
            </span>
            <span className="text-[10px] uppercase tracking-widest bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full font-bold border border-purple-500/20">
              Premium
            </span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-xs shadow-md border border-purple-400/20">
          M
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 md:px-12 py-8 max-w-7xl mx-auto space-y-16">
        
        {librariesWithMovies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-950/40 border border-dashed border-zinc-900 rounded-2xl text-center p-6">
            <span className="text-3xl mb-3">🔑</span>
            <p className="text-sm font-medium text-zinc-400">Aucun film trouvé.</p>
          </div>
        ) : (
          librariesWithMovies.map((lib) => (
            <section key={lib.name} className="space-y-6">
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
  );
}