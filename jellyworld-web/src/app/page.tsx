import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white p-8">
      {/* 🌟 BARRE DE NAVIGATION */}
      <header className="flex justify-between items-center mb-12 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-violet-400">
            JELLYWORLD
          </span>
          <span className="bg-purple-500/10 text-purple-400 text-xs font-bold px-2.5 py-1 rounded-full border border-purple-500/20">
            PREMIUM
          </span>
        </div>
        <nav className="flex gap-6 text-sm font-medium text-zinc-400">
          <a href="#" className="hover:text-white transition-colors text-white">Accueil</a>
          <a href="#" className="hover:text-white transition-colors">Films</a>
          <a href="#" className="hover:text-white transition-colors">Séries</a>
        </nav>
      </header>

      {/* 🎬 SECTION DESIGN DE BIENVENUE */}
      <section className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
          Votre univers média personnalisé.
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl">
          Connecté en temps réel à votre serveur Jellyfin dédié. Préparez-vous à une expérience de streaming ultra-fluide.
        </p>
      </section>

      {/* 📦 GRILLE DE FAUX FILMS (Pour tester le visuel) */}
      <section>
        <h2 className="text-xl font-bold text-zinc-300 mb-6 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-purple-500"></span>
          Ajouts récents
        </h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {/* Fausse Carte 1 */}
          <div className="group relative bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-4 transition-all duration-300 hover:scale-105 hover:bg-zinc-800 hover:shadow-xl hover:shadow-purple-500/5 cursor-pointer">
            <div className="aspect-[2/3] w-full bg-gradient-to-br from-purple-900/40 to-zinc-800 rounded-xl mb-4 flex items-center justify-center border border-zinc-700/30">
              <span className="text-4xl">🎬</span>
            </div>
            <h3 className="font-semibold text-zinc-200 group-hover:text-purple-400 transition-colors">Film Exemple 1</h3>
            <p className="text-xs text-zinc-500 mt-1">2026 • Science-Fiction</p>
          </div>

          {/* Fausse Carte 2 */}
          <div className="group relative bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-4 transition-all duration-300 hover:scale-105 hover:bg-zinc-800 hover:shadow-xl hover:shadow-purple-500/5 cursor-pointer">
            <div className="aspect-[2/3] w-full bg-gradient-to-br from-violet-900/40 to-zinc-800 rounded-xl mb-4 flex items-center justify-center border border-zinc-700/30">
              <span className="text-4xl">🍿</span>
            </div>
            <h3 className="font-semibold text-zinc-200 group-hover:text-purple-400 transition-colors">Film Exemple 2</h3>
            <p className="text-xs text-zinc-500 mt-1">2025 • Action</p>
          </div>
        </div>
      </section>
    </main>
  );
}