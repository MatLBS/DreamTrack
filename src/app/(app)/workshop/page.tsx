import { headers } from "next/headers";

import { WorkshopView } from "@/components/workshop/workshop-view";
import { auth } from "@/lib/auth";
import { listApplications } from "@/queries/application";
import { listUserDocuments } from "@/services/document";

export default async function WorkshopPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [documents, applications] = await Promise.all([
    listUserDocuments(session.user.id),
    listApplications(session.user.id),
  ]);

  const targets = applications.map((application) => ({
    id: application.id,
    company: application.company,
    role: application.role,
  }));

  return <WorkshopView initialDocuments={documents} targets={targets} />;
}
