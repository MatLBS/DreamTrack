import { ensureDefaultColumns } from "@/services/column";

ensureDefaultColumns()
  .then(() => console.log("✓ Default columns ensured"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
