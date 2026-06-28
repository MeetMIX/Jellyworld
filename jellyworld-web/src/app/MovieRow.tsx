'use client';

import React, { useRef } from 'react';

export default function MovieRow({ lib }: { lib: any }) {
  const rowRef = useRef<HTMLDivElement>(null);

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

      <div className="relative">
        <div 
          ref={rowRef}
          className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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

                  {/* Options au survol (Play, favoris...) */}
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

                  {/* Badge de validation si vu */}
                  {isWatched && (
                    <div className="absolute top-2 right-2 z-20 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-md">
                      ✓
                    </div>
                  )}
                </div>

                {/* Titre & Année */}
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

        {/* Le gros bouton blanc fléché d'Emby */}
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