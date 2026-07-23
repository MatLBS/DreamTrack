/** Hook Next.js exécuté une fois au démarrage du serveur (pas à chaque requête). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startScheduler } = await import("@/services/ai-watch/scheduler");
  startScheduler();
}
