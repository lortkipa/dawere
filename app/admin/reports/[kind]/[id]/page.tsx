import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/admin/back-link";
import { ReportActions } from "@/components/admin/report-actions";
import { BannedBadge } from "@/components/admin/ui";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { requireAdmin } from "@/lib/admin";
import { getPostDetail } from "@/lib/admin-content";
import { getReportTarget, kindLabels, listReportsOn, type ReportTarget } from "@/lib/admin-reports";
import { reasonLabel, reportKinds, type ReportKind } from "@/lib/report-rules";
import { canManage, canRemove } from "@/lib/roles";
import { avatarUrl, formatDateTime } from "@/lib/user-view";

type Props = { params: Promise<{ kind: string; id: string }> };

const statusLabels = { open: "", dismissed: "უარყოფილი", actioned: "მომხმარებელი დაიბლოკა" };

// Everything readers said about one post, comment or user, and what to do about it.
export default async function AdminReport({ params }: Props) {
  const actor = await requireAdmin();
  const { kind, id } = await params;
  if (!reportKinds.includes(kind as ReportKind)) notFound();
  const target = await getReportTarget(kind as ReportKind, id);
  if (!target) notFound();
  const [reports, postDetail] = await Promise.all([
    listReportsOn(target.kind, id),
    target.kind === "post" ? getPostDetail(id) : null,
  ]);
  const open = reports.filter((report) => report.status === "open").length;
  const { author } = target;
  const manageable = canManage(actor, author);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/admin/reports">ჩივილები</BackLink>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-[-0.01em]">{kindLabels[target.kind]}</h1>
          <p className="mt-0.5 text-muted tabular-nums">
            {open > 0 ? `${open} ღია ჩივილი` : "ღია ჩივილები არ არის"}
          </p>
        </div>
        {manageable && (
          <ReportActions
            kind={target.kind}
            id={id}
            open={open}
            canDelete={manageable}
            canBan={!target.banned && canRemove(actor, author)}
            comments={postDetail?.comments ?? 0}
          />
        )}
      </div>

      {!manageable && (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-muted">
          ადმინებზე ჩივილებს მხოლოდ სუპერადმინი განიხილავს.
        </p>
      )}

      <Target target={target} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">ჩივილები ({reports.length})</h2>
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
          {reports.map((report) => (
            <li key={report.id} className="flex gap-3 px-4 py-3.5">
              <Avatar src={avatarUrl(report.reporterAvatar)} className="size-9 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  {report.reporterId ? (
                    <Link href={`/admin/users/${report.reporterId}`} className="font-medium hover:underline">
                      {report.reporterName || `@${report.reporterHandle}`}
                    </Link>
                  ) : (
                    <span className="text-muted">წაშლილი ანგარიში</span>
                  )}
                  <span className="text-muted">· {formatDateTime(report.createdAt)}</span>
                </div>
                <p className="mt-1 font-medium">{reasonLabel(report.reason)}</p>
                {report.details && (
                  <p className="mt-0.5 text-[15px] break-words whitespace-pre-line">{report.details}</p>
                )}
                {report.status !== "open" && (
                  <p className="mt-1 text-sm text-muted">
                    {statusLabels[report.status]}
                    {report.closerHandle && ` · ${report.closerName || `@${report.closerHandle}`}`}
                    {report.closedAt && ` · ${formatDateTime(report.closedAt)}`}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// The reported thing as readers see it, with its author and links to it.
function Target({ target }: { target: ReportTarget }) {
  const { author } = target;
  const authorLine = (
    <Link href={`/admin/users/${author.id}`} className="flex min-w-0 items-center gap-3">
      <Avatar src={avatarUrl(author.avatar)} className="size-10" />
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium hover:underline">{author.name || `@${author.handle}`}</span>
          {target.banned && <BannedBadge />}
        </span>
        <span className="block truncate text-sm text-muted">@{author.handle}</span>
      </span>
    </Link>
  );

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {authorLine}
        <div className="flex flex-wrap gap-2">
          {target.kind === "post" && (
            <>
              <Button variant="outline" size="sm" href={`/admin/blogs/${target.post.id}`}>
                ადმინში
              </Button>
              {!target.banned && (
                <Button variant="outline" size="sm" href={`/@${author.handle}/${target.post.id}`}>
                  საიტზე
                </Button>
              )}
            </>
          )}
          {target.kind === "comment" && (
            <>
              <Button variant="outline" size="sm" href={`/admin/blogs/${target.comment.postId}`}>
                ბლოგი ადმინში
              </Button>
              <Button variant="outline" size="sm" href={`/@${target.postHandle}/${target.comment.postId}#comments`}>
                საიტზე
              </Button>
            </>
          )}
          {target.kind === "user" && !target.banned && author.onboardedAt && (
            <Button variant="outline" size="sm" href={`/@${author.handle}`}>
              პროფილი საიტზე
            </Button>
          )}
        </div>
      </div>

      {target.kind === "post" && (
        <div>
          <p className="text-lg font-semibold break-words">{target.post.title}</p>
          <p className="mt-1 break-words text-muted">{target.post.description}</p>
        </div>
      )}
      {target.kind === "comment" && (
        <div>
          <p className="text-[15px] break-words whitespace-pre-line">{target.comment.body}</p>
          <p className="mt-2 truncate text-sm text-muted">ბლოგი: {target.postTitle}</p>
        </div>
      )}
      {target.kind === "user" && author.bio && (
        <p className="text-[15px] break-words whitespace-pre-line text-muted">{author.bio}</p>
      )}
    </section>
  );
}
