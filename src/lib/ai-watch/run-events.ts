import { EventEmitter } from "node:events";

import type { ServiceErrorCode } from "@/services/errors";

export type RunEvent =
  | { type: "run:started" }
  | { type: "run:progress"; step: string; detail?: string }
  | { type: "run:finished"; offerCount: number }
  | { type: "run:error"; message: string; code?: ServiceErrorCode };

/**
 * Bus en mémoire, un canal par utilisateur. Suffisant en mono-instance : si l'app
 * passe un jour à plusieurs instances Next.js, ce bus devra devenir externe
 * (ex. Redis pub/sub), sans quoi un client connecté à l'instance A ne verrait pas
 * un run déclenché sur l'instance B.
 */
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

function channel(userId: string): string {
  return `ai-watch:${userId}`;
}

export function emitRunEvent(userId: string, event: RunEvent): void {
  emitter.emit(channel(userId), event);
}

export function subscribeToRunEvents(
  userId: string,
  listener: (event: RunEvent) => void,
): () => void {
  emitter.on(channel(userId), listener);
  return () => emitter.off(channel(userId), listener);
}
