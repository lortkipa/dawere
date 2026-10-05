import Link from "next/link";
import type { ReactNode } from "react";
import { BarList, LineChart } from "@/components/admin/charts";
import { PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { choice, type SearchParams } from "@/lib/admin-list";
import { getOverview, statRanges, type StatRange } from "@/lib/admin-stats";

const rangeLabels: Record<StatRange, string> = {
  all: "ყველა დრო",
  "180": "6 თვე",
  "30": "30 დღე",
  "7": "7 დღე",
};

const unitLabels = { day: "დღეების მიხედვით", week: "კვირების მიხედვით", month: "თვეების მიხედვით" };

export default async function AdminOverview({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const range = choice(await searchParams, "range", statRanges);
  const data = await getOverview(range);
  const { tiles, charts } = data;
  const onboardedShare = data.totals.users ? Math.round((data.totals.onboarded / data.totals.users) * 100) : 0;
  const openRate = tiles.readers.value ? (tiles.opens.value / tiles.readers.value).toFixed(1) : "0";

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="მიმოხილვა">
        <nav aria-label="პერიოდი" className="flex rounded-lg border border-line p-0.5">
          {(["all", "180", "30", "7"] as const).map((value) => (
            <Link
              key={value}
              href={value === "30" ? "/admin" : `/admin?range=${value}`}
              aria-current={value === range ? "page" : undefined}
              scroll={false}
              className={`rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                value === range ? "bg-ink text-white" : "text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              {rangeLabels[value]}
            </Link>
          ))}
        </nav>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="ახალი მომხმარებლები" {...tiles.signups} />
        <Tile label="აქტიური მკითხველები" {...tiles.readers} />
        <Tile label="ახალი ბლოგები" {...tiles.posts} />
        <Tile label="წაკითხვები" {...tiles.opens} />
        <Tile label="კომენტარები" {...tiles.comments} />
        <Tile label="მოწონებები" {...tiles.likes} />
        <Tile label="რჩეულებში დამატება" {...tiles.favorites} />
        <Tile label="გამოწერები" {...tiles.follows} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Fact label="სულ მომხმარებელი" value={data.totals.users.toLocaleString("en-US")} />
        <Fact label="რეგისტრაცია დაასრულა" value={`${onboardedShare}%`} />
        <Fact label="სულ ბლოგი" value={data.totals.posts.toLocaleString("en-US")} />
        <Fact label="წაკითხვა ერთ მკითხველზე" value={openRate} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="ახალი მომხმარებლები" note={unitLabels[data.unit]}>
          <LineChart points={charts.signups} />
        </Card>
        <Card title="აქტიური მკითხველები" note={unitLabels[data.unit]}>
          <LineChart points={charts.readers} />
        </Card>
        <Card title="ახალი ბლოგები" note={unitLabels[data.unit]}>
          <LineChart points={charts.posts} />
        </Card>
        <Card title="წაკითხვები" note={unitLabels[data.unit]}>
          <LineChart points={charts.opens} />
        </Card>
        <Card title="კომენტარები" note={unitLabels[data.unit]}>
          <LineChart points={charts.comments} />
        </Card>
        <Card title="მოწონებები" note={unitLabels[data.unit]}>
          <LineChart points={charts.likes} />
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="მკითხველების თემები">
          <BarList bars={data.topics} empty="თემები ჯერ არავის აურჩევია" />
        </Card>
        <Card title="ბლოგების თეგები">
          <BarList bars={data.tags} empty="ამ პერიოდის ბლოგებს თეგები არ აქვს" />
        </Card>
        <Card title="საიდან გაიგეს">
          <BarList bars={data.referrals} empty="ამ პერიოდში არავინ დარეგისტრირებულა" />
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="ყველაზე წაკითხული ბლოგები">
          <Ranked
            empty="ამ პერიოდში ბლოგი არავის წაუკითხავს"
            rows={data.topPosts.map((post) => ({
              key: post.id,
              href: `/@${post.handle}/${post.id}`,
              label: post.title,
              value: post.opens,
            }))}
          />
        </Card>
        <Card title="ყველაზე მეტი ახალი გამომწერი">
          <Ranked
            empty="ამ პერიოდში არავინ გამოუწერია"
            rows={data.topAuthors.map((author) => ({
              key: author.id,
              href: `/admin/users/${author.id}`,
              label: author.name || `@${author.handle}`,
              value: author.followers,
            }))}
          />
        </Card>
      </div>
    </div>
  );
}

// The count in the range, and how it moved against the same span right before it.
function Tile({ label, value, previous }: { label: string; value: number; previous: number | null }) {
  const change = previous === null ? null : value - previous;
  return (
    <div className="rounded-xl border border-line px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value.toLocaleString("en-US")}</p>
      {change !== null && (
        <p
          title="წინა პერიოდთან შედარებით"
          className={`mt-0.5 text-xs tabular-nums ${change > 0 ? "text-emerald-700" : change < 0 ? "text-red-600" : "text-muted"}`}
        >
          {change === 0
            ? "უცვლელი"
            : `${change > 0 ? "↑" : "↓"} ${Math.abs(change).toLocaleString("en-US")}-ით ${change > 0 ? "მეტი" : "ნაკლები"}`}
        </p>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-line px-5 pt-4 pb-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 className="font-semibold">{title}</h2>
        {note && <span className="text-xs text-muted">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Ranked({
  rows,
  empty,
}: {
  rows: { key: string; href: string; label: string; value: number }[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted">{empty}</p>;
  return (
    <ol className="flex flex-col divide-y divide-line">
      {rows.map((row, index) => (
        <li key={row.key} className="flex items-center gap-3 py-2.5 text-[15px]">
          <span className="w-4 text-sm text-muted tabular-nums">{index + 1}</span>
          <Link href={row.href} className="min-w-0 flex-1 truncate hover:underline">
            {row.label}
          </Link>
          <span className="text-muted tabular-nums">{row.value.toLocaleString("en-US")}</span>
        </li>
      ))}
    </ol>
  );
}
