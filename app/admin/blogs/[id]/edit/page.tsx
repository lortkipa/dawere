import { notFound } from "next/navigation";
import { updatePost } from "@/app/admin/blogs/actions";
import { BackLink } from "@/components/admin/back-link";
import { Writer } from "@/components/writer";
import { requireAdmin } from "@/lib/admin";
import { getPostDetail } from "@/lib/admin-content";
import { getCategories } from "@/lib/categories";
import { canManage } from "@/lib/roles";
import { imageUrl } from "@/lib/user-view";

export default async function EditAdminBlog({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  const detail = await getPostDetail((await params).id);
  if (!detail || !canManage(actor, detail.author)) notFound();
  const { post } = detail;

  return (
    <div className="-mx-4 sm:-mx-8">
      <div className="flex flex-col gap-2 px-4 sm:px-8">
        <BackLink href={`/admin/blogs/${post.id}`}>ბლოგი</BackLink>
        <h1 className="text-2xl font-bold tracking-[-0.01em]">ბლოგის რედაქტირება</h1>
      </div>
      <Writer
        topics={await getCategories()}
        initial={{
          cover: post.cover ? imageUrl(post.cover) : null,
          title: post.title,
          description: post.description,
          tags: post.tags,
          body: post.body,
        }}
        submit={updatePost.bind(null, post.id)}
        submitLabel="შენახვა"
        toolbarTop="top-14 md:top-0"
      />
    </div>
  );
}
