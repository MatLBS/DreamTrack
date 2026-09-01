import type { Profile } from "@/db/schema";
import type { LlmProvider } from "@/lib/validation/llm-credential";

export interface AiWatchPipelineInput {
  userId: string;
  profile: Profile;
  provider: LlmProvider;
  apiKey: string;
  modelScoring: string | null;
}

export interface ScoredOffer {
  source: string;
  externalId: string;
  company: string;
  role: string;
  url: string;
  location: string | null;
  description: string | null;
  matchScore: number;
  matchReason: string | null;
}

export type ProgressReporter = (step: string, detail?: string) => void;

/**
 * Contrat stable entre l'ordonnancement (Next.js) et la pipeline agentique
 * (scrape → normalise → matche → score) : n'importe quelle implémentation
 * (locale ou distante) peut se brancher ici sans toucher au reste.
 */
export interface AiWatchPipeline {
  run(
    input: AiWatchPipelineInput,
    onProgress: ProgressReporter,
  ): Promise<ScoredOffer[]>;
}

/**
 * Bouchon : ne scrape rien, ne renvoie aucune offre. Rend testable de bout en
 * bout (cron → persistance → SSE → UI) avant que la vraie pipeline existe.
 */
export class StubPipeline implements AiWatchPipeline {
  async run(
    input: AiWatchPipelineInput,
    onProgress: ProgressReporter,
  ): Promise<ScoredOffer[]> {
    onProgress("started", `userId=${input.userId}`);
    onProgress("finished", "0 offer(s) found (stub pipeline)");
    return [];
  }
}

/**
 * Pipeline HTTP : appelle le service Python FastAPI pour fetch + scoring.
 */
export class RemoteHttpPipeline implements AiWatchPipeline {
  constructor(private baseUrl: string) {}

  async run(
    input: AiWatchPipelineInput,
    onProgress: ProgressReporter,
  ): Promise<ScoredOffer[]> {
    onProgress("started", `userId=${input.userId}`);
    onProgress("fetching", "Calling Python AI Watch service");

    const response = await fetch(`${this.baseUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: input.userId,
        profile: {
          desiredPositions: input.profile.desiredPositions,
          locations: input.profile.locations,
          skills: input.profile.skills,
          industries: input.profile.industries,
          workplacePreference: input.profile.workplacePreference,
          yearsOfExperience: input.profile.yearsOfExperience,
          salaryMin: input.profile.salaryMin,
          salaryMax: input.profile.salaryMax,
        },
        provider: input.provider,
        apiKey: input.apiKey,
        modelScoring: input.modelScoring,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Python service error (${response.status}): ${errorText}`,
      );
    }

    const data = await response.json();
    onProgress("finished", `${data.offers.length} offer(s) found`);
    return data.offers;
  }
}

/** Implémentation active : appelle le service Python via HTTP. */
export function resolvePipeline(): AiWatchPipeline {
  const pythonUrl =
    process.env.AI_WATCH_PYTHON_SERVICE_URL || "http://localhost:8008";
  return new RemoteHttpPipeline(pythonUrl);
}
