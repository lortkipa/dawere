import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/admin/back-link";
import { LegalEditor } from "@/components/admin/legal-editor";
import { requireAdmin } from "@/lib/admin";
import { getLegal, getLegalHistory } from "@/lib/legal";
import { isLegalDoc, legalNames } from "@/lib/legal-docs";
import { formatDateTime } from "@/lib/user-view";

export default async function AdminLegalDoc({ params }: { params: Promise<{ doc: string }> }) {
  await requireAdmin();
  const { doc } = await params;
  if (!isLegalDoc(doc)) notFound();
  const [current, history] = await Promise.all([getLegal(doc), getLegalHistory(doc)]);

  return (
    <div className="-mx-4 sm:-mx-8">
      <div className="flex flex-col gap-2 px-4 sm:px-8">
        <BackLink href="/admin/legal">დოკუმენტები</BackLink>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h1 className="text-2xl font-bold tracking-[-0.01em]">{legalNames[doc]}</h1>
          <Link href={`/${doc}`} target="_blank" className="text-sm text-muted hover:text-ink hover:underline">
            საიტზე ნახვა
          </Link>
        </div>
        {!current.saved && (
          <p className="text-[15px] text-muted">ახლა საწყისი ტექსტი ჩანს. პირველი შენახვის შემდეგ ის ისტორიაში გამოჩნდება.</p>
        )}
      </div>

      <LegalEditor key={current.createdAt.toISOString()} doc={doc} initial={{ title: current.title, body: current.body }} />

      <section className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-8 sm:px-6">
        <h2 className="text-lg font-semibold">ისტორია</h2>
        {history.length === 0 ? (
          <p className="text-[15px] text-muted">ჯერ არცერთი ვერსია არ შენახულა.</p>
        ) : (
          <ol className="overflow-hidden rounded-xl border border-line">
            {history.map((version, index) => (
              <li key={version.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/admin/legal/${doc}/${version.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-3 transition-colors hover:bg-surface"
                >
                  <span className="text-[15px]">
                    {formatDateTime(version.createdAt)}
                    {index === 0 && <span className="ml-2 text-sm text-muted">მიმდინარე</span>}
                  </span>
                  <span className="truncate text-sm text-muted">
                    {version.editorName || version.editorEmail || "წაშლილი ანგარიში"}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
