import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/admin/back-link";
import { RestoreButton } from "@/components/admin/legal-editor";
import { requireAdmin } from "@/lib/admin";
import { uuidPattern } from "@/lib/ids";
import { getLegalHistory, getLegalVersion } from "@/lib/legal";
import { isLegalDoc, legalNames } from "@/lib/legal-docs";
import { legalExtensions } from "@/lib/legal-schema";
import { formatDateTime } from "@/lib/user-view";

export default async function AdminLegalVersion({ params }: { params: Promise<{ doc: string; version: string }> }) {
  await requireAdmin();
  const { doc, version: id } = await params;
  if (!isLegalDoc(doc) || !uuidPattern.test(id)) notFound();
  const [row, history] = await Promise.all([getLegalVersion(id), getLegalHistory(doc)]);
  if (!row || row.version.doc !== doc) notFound();
  const { version } = row;
  const current = history[0]?.id === version.id;

  return (
    <div className="flex flex-col gap-6">
      <BackLink href={`/admin/legal/${doc}`}>{legalNames[doc]}</BackLink>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium">{formatDateTime(version.createdAt)}</p>
          <p className="text-sm text-muted">
            {row.editorName || row.editorEmail || "წაშლილი ანგარიში"}
            {current && " · მიმდინარე ვერსია"}
          </p>
        </div>
        {!current && <RestoreButton id={version.id} />}
      </div>

      <article className="mx-auto w-full max-w-3xl rounded-xl border border-line px-5 py-6 sm:px-8">
        <h1 className="text-[clamp(1.5rem,4vw,2rem)] leading-tight font-extrabold tracking-[-0.015em] break-words">
          {version.title}
        </h1>
        <div className="post-body mt-6">{renderToReactElement({ content: version.body, extensions: legalExtensions })}</div>
      </article>
    </div>
  );
}
