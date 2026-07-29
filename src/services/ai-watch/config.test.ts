import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { aiWatchConfigs } from "@/db/schema";
import { getConfigByUserId } from "@/queries/ai-watch";
import { ServiceError } from "@/services/errors";
import { TEST_USER_ID } from "@/test/setup";
import { db } from "@/db";

import { triggerRun } from "./config";
import * as scheduler from "./scheduler";

// Mock le scheduler pour éviter l'exécution du pipeline complet
vi.mock("./scheduler", async (importOriginal) => {
  const actual = await importOriginal<typeof scheduler>();
  return {
    ...actual,
    runForUser: vi.fn(),
  };
});

describe("AI Watch config service", () => {
  beforeEach(async () => {
    // Nettoyer les configs de veille avant chaque test
    await db.delete(aiWatchConfigs);
    vi.clearAllMocks();
  });

  describe("triggerRun", () => {
    it("crée une config au premier run avec des valeurs par défaut conservatives", async () => {
      // Vérifier qu'aucune config n'existe
      const configBefore = await getConfigByUserId(TEST_USER_ID);
      expect(configBefore).toBeUndefined();

      // Mock runForUser pour éviter l'exécution du pipeline
      vi.mocked(scheduler.runForUser).mockResolvedValueOnce(undefined);

      // Déclencher un run
      await triggerRun(TEST_USER_ID);

      // Vérifier que la config a été créée avec les bonnes valeurs par défaut
      const configAfter = await getConfigByUserId(TEST_USER_ID);
      expect(configAfter).toBeDefined();
      expect(configAfter?.enabled).toBe(false);
      expect(configAfter?.intervalMinutes).toBe(1440);
      expect(configAfter?.userId).toBe(TEST_USER_ID);

      // Vérifier que runForUser a été appelé
      expect(scheduler.runForUser).toHaveBeenCalledWith(TEST_USER_ID);
      expect(scheduler.runForUser).toHaveBeenCalledTimes(1);
    });

    it("utilise la config existante si présente", async () => {
      // Créer une config manuelle avec des valeurs spécifiques
      const [existingConfig] = await db
        .insert(aiWatchConfigs)
        .values({
          userId: TEST_USER_ID,
          enabled: true,
          intervalMinutes: 360,
        })
        .returning();

      // Mock runForUser
      vi.mocked(scheduler.runForUser).mockResolvedValueOnce(undefined);

      // Déclencher un run
      await triggerRun(TEST_USER_ID);

      // Vérifier que la config n'a pas été modifiée
      const configAfter = await getConfigByUserId(TEST_USER_ID);
      expect(configAfter?.id).toBe(existingConfig.id);
      expect(configAfter?.enabled).toBe(true);
      expect(configAfter?.intervalMinutes).toBe(360);

      // Vérifier que runForUser a été appelé
      expect(scheduler.runForUser).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it("la config auto-créée n'active pas le scheduler", async () => {
      // Mock runForUser
      vi.mocked(scheduler.runForUser).mockResolvedValueOnce(undefined);

      // Déclencher un run
      await triggerRun(TEST_USER_ID);

      // Récupérer la config créée
      const config = await getConfigByUserId(TEST_USER_ID);
      expect(config).toBeDefined();

      // Vérifier que isDue retourne false (car enabled=false)
      const now = new Date();
      const due = scheduler.isDue(config!, now);
      expect(due).toBe(false);
    });

    it("le run manuel fonctionne après auto-création", async () => {
      // Mock runForUser
      vi.mocked(scheduler.runForUser).mockResolvedValue(undefined);

      // Premier run : crée la config
      await triggerRun(TEST_USER_ID);

      // Deuxième run : devrait utiliser la config existante
      await triggerRun(TEST_USER_ID);

      // Vérifier qu'il n'y a qu'une seule config (pas de doublon)
      const configs = await db
        .select()
        .from(aiWatchConfigs)
        .where(eq(aiWatchConfigs.userId, TEST_USER_ID));
      expect(configs).toHaveLength(1);

      // Vérifier que runForUser a été appelé deux fois
      expect(scheduler.runForUser).toHaveBeenCalledTimes(2);
    });

    it("propage l'erreur RunInProgressError comme ServiceError", async () => {
      // Mock runForUser pour lancer RunInProgressError
      vi.mocked(scheduler.runForUser).mockRejectedValue(
        new scheduler.RunInProgressError("A run is already in progress"),
      );

      // Vérifier que l'erreur est propagée comme ServiceError
      await expect(triggerRun(TEST_USER_ID)).rejects.toThrow(ServiceError);

      // Vérifier le code d'erreur
      try {
        await triggerRun(TEST_USER_ID);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceError);
        expect((error as ServiceError).code).toBe("AI_WATCH_RUN_IN_PROGRESS");
      }
    });

    it("propage les erreurs du pipeline comme ServiceError", async () => {
      // Mock runForUser pour lancer une erreur générique
      vi.mocked(scheduler.runForUser).mockRejectedValue(
        new Error("Pipeline failed"),
      );

      // Vérifier que l'erreur est propagée comme ServiceError
      await expect(triggerRun(TEST_USER_ID)).rejects.toThrow(ServiceError);

      // Vérifier le code d'erreur
      try {
        await triggerRun(TEST_USER_ID);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceError);
        expect((error as ServiceError).code).toBe("AI_WATCH_PIPELINE_FAILED");
      }
    });
  });
});
