"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listCoverLettersAction } from "@/app/actions/cover-letter";
import { listDocumentsAction } from "@/app/actions/document";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CoverLetterRow, WorkshopDocumentRow } from "@/db/schema";
import { useT } from "@/lib/i18n/locale-provider";
import type { LetterTarget } from "@/lib/workshop/types";

import { DocumentsCard } from "./documents-card";
import { LetterGenerator } from "./letter-generator";
import { LetterResult } from "./letter-result";
import {
  COVER_LETTERS_QUERY_KEY,
  WORKSHOP_DOCUMENTS_QUERY_KEY,
} from "./query-keys";
import { SavedLettersCard } from "./saved-letters-card";

interface WorkshopViewProps {
  initialDocuments: WorkshopDocumentRow[];
  initialCoverLetters: CoverLetterRow[];
  targets: LetterTarget[];
}

export function WorkshopView({
  initialDocuments,
  initialCoverLetters,
  targets,
}: WorkshopViewProps) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<"documents" | "letter">(
    "documents",
  );
  const [openedLetter, setOpenedLetter] = useState<CoverLetterRow | null>(null);

  const documentsQuery = useQuery({
    queryKey: WORKSHOP_DOCUMENTS_QUERY_KEY,
    queryFn: async () => {
      const result = await listDocumentsAction();
      return result.ok ? result.data : [];
    },
    initialData: initialDocuments,
  });

  const lettersQuery = useQuery({
    queryKey: COVER_LETTERS_QUERY_KEY,
    queryFn: async () => {
      const result = await listCoverLettersAction();
      return result.ok ? result.data : [];
    },
    initialData: initialCoverLetters,
  });

  const hasReadyDocument = documentsQuery.data.some(
    (doc) => doc.status === "ready",
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 pt-24">
      <div>
        <h1 className="text-[22px] font-extrabold text-foreground">
          {t.workshop.title}
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          {t.workshop.subtitle}
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "documents" | "letter")}
      >
        <TabsList className="w-full">
          <TabsTrigger value="documents" className="flex-1">
            {t.workshop.tabDocuments}
          </TabsTrigger>
          <TabsTrigger value="letter" className="flex-1">
            {t.workshop.tabLetter}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-6">
          <DocumentsCard documents={documentsQuery.data} />
        </TabsContent>

        <TabsContent value="letter" className="mt-6">
          <div className="flex flex-col gap-6">
            <LetterGenerator
              hasReadyDocument={hasReadyDocument}
              targets={targets}
              onGoToDocuments={() => setActiveTab("documents")}
            />

            {openedLetter && (
              <LetterResult
                key={openedLetter.id}
                draft={{
                  paragraphs: openedLetter.paragraphs,
                  usedFacts: [],
                  insufficientContext: false,
                }}
                company={openedLetter.company}
                role={openedLetter.role}
                tone={openedLetter.tone}
                coverLetterId={openedLetter.id}
              />
            )}

            <SavedLettersCard
              letters={lettersQuery.data}
              onOpen={setOpenedLetter}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
