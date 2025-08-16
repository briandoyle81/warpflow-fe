"use client";

import Header from "./components/Header";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[auto_1fr_20px] items-center justify-items-center min-h-screen gap-16 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start p-8 sm:p-20">
        <div className="text-center">
          <h2 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 tracking-wider mb-4">
            SPACESHIP TACTICS
          </h2>
          <p className="text-xl sm:text-2xl text-cyan-300 font-mono tracking-wider">
            [PvP COMBAT SIMULATOR]
          </p>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-cyan-400/60 font-mono text-sm tracking-wider">
        <span>⚡ WARPFLOW ALPHA ⚡</span>
      </footer>
    </div>
  );
}
