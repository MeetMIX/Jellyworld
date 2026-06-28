import React from 'react';

// 🎬 Fonction de récupération des films (Exécutée côté serveur par Next.js)
async function getJellyfinMovies() {
  // On utilise l'URL interne du réseau Docker pour la requête serveur
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Items?IncludeItemTypes=Movie&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags`;

  try {
    if (!process.env.JELLYFIN_API_KEY) {
      console.error("Clé API Jellyfin manquante dans l'environnement backend.");
      return [];
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${process.env.JELLYFIN_API_KEY}"`,
        'Accept': 'application/json'
      },
      next: { revalidate: 60 } // Met à jour le cache toutes les minutes
    });

    if (!res.ok) {
      console.error(`Erreur serveur Jellyfin: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return data.Items || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des films:", error);
    return [];
  }
}

export default async function Home() {
  const movies = await getJellyfinMovies();

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
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <a href="#" className="text-white hover:text-white transition-colors">Accueil</a>
            <a href="#" className="hover:text-white transition-colors">Films</a>
            <a href="#" className="hover:text-white transition-colors">Séries</a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <input 
              type="text" 
              placeholder="Rechercher un film, une série..." 
              className="bg-zinc-900/80 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-xs w-64 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all text-zinc-200 placeholder:text-zinc-500"
            />
            <span className="absolute left-3.5 top-2.5 text-zinc-500 text-xs">🔍</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-xs shadow-md border border-purple-400/20">
            M
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-6 md:px-12 py-8 max-w-7xl mx-auto space-y-12">
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-transparent border border-zinc-900 p-8 md:p-12 min-h-[380px] flex flex-col justify-center space-y-6 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.08),transparent_45%)]" />
          <span className="text-[10px] uppercase tracking-widest bg-purple-500/10 text-purple-300 w-max px-2.5 py-1 rounded-md font-bold border border-purple-500/20">
            À la une aujourd'hui
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight max-w-2xl leading-tight">
            Bienvenue dans <br />
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">Jellyworld</span>
          </h1>
          <p className="text-sm md:text-base text-zinc-400 max-w-xl leading-relaxed font-light">
            Votre lecteur multimédia personnel est prêt. Tout votre catalogue est maintenant synchronisé en temps réel avec une interface réinventée, fluide et moderne.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button className="bg-white text-black font-semibold text-xs px-6 py-3 rounded-xl hover:bg-zinc-200 transition-all shadow-lg flex items-center gap-2">
              <span>▶</span> Lecture rapide
            </button>
            <button className="bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300 font-semibold text-xs px-6 py-3 rounded-xl transition-all">
              Plus d'infos
            </button>
          </div>
        </section>

        {/* Movies Grid Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
              <h2 className="text-lg font-bold tracking-tight">
                Ma Bibliothèque Jellyfin <span className="text-purple-400 font-medium ml-1">({movies.length})</span>
              </h2>
            </div>
          </div>

          {movies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-zinc-950/40 border border-dashed border-zinc-900 rounded-2xl text-center p-6">
              <span className="text-3xl mb-3">🔑</span>
              <p className="text-sm font-medium text-zinc-400">Aucun film trouvé.</p>
              <p className="text-xs text-zinc-600 mt-1 max-w-xs">
                Vérifiez la connexion réseau avec le conteneur ou assurez-vous d'avoir des médias catégorisés comme "Films".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {movies.map((movie: any) => {
                // Utilisation de l'IP externe pour que le navigateur du PC puisse télécharger l'affiche
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
          )}
        </section>
      </main>
    </div>
  );
}