import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { createPostAs } from "@/app/admin/blogs/actions";
import { BackLink } from "@/components/admin/back-link";
import { Writer } from "@/components/writer";
import { requireAdmin } from "@/lib/admin";
import { param, type SearchParams } from "@/lib/admin-list";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { uuidPattern } from "@/lib/ids";
import { canManage } from "@/lib/roles";

export default async function NewAdminBlog({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const actor = await requireAdmin();
  const authorId = param(await searchParams, "author");
  const [author] = uuidPattern.test(authorId)
    ? await db.select().from(users).where(eq(users.id, authorId)).limit(1)
    : [];
  if (!author || !author.onboardedAt || !canManage(actor, author)) notFound();

  return (
    <div className="-mx-4 sm:-mx-8">
      <div className="flex flex-col gap-2 px-4 sm:px-8">
        <BackLink href="/admin/blogs">ბლოგები</BackLink>
        <h1 className="text-2xl font-bold tracking-[-0.01em]">
          ახალი ბლოგი <span className="font-normal text-muted">· {author.name || `@${author.handle}`}</span>
        </h1>
      </div>
      <Writer submit={createPostAs.bind(null, author.id)} toolbarTop="top-14 md:top-0" />
    </div>
  );
}
