"use server";

import { redirect } from "next/navigation";
import { savePost } from "@/lib/post-save";
import { getCurrentUser } from "@/lib/session";

type Result = { error: string } | void;

export async function publishPost(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (!user.onboardedAt) redirect("/onboarding");

  const result = await savePost(formData, { authorId: user.id });
  if ("error" in result) return result;
  redirect(`/@${user.handle}/${result.id}`);
}
