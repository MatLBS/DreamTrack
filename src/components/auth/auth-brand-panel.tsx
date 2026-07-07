"use client";

import dynamic from "next/dynamic";

const BeamsBackground = dynamic(() => import("./beams-background"), {
  ssr: false,
});

export function AuthBrandPanel() {
  return (
    <div className="relative hidden h-full w-full overflow-hidden bg-neutral-950 lg:flex">
      <div className="absolute inset-0 z-0">
        <BeamsBackground rotation={30} speed={1.5} />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col p-12">
        <div className="flex items-center gap-2">
          <span className="size-6 rounded-md bg-rose-900" aria-hidden />
          <span className="text-sm font-semibold text-white">DreamTrack</span>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-md space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Pilotez votre recherche d&apos;emploi comme un pro.
            </h1>
            <p className="text-neutral-400">
              Kanban, statistiques et veille IA réunis dans un seul espace de
              travail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
