'use client';

import React, { useRef, useState, useEffect } from 'react';

export default function MovieRow({ lib }: { lib: any }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Sécurise l'hydratation côté client pour s'assurer que le JS s'active bien
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const scrollRight = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (rowRef.current) {
      rowRef.current.scrollBy({
        left: 500,
        behavior: 'smooth'
      });
    }
  };

  const renderRuntime = (ticks: number) => {
    if (!ticks) return null;
    const minutes = Math.floor(ticks / 600000000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (!isMounted) {
    return <div className="h-44 bg-zinc-950/10 animate-pulse rounded-lg" />;
  }

  return (
    <section id={`lib-${lib.id}`} className="space-y-3 scroll-mt-20 relative group">
      <h2 className="text-sm font-bold text-white tracking-wide hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-purple-400 hover:to-pink-500 cursor-pointer flex items-center gap-1 transition-all">
        {lib.name} <span className="text-zinc-600 text-base ml-1 group-hover:text-purple-400">›</span>
      </h2>

      <div className="relative">
        {/* Rail de défilement horizontal */}
        <div 
          ref={rowRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth min-w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {lib.movies.map((movie: any) => {
            // 🔧 Utilisation de la clé API publique passée de manière sécurisée ou fallback direct
            const apiKey = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY || "0111461657f84b4384c8fe7afe4a50de";
            const imageUrl = `http://192.168.220.148:8096/Items/${movie.Id}/Images/Primary?api_key=${apiKey}`;
            const isWatched = movie.UserData?.Played === true;

            return (
              <div 
                key={movie.Id} 
                className="w-[150px] shrink-0 group/card cursor-pointer relative select-none"
                onClick={() => setSelectedMovie(movie)}
              >
                {/* Conteneur de la Jaquette */}
                <div className="aspect-[2/3] w-full bg-zinc-900 rounded-md overflow-hidden border border-zinc-900 group-hover/card:border-purple-500/50 transition-all duration-200 relative">
                  {movie.ImageTags?.Primary ? (
                    <img 
                      src={imageUrl} 
                      alt={movie.Name} 
                      loading="lazy" 
                      className="w-full h-full object-cover pointer-events-none"
                      onError={(e) => {
                        // Empêche le soft-crash de l'interface en cas de 404 sur une image spécifique
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLDivElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}

                  {/* Placeholder si l'image est manquante ou en erreur */}
                  <div 
                    className="w-full h-full flex items-center justify-center bg-zinc-950 text-zinc-700 text-xs font-bold"
                    style={{ display: movie.ImageTags?.Primary ? 'none' : 'flex' }}
                  >
                    🎬 NO IMAGE
                  </div>

                  {/* Interface de survol (Hover Actions) */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
                    <div className="flex justify-start">
                      <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-[10px] text-white hover:bg-purple-600">⋮</div>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-red-500 text-white flex items-center justify-center text-sm shadow-[0_0_15px_rgba(168,85,247,0.5)] pl-0.5 transform scale-90 group-hover/card:scale-100 transition-transform duration-300">▶</div>
                    </div>
                    <div className="flex justify-between text-[11px] text-white/80">
                      <span className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:text-pink-400">⬇</span>
                      <span className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:text-red-400">♡</span>
                    </div>
                  </div>

                  {isWatched && (
                    <div className="absolute top-2 right-2 z-20 w-5 h-5 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md">
                      ✓
                    </div>
                  )}
                </div>

                {/* Titre et Année */}
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

        {/* 🔘 Bouton de navigation droite (Style épuré blanc à flèche noire) */}
        <button 
          onClick={scrollRight}
          type="button"
          className="absolute right-3 top-[35%] z-40 w-11 h-11 bg-white text-black rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.8)] opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
          aria-label="Défiler à droite"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 pointer-events-none">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* POPUP DE LA FICHE DU FILM (Modale) */}
      {selectedMovie && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setSelectedMovie(null)}
        >
          <div 
            className="bg-[#0c0e12] border border-zinc-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative flex flex-col md:flex-row text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full md:w-2/5 aspect-[2/3] md:aspect-auto bg-zinc-950 relative shrink-0">
              <img 
                src={`http://192.168.220.148:8096/Items/${selectedMovie.Id}/Images/Primary?api_key=${process.env.NEXT_PUBLIC_JELLYFIN_API_KEY || "0111461657f84b4384c8fe7afe4a50de"}`} 
                alt="" 
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>

            <div className="p-6 flex flex-col justify-between flex-1 space-y-4">
              <div>
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-xl font-bold text-white tracking-wide">{selectedMovie.Name}</h3>
                  <button 
                    onClick={() => setSelectedMovie(null)}
                    className="text-zinc-500 hover:text-white text-lg bg-zinc-900/50 w-7 h-7 rounded-full flex items-center justify-center border border-zinc-800 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 mt-2">
                  {selectedMovie.ProductionYear && (
                    <span className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{selectedMovie.ProductionYear}</span>
                  )}
                  {selectedMovie.RunTimeTicks && (
                    <span>{renderRuntime(selectedMovie.RunTimeTicks)}</span>
                  )}
                  {selectedMovie.UserData?.CommunityRating && (
                    <span className="text-yellow-500">⭐ {selectedMovie.UserData.CommunityRating.toFixed(1)}</span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 mt-4 leading-relaxed max-h-48 overflow-y-auto pr-2">
                  {selectedMovie.Overview || "Aucun résumé disponible pour ce titre."}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button 
                  onClick={() => alert(`Lancement de : ${selectedMovie.Name}`)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  ▶ Lecture
                </button>
                <button className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg hover:bg-zinc-800 cursor-pointer">
                  ♡
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}