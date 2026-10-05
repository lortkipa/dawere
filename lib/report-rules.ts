// Shared by the report dialog, the report action and the admin queue.

export const reportKinds = ["post", "comment", "user"] as const;
export type ReportKind = (typeof reportKinds)[number];

export const reportStatuses = ["open", "dismissed", "actioned"] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export const maxReportDetails = 500;

export const reportReasons = [
  { slug: "spam", label: "სპამი ან რეკლამა", kinds: ["post", "comment", "user"] },
  { slug: "harassment", label: "შეურაცხყოფა ან დევნა", kinds: ["post", "comment", "user"] },
  { slug: "hate", label: "სიძულვილის ენა", kinds: ["post", "comment", "user"] },
  { slug: "sexual", label: "სექსუალური შინაარსი", kinds: ["post", "comment", "user"] },
  { slug: "violence", label: "ძალადობა ან მუქარა", kinds: ["post", "comment", "user"] },
  { slug: "misinformation", label: "ყალბი ინფორმაცია", kinds: ["post", "comment"] },
  { slug: "copyright", label: "საავტორო უფლების დარღვევა", kinds: ["post"] },
  { slug: "impersonation", label: "სხვის სახელს იყენებს", kinds: ["user"] },
  // Needs details, since the slug alone says nothing.
  { slug: "other", label: "სხვა", kinds: ["post", "comment", "user"] },
] as const satisfies readonly { slug: string; label: string; kinds: readonly ReportKind[] }[];

export type ReportReason = (typeof reportReasons)[number]["slug"];

export function reasonsFor(kind: ReportKind) {
  return reportReasons.filter((reason) => (reason.kinds as readonly ReportKind[]).includes(kind));
}

export function reasonLabel(slug: string) {
  return reportReasons.find((reason) => reason.slug === slug)?.label ?? slug;
}

export const reportTitles: Record<ReportKind, string> = {
  post: "ბლოგზე ჩივილი",
  comment: "კომენტარზე ჩივილი",
  user: "მომხმარებელზე ჩივილი",
};
