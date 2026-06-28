import React from 'react';
import MovieRow from './MovieRow';

export const dynamic = 'force-dynamic';

async function getFirstUserId() {
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Users`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${process.env.JELLYFIN_API_KEY}"`,
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
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Users/${userId}/Views`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${process.env.JELLYFIN_API_KEY}"`,
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
  const url = `${process.env.JELLYFIN_INTERNAL_URL}/Users/${userId}/Items?ParentId=${parentId}&IncludeItemTypes=Movie,BoxSet&Recursive=true&Fields=PrimaryImageAspectRatio,ImageTags,ProductionYear,UserData&Limit=40`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `MediaBrowser Token="${process.env.JELLYFIN_API_KEY}"`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    
    // On construit l'URL de l'image ici avec la clé serveur pour que le client n'ait rien à deviner
    const apiKey = process.env.JELLYFIN_API_KEY || "";
    return (data.Items || []).map((item: any) => ({
      ...item,
      computedImageUrl: `http://192.168.220.148:8096/Items/${item.Id}/Images/Primary?api_key=${apiKey}`
    }));
  } catch (error) {
    return [];
  }
}

export default async function Home() {
  const userId = await getFirstUserId();
  
  if (!userId) {
    return (
      <div className="h-screen w-screen bg-[#07070a] text-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Backend Jellyfin injoignable (Maintenance)</p>
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

      <main className="space-y-12">
        {activeLibraries.map((lib) => (
          <MovieRow key={lib.id} lib={lib} />
        ))}
      </main>
    </div>
  );
}