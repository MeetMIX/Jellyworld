import React from 'react';

export const dynamic = 'force-dynamic';

// 🔌 CONFIGURATION JELLYFIN EN DUR POUR LE TEST SÉCURISÉ
const JELLYFIN_URL = "http://192.168.220.148:8096";
const JELLYFIN_TOKEN = "0111461657f84b4384c8fe7afe4a50de";

// --- 1. FONCTIONS DE RÉCUPÉRATION DES DONNÉES (SERVEUR) ---

async function getFirstUserId() {
  const url = `${JELLYFIN_URL}/Users`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const users = await res.json();
    return users[0]?.Id || null;
  } catch (error) {
    return null;
  }
}

async function getUserLibraries(userId: string) {
  const url = `${JELLYFIN_URL}/Users/${userId}/Views`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.Items || [];
  } catch (error) {
    return [];
  }
}

async function getMoviesByLibrary(parentId: string, userId: string) {
  const url = `${JELLYFIN_URL}/Users/${userId}/Items?ParentId=${parentId}&IncludeItemTypes=Movie,BoxSet&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags,ProductionYear,UserData&Limit=40`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${JELLYFIN_TOKEN}"`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    
    return (data.Items || []).map((item: any) => ({
      ...item,
      computedImageUrl: `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${JELLYFIN_TOKEN}`
    }));
  } catch (error) {
    return [];
  }
}

// --- 2. COMPOSANT COMPAGNON D'AFFICHAGE BRUT ---

function MovieListRenderer({ activeLibraries }: { activeLibraries: any[] }) {
  return (
    <main className="space-y-12">
      {activeLibraries.map((lib) => (
        <section key={lib.id} className="space-y-4 text-left">
          <h2 className="text-lg font-bold text-white">{lib.name}</h2>

          <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
            {lib.movies.map((movie: any) => (
              <div key={movie.Id} className="w-[150px] shrink-0 group">
                <div className="aspect-[2/3] w-full bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 group-hover:border-purple-500 transition-colors">
                  {movie.ImageTags?.Primary ? (
                    <img 
                      src={movie.computedImageUrl} 
                      alt={movie.Name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs bg-zinc-950 font-bold">
                      🎬 NO IMAGE
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs font-semibold truncate text-zinc-300 group-hover:text-white">
                  {movie.Name}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

// --- 3. PAGE PRINCIPALE ---

export default async function Home() {
  const userId = await getFirstUserId();
  
  if (!userId) {
    return (
      <div className="h-screen w-screen bg-[#07070a] text-white flex flex-col items-center justify-center gap-2">
        <p className="text-sm font-bold text-red-500">Erreur : L'application n'arrive pas à joindre Jellyfin.</p>
        <p className="text-xs text-zinc-500">Adresse tentée : {JELLYFIN_URL}</p>
      </div>
    );
  }

  const libraries = await getUserLibraries(userId);
  const librariesWithMovies = await Promise.all(
    libraries.map(async (lib: any) => {
      const movies = await getMoviesByLibrary(lib.Id, userId);
      return { id: lib.Id, name: lib.Name, movies: movies };
    })
  );

  const activeLibraries = librariesWithMovies.filter(lib => lib.movies.length > 0);

  return (
    <div className="min-h-screen bg-[#07070a] text-[#f1f5f9] p-8 space-y-12">
      <header className="border-b border-zinc-900 pb-4">
        <h1 className="text-xl font-black tracking-widest text-white">JELLYWORLD</h1>
      </header>

      <MovieListRenderer activeLibraries={activeLibraries} />
    </div>
  );
}