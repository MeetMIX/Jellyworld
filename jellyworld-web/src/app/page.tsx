import React from 'react';

// 🛠️ Appel API (toujours prêt pour ta future clé)
async function getJellyfinMovies() {
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Items?IncludeItemTypes=Movie&Recursive=true&Fields=PrimaryImageAspectRatio`;
  
  try {
    if (!process.env.JELLYFIN_API_KEY) return [];
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
    console.error("Erreur lors de la récupération des films:", error);
    return [];
  }
}

export default async function Home() {
  const movies = await getJellyfinMovies();
  const ubuntuIp = process.env.NEXT_PUBLIC_UBUNTU_IP;

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans antialiased">
      
      {/* 🌟 BARRE DE NAVIGATION FLOTTANTE */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-zinc-950/80 border-b border-zinc-900 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-violet-400">
              JELLYWORLD
            </span>
            <span className="bg-purple-500/10 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/20">
              PREMIUM
            </span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-400">
            <a href="#" className="hover:text-white transition-colors text-white">Accueil</a>
            <a href="#" className="hover:text-white transition-colors">Films</a>
            <a href="#" className="hover:text-white transition-colors">Séries</a>
          </nav>
        </div>

        {/* Barre de recherche */}
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500 text-sm">🔍</span>
            <input 
              type="text" 
              placeholder="Rechercher un film, une série..." 
              className="bg-zinc-900 border border-zinc-800 text-sm rounded-full pl-9 pr-4 py-1.5 w-64 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-600 to-violet-500 flex items-center justify-center text-xs font-bold border border-purple-400/20 shadow-lg cursor-pointer">
            M
          </div>
        </div>
      </header>

      {/* 🎬 BANNIÈRE PRINCIPALE (HERO BANNER) */}
      <section className="relative w-full h-[45vh] sm:h-[55vh] bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-950 border-b border-zinc-900 flex items-center px-8 overflow-hidden">
        {/* Effet de lueur en arrière-plan */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[140%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 max-w-2xl">
          <span className="text-purple-400 text-xs font-bold uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-md border border-purple-500/20">
            À la une aujourd'hui
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mt-4 mb-4 bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
            Bienvenue dans Jellyworld
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 mb-6 leading-relaxed">
            Votre lecteur multimédia personnel est prêt. Une fois votre clé d'API Jellyfin configurée ({ubuntuIp || 'IP non configurée'}), tout votre catalogue sera synchronisé ici avec une interface réinventée.
          </p>
          <div className="flex gap-4">
            <button className="bg-white text-black font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-zinc-200 transition-all shadow-lg flex items-center gap-2">
              <span>▶</span> Lecture rapide
            </button>
            <button className="bg-zinc-800/80 border border-zinc-700/50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-zinc-700 transition-all backdrop-blur-sm">
              Plus d'infos
            </button>
          </div>
        </div>
      </section>

      {/* 📦 CONTENU / GRILLE */}
      <section className="p-8">
        <h2 className="text-xl font-bold text-zinc-200 mb-6 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
          Ma Bibliothèque Jellyfin ({movies.length})
        </h2>
        
        {movies.length === 0 ? (
          /* État d'attente stylisé */
          <div className="border border-dashed border-zinc-800 bg-zinc-900/20 rounded-2xl p-12 text-center max-w-xl mx-auto mt-8">
            <div className="text-4xl mb-4">🔑</div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">Prêt pour la synchronisation</h3>
            <p className="text-sm text-zinc-500 leading-relaxed mb-4">
              Ajoutez votre clé d'API dans le fichier <code className="text-purple-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-xs">.env.local</code> pour remplacer cet écran par vos propres films.
            </p>
          </div>
        ) : (
          /* La grille de vrais films (quand la clé sera là) */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {movies.map((movie: any) => {
              const imageUrl = `http://${ubuntuIp}:8096/Items/${movie.Id}/Images/Primary`;
              return (
                <div key={movie.Id} className="group relative bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-3 transition-all duration-300 hover:scale-[1.03] hover:bg-zinc-900 hover:border-purple-500/40 cursor-pointer">
                  <div className="aspect-[2/3] w-full rounded-xl mb-3 overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                    {movie.HasImage ? (
                      <img 
                        src={`${imageUrl}?maxWidth=400`} 
                        alt={movie.Name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-4xl">🎬</span>
                    )}
                  </div>
                  <h3 className="font-medium text-sm text-zinc-200 group-hover:text-purple-400 transition-colors truncate" title={movie.Name}>
                    {movie.Name}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {movie.ProductionYear || '—'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </main>
  );
}