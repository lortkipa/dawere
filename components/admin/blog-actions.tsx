"use client";

import { useState } from "react";
import { deletePost } from "@/app/admin/blogs/actions";
import { Button } from "../button";
import { Dialog } from "../dialog";
import { EditForm } from "../edit-form";

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
          <Button variant="outline" onClick={() => setConfirming(true)} className="text-red-600 hover:bg-red-50">
            წაშლა
          </Button>
        </>
      )}
      {confirming && (
        <Dialog title="ბლოგის წაშლა" onClose={close}>
          <EditForm canSave save={() => deletePost(id)} onClose={close} saveLabel="წაშლა" danger>
            <p className="text-center text-muted">
              ბლოგი, მისი ფოტოები{comments > 0 ? `, ${comments} კომენტარი` : ""} და მოწონებები სამუდამოდ წაიშლება.
            </p>
          </EditForm>
        </Dialog>
      )}
    </div>
  );
}
