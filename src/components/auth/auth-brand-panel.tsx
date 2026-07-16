"use client";

import dynamic from "next/dynamic";
import Image from "next/image";

import { useT } from "@/lib/i18n/locale-provider";

const BeamsBackground = dynamic(() => import("./beams-background"), {
  ssr: false,
});

export function AuthBrandPanel() {
  const t = useT();
  return (
    <div className="relative hidden h-full w-full overflow-hidden bg-neutral-950 lg:flex">
      <div className="absolute inset-0 z-0">
        <BeamsBackground rotation={30} speed={1.5} />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col p-12">
        <div className="flex items-center gap-2">
          <Image src="/icon-512x512.png" alt="Logo" width={40} height={40} />
          <span className="text-sm font-semibold text-white">DreamTrack</span>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-md space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              {t.auth.brandTitle}
            </h1>
            <p className="text-neutral-400">{t.auth.brandDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
