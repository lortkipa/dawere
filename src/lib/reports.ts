import type { ReportReason, ReportStatus, ReportTarget } from '@/db/schema';

/** Shared by the report dialog and the admin queue; no server code here. */
export const REPORT_REASONS: Record<ReportReason, string> = {
  spam: 'სპამი ან რეკლამა',
  harassment: 'შეურაცხყოფა ან დევნა',
  hate: 'სიძულვილის ენა',
  violence: 'ძალადობა ან მუქარა',
  sexual: 'სექსუალური შინაარსი',
  misinformation: 'ყალბი ინფორმაცია',
  impersonation: 'სხვის სახელით მოქმედება',
  copyright: 'საავტორო უფლების დარღვევა',
  other: 'სხვა',
};

/** Which reasons make sense for what: nobody impersonates with a comment. */
export const REASONS_FOR: Record<ReportTarget, ReportReason[]> = {
  post: ['spam', 'harassment', 'hate', 'violence', 'sexual', 'misinformation', 'copyright', 'other'],
  comment: ['spam', 'harassment', 'hate', 'violence', 'sexual', 'misinformation', 'other'],
  user: ['spam', 'harassment', 'hate', 'impersonation', 'sexual', 'other'],
};

export const REPORT_TARGET_LABELS: Record<ReportTarget, string> = {
  post: 'სტატია',
  comment: 'კომენტარი',
  user: 'მომხმარებელი',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'განსახილველი',
  resolved: 'მოგვარებული',
  dismissed: 'უარყოფილი',
};

export function reasonLabel(reason: string): string {
  return REPORT_REASONS[reason as ReportReason] ?? reason;
}
