import type { Application } from "@/db/schema";
import { createApplication, moveApplication } from "@/services/application";
import { listColumns } from "@/queries/column";

/** company/role pairs, one entry per fake application, spread across columns below. */
const ENTRIES: {
  company: string;
  role: string;
  url?: string;
  notes?: string;
}[] = [
  {
    company: "Spotify",
    role: "Data Engineer",
    url: "https://spotify.com/careers/1",
  },
  { company: "Datadog", role: "AI Engineer" },
  {
    company: "Doctolib",
    role: "Full-Stack Developer",
    notes: "Referral via Camille",
  },
  { company: "Back Market", role: "Backend Developer" },
  {
    company: "Qonto",
    role: "Frontend Developer",
    url: "https://qonto.com/careers/2",
  },
  { company: "Alan", role: "DevOps Engineer" },
  {
    company: "Mistral AI",
    role: "Machine Learning Engineer",
    notes: "Technical test scheduled",
  },
  { company: "Deezer", role: "Software Engineer" },
  { company: "BlaBlaCar", role: "Data Analyst" },
  { company: "Scaleway", role: "Cloud Engineer" },
  { company: "PayFit", role: "Site Reliability Engineer" },
  {
    company: "Contentsquare",
    role: "Product Engineer",
    url: "https://contentsquare.com/jobs/3",
  },
  { company: "Swile", role: "Mobile Developer (iOS)" },
  { company: "OVHcloud", role: "Platform Engineer" },
  { company: "Ledger", role: "QA Engineer" },
  {
    company: "Dataiku",
    role: "Data Scientist",
    notes: "Second interview went well",
  },
  { company: "Algolia", role: "Solutions Architect" },
  { company: "Sorare", role: "Technical Lead" },
  { company: "Voodoo", role: "Engineering Manager" },
  { company: "Shift Technology", role: "Security Engineer" },
];

/** Répartition en 3 couches, conforme au design : la 1re colonne branche directement
 * vers Replies/Rejections/No reply ; seule Replies rebranche ensuite vers Accepted/Rejected. */
const REJECTIONS_COUNT = 5;
const NO_REPLY_COUNT = 4;
const REPLIES_COUNT = ENTRIES.length - REJECTIONS_COUNT - NO_REPLY_COUNT; // 11
const ACCEPTED_COUNT = 2;
const REJECTED_COUNT = 4; // reste 5 dans Replies

/** Toujours au-delà de la taille de la colonne cible → le service clampe en fin de colonne. */
const APPEND_AT_END = Number.MAX_SAFE_INTEGER;

function findColumn(columns: { id: string; name: string }[], name: string) {
  const column = columns.find((c) => c.name === name);
  if (!column) {
    throw new Error(
      `Column "${name}" not found — run \`npm run db:seed\` first`,
    );
  }
  return column;
}

async function main() {
  const columns = await listColumns();
  const jobsApplied = findColumn(columns, "Jobs applied to");
  const replies = findColumn(columns, "Replies");
  const rejections = findColumn(columns, "Rejections");
  const noReply = findColumn(columns, "No reply");
  const accepted = findColumn(columns, "Accepted");
  const rejected = findColumn(columns, "Rejected");

  const applications: Application[] = [];
  for (const entry of ENTRIES) {
    applications.push(
      await createApplication({ ...entry, columnId: jobsApplied.id }),
    );
  }

  let cursor = 0;
  async function moveNext(count: number, toColumnId: string) {
    const moved = [];
    for (let i = 0; i < count; i++) {
      const application = applications[cursor++];
      moved.push(
        await moveApplication(application.id, {
          toColumnId,
          toIndex: APPEND_AT_END,
        }),
      );
    }
    return moved;
  }

  const movedToReplies = await moveNext(REPLIES_COUNT, replies.id);
  await moveNext(REJECTIONS_COUNT, rejections.id);
  await moveNext(NO_REPLY_COUNT, noReply.id);

  let repliesCursor = 0;
  async function moveFromReplies(count: number, toColumnId: string) {
    for (let i = 0; i < count; i++) {
      const application = movedToReplies[repliesCursor++];
      await moveApplication(application.id, {
        toColumnId,
        toIndex: APPEND_AT_END,
      });
    }
  }

  await moveFromReplies(ACCEPTED_COUNT, accepted.id);
  await moveFromReplies(REJECTED_COUNT, rejected.id);

  console.log(
    `✓ Seeded ${applications.length} fake applications with a 3-layer transition history`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
