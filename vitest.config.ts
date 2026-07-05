import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // "forks" (process séparés) plutôt que "threads" (worker_threads) : le binding
    // natif de libsql provoque des erreurs I/O (fstat) sous worker_threads.
    pool: "forks",
    setupFiles: ["./src/test/setup.ts"],
    // Un seul fichier SQLite partagé par tous les fichiers de test : on désactive
    // le parallélisme entre fichiers pour éviter les écritures concurrentes.
    // (`:memory:` casse dès qu'un `db.transaction()` s'exécute : le driver
    // @libsql/client détache sa connexion après le BEGIN et en rouvre une nouvelle
    // — vide — au prochain usage, perdant tout le schéma.)
    fileParallelism: false,
    env: {
      DATABASE_URL: `file:${path.resolve(__dirname, "src/test.db")}`,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
