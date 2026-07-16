"use client";

import { useState } from "react";

import type { Profile } from "@/db/schema";
import type { ApplicationStats } from "@/lib/stats/aggregate";
import { useT } from "@/lib/i18n/locale-provider";
import type { Dictionary } from "@/lib/i18n";

import { AccountSettingsCard } from "./account-settings-card";
import { EditAccountDialog } from "./edit-account-dialog";
import { EditProfileDialog } from "./edit-profile-dialog";
import { ModifyButton } from "./modify-button";
import { SpotlightCard } from "./spotlight-card";
import { TagList } from "./tag-list";

interface ProfileUser {
  name: string;
  email: string;
  image?: string | null;
}

interface ProfileViewProps {
  user: ProfileUser;
  profile: Profile | null;
  stats: ApplicationStats;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatSalary(
  t: Dictionary,
  min: number | null | undefined,
  max: number | null | undefined,
) {
  if (min == null && max == null) return t.profile.notProvided;
  if (min != null && max != null) return t.profile.salaryRange(min, max);
  if (min != null) return t.profile.salaryFromMin(min);
  return t.profile.salaryUpToMax(max!);
}

const sectionLabelClassName =
  "mb-[18px] text-[12px] font-bold tracking-[0.4px] text-[#6b6b76]";
const preferenceRowClassName =
  "flex items-center justify-between rounded-[12px] bg-[#f7f7f8] px-[18px] py-[14px] text-[14px] text-[#3a3a42]";
const preferenceListRowClassName =
  "flex flex-col gap-2.5 rounded-[12px] bg-[#f7f7f8] px-[18px] py-[14px] text-[14px] text-[#3a3a42]";

export function ProfileView({ user, profile, stats }: ProfileViewProps) {
  const t = useT();
  const [editOpen, setEditOpen] = useState(false);
  const [accountEditOpen, setAccountEditOpen] = useState(false);

  return (
    <div className="mx-auto max-w-[1680px] p-6 pt-24">
      <h1 className="mb-8 text-[28px] font-extrabold text-[#14161c]">
        {t.profile.title}
      </h1>

      <div className="flex flex-wrap items-start gap-[58px]">
        <div className="min-w-[504px] flex-1 space-y-[38px]">
          <SpotlightCard className="flex items-center gap-6">
            <div className="flex size-[116px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eee5cc] text-[19px] font-extrabold text-[#8a6d1a]">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                getInitials(user.name)
              )}
            </div>
            <div className="flex-1">
              <div className="text-[19px] font-extrabold text-[#14161c]">
                {user.name}
              </div>
              <div className="text-[13.5px] text-[#6b6b76]">{user.email}</div>
            </div>
            <ModifyButton onClick={() => setAccountEditOpen(true)} />
          </SpotlightCard>

          <SpotlightCard>
            <div className="mb-[18px] flex items-center justify-between">
              <div className="text-[12px] font-bold tracking-[0.4px] text-[#6b6b76]">
                {t.profile.preferencesSection}
              </div>
              <ModifyButton onClick={() => setEditOpen(true)} />
            </div>
            <div className="flex flex-col gap-3">
              <div className={preferenceListRowClassName}>
                <span>{t.profile.positionsLabel}</span>
                <TagList items={profile?.desiredPositions} />
              </div>
              <div className={preferenceListRowClassName}>
                <span>{t.profile.locationsLabel}</span>
                <TagList items={profile?.locations} />
              </div>
              <div className={preferenceRowClassName}>
                <span>{t.profile.salaryLabel}</span>
                <span className="font-bold">
                  {formatSalary(t, profile?.salaryMin, profile?.salaryMax)}
                </span>
              </div>
            </div>
          </SpotlightCard>
        </div>

        <div className="w-[480px] flex-none space-y-[38px]">
          <SpotlightCard>
            <div className={sectionLabelClassName}>
              {t.profile.statsSection}
            </div>
            <div className="grid grid-cols-2 gap-[19px]">
              <div className="rounded-[12px] bg-[#f7f7f8] p-[29px] text-center">
                <div className="text-[38px] font-extrabold text-[#14161c]">
                  {stats.total}
                </div>
                <div className="mt-1 text-[12px] text-[#6b6b76]">
                  {t.profile.totalLabel}
                </div>
              </div>
              <div className="rounded-[12px] bg-[#f7f7f8] p-[29px] text-center">
                <div className="text-[38px] font-extrabold text-[#14161c]">
                  {stats.responseRate}%
                </div>
                <div className="mt-1 text-[12px] text-[#6b6b76]">
                  {t.profile.responseRateLabel}
                </div>
              </div>
              <div className="rounded-[12px] bg-[#f7f7f8] p-[29px] text-center">
                <div className="text-[38px] font-extrabold text-[#14161c]">
                  {stats.pending}
                </div>
                <div className="mt-1 text-[12px] text-[#6b6b76]">
                  {t.profile.pendingLabel}
                </div>
              </div>
              <div className="rounded-[12px] bg-[#f7f7f8] p-[29px] text-center">
                <div className="text-[38px] font-extrabold text-[#14161c]">
                  {stats.offers}
                </div>
                <div className="mt-1 text-[12px] text-[#6b6b76]">
                  {t.profile.offersLabel}
                </div>
              </div>
            </div>
          </SpotlightCard>

          <AccountSettingsCard />
        </div>
      </div>

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
      />
      <EditAccountDialog
        open={accountEditOpen}
        onOpenChange={setAccountEditOpen}
        user={user}
      />
    </div>
  );
}
