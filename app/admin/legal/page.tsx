import Link from "next/link";
import { PageTitle, Table, rowClass, tdClass, thClass } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { getLegal, getLegalHistory } from "@/lib/legal";
import { legalDocs } from "@/lib/legal-docs";
import { formatShortDate } from "@/lib/user-view";

export default async function AdminLegal() {
  await requireAdmin();
  const docs = await Promise.all(
    legalDocs.map(async (doc) => {
      const [current, history] = await Promise.all([getLegal(doc), getLegalHistory(doc)]);
      return { doc, current, versions: history.length };
    }),
  );

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="დოკუმენტები" />
      <p className="-mt-2 text-[15px] text-muted">წესებს და კონფიდენციალურობის პოლიტიკას რეგისტრაციისას ეთანხმებიან.</p>
      <Table fit>
        <thead>
          <tr>
            <th className={thClass}>დოკუმენტი</th>
            <th className={thClass}>ბოლო განახლება</th>
            <th className={`${thClass} hidden text-right sm:table-cell`}>ვერსია</th>
            <th className={thClass} />
          </tr>
        </thead>
        <tbody>
          {docs.map(({ doc, current, versions }) => (
            <tr key={doc} className={rowClass}>
              <td className={tdClass}>
                <Link href={`/admin/legal/${doc}`} className="font-medium hover:underline">
                  {current.title}
                </Link>
              </td>
              <td className={`${tdClass} whitespace-nowrap text-muted`}>
                {current.saved ? formatShortDate(current.createdAt) : "საწყისი ტექსტი"}
              </td>
              <td className={`${tdClass} hidden text-right tabular-nums text-muted sm:table-cell`}>{versions}</td>
              <td className={`${tdClass} text-right`}>
                <Link href={`/${doc}`} target="_blank" className="text-sm text-muted hover:text-ink hover:underline">
                  საიტზე ნახვა
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
