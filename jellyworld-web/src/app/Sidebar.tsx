'use client';

import React, { useState } from 'react';

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  library: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25zM20.25 7.5H3.75M3.75 12h16.5M3.75 16.5h16.5" />
    </svg>
  )
};

export default function Sidebar({ activeLibraries }: { activeLibraries: any[] }) {
  const [activeMenu, setActiveMenu] = useState<string>('home');

  return (
    <aside className="w-64 bg-[#0b0c10] border-r border-zinc-900 h-screen fixed top-0 left-0 flex flex-col z-40 select-none">
      
      {/* 👑 HEADER */}
      <div className="p-6 border-b border-zinc-900/50 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-500 rounded-xl p-[1.5px]">
          <div className="w-full h-full bg-[#0b0c10] rounded-[10px] flex items-center justify-center">
            <span className="text-sm">🌐</span>
          </div>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-black tracking-[0.25em] bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent uppercase">
            JELLYWORLD
          </span>
          <span className="text-[8px] font-mono font-black tracking-widest text-zinc-500 uppercase mt-0.5">
            Media Hub
          </span>
        </div>
      </div>

      {/* 🧭 MENU PRINCIPAL */}
      <div className="px-3 py-4 text-xs shrink-0">
        <a
          href="#catalog-top"
          onClick={() => setActiveMenu('home')}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 text-left ${
            activeMenu === 'home'
              ? 'bg-gradient-to-r from-purple-600/10 via-pink-600/5 to-transparent text-white border-l-2 border-pink-500'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
          }`}
        >
          <span className={activeMenu === 'home' ? 'text-pink-400' : 'text-zinc-500'}>
            {ICONS.home}
          </span>
          Accueil
        </a>
      </div>

      {/* 🗂️ CATEGORIES */}
      <div className="px-3 flex-1 overflow-y-auto space-y-2 text-[11px] pb-10" style={{ scrollbarWidth: 'none' }}>
        <p className="text-[9px] font-black uppercase text-zinc-500 px-4 mb-2 tracking-widest">
          Catégories
        </p>
        
        <nav className="space-y-1">
          {activeLibraries.map((lib) => {
            const isSelected = activeMenu === lib.id;
            return (
              <a
                key={lib.id}
                href={`#lib-${lib.id}`}
                onClick={() => setActiveMenu(lib.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group text-left ${
                  isSelected 
                    ? 'text-white bg-zinc-900/80 font-bold' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                }`}
              >
                <span className={`transition-colors text-xs ${isSelected ? 'text-purple-400' : 'text-zinc-600 group-hover:text-purple-400'}`}>
                  {ICONS.library}
                </span>
                <span className="truncate tracking-wide font-medium">{lib.name}</span>
              </a>
            );
          })}
        </nav>
      </div>

      {/* 👤 BOTTOM USER BAR */}
      <div className="p-4 border-t border-zinc-900/60 bg-[#08090d]/50 shrink-0 flex items-center gap-3 text-left">
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-bold text-[10px] text-white">
          A
        </div>
        <div className="flex flex-col truncate">
          <span className="text-[11px] font-bold text-zinc-200 truncate">Adminroot</span>
          <span className="text-[9px] font-mono text-emerald-500 font-medium">En ligne</span>
        </div>
      </div>

    </aside>
  );
}