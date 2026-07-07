import { insertApplicationWithTransition } from "@/queries/application";
import { getMaxPositionInColumn } from "@/queries/application";
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

/** How many of the 20 entries land in each column, by position order. Sums to 20. */
const DISTRIBUTION = [6, 4, 3, 3, 2, 2];

async function main() {
  const columns = await listColumns();
  if (columns.length === 0) {
    throw new Error("No columns found — run `npm run db:seed` first");
  }

  let entryIndex = 0;
  for (let i = 0; i < columns.length && entryIndex < ENTRIES.length; i++) {
    const column = columns[i];
    const count = DISTRIBUTION[i] ?? 0;

    for (let j = 0; j < count && entryIndex < ENTRIES.length; j++) {
      const entry = ENTRIES[entryIndex];
      const maxPosition = await getMaxPositionInColumn(column.id);
      const position = (maxPosition ?? -1) + 1;

      await insertApplicationWithTransition({
        ...entry,
        columnId: column.id,
        position,
      });

      entryIndex++;
    }
  }

  console.log(`✓ Seeded ${entryIndex} fake applications`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
