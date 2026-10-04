"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  maxNameLength,
  maxReferralOtherLength,
  minTopics,
  referrals,
  topics,
} from "@/lib/onboarding-options";
import { safeNext } from "@/lib/return-to";
import { getCurrentUser } from "@/lib/session";

type Answers = { name: string; topics: string[]; referral: string; referralOther: string };

export async function completeOnboarding(answers: Answers, next?: string | null): Promise<{ error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const name = answers.name.trim();
  const chosen = [...new Set(answers.topics)];
  const referralOther = answers.referral === "other" ? answers.referralOther.trim() : "";
  const valid =
    name.length > 0 &&
    name.length <= maxNameLength &&
    chosen.length >= minTopics &&
    chosen.every((slug) => topics.some((topic) => topic.slug === slug)) &&
    referrals.some((referral) => referral.slug === answers.referral) &&
    (answers.referral !== "other" || referralOther.length > 0) &&
    referralOther.length <= maxReferralOtherLength;

  if (!valid) return { error: "რაღაც შეცდომაა, სცადე თავიდან" };

  await db
    .update(users)
    .set({
      name,
      topics: chosen,
      referral: answers.referral,
      referralOther: referralOther || null,
      onboardedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  redirect(safeNext(next) ?? "/");
}
