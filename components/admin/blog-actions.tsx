"use client";

import { useState } from "react";
import { deletePost } from "@/app/admin/blogs/actions";
import { Button } from "../button";
import { DeletePostDialog } from "../own-post-menu";

export function BlogActions({
  id,
  href,
  editable,
  comments,
}: {
  id: string;
  href: string;
  editable: boolean;
  comments: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const close = () => setConfirming(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" href={href}>
        ბლოგი საიტზე
      </Button>
      {editable && (
        <>
          <Button variant="outline" href={`/admin/blogs/${id}/edit`}>
            შეცვლა
          </Button>
          <Button variant="outline" onClick={() => setConfirming(true)} className="text-danger hover:bg-danger-soft">
            წაშლა
          </Button>
        </>
      )}
      {confirming && <DeletePostDialog comments={comments} remove={() => deletePost(id)} onClose={close} />}
    </div>
  );
}
