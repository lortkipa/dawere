"use client";

import { useState } from "react";
import { banReportedAuthor, deleteReported, dismissReports } from "@/app/admin/reports/actions";
import type { ReportKind } from "@/lib/report-rules";
import { Button } from "../button";
import { Dialog } from "../dialog";
import { EditForm } from "../edit-form";
import { DeletePostDialog } from "../own-post-menu";
import { BanDialog } from "./user-editor";

const targetNames: Record<ReportKind, string> = { post: "ბლოგი", comment: "კომენტარი", user: "მომხმარებელი" };

// What an admin can do about a reported post, comment or user.
export function ReportActions({
  kind,
  id,
  open,
  canDelete,
  canBan,
  comments,
}: {
  kind: ReportKind;
  id: string;
  // Open reports, which dismissing closes.
  open: number;
  canDelete: boolean;
  canBan: boolean;
  // A post's comments, for the delete confirmation.
  comments: number;
}) {
  const [confirming, setConfirming] = useState<"dismiss" | "delete" | "ban" | null>(null);
  const close = () => setConfirming(null);

  return (
    <div className="flex flex-wrap gap-2">
      {open > 0 && (
        <Button variant="outline" onClick={() => setConfirming("dismiss")}>
          უარყოფა
        </Button>
      )}
      {canDelete && kind !== "user" && (
        <Button variant="outline" onClick={() => setConfirming("delete")} className="text-danger hover:bg-danger-soft">
          წაშლა
        </Button>
      )}
      {canBan && (
        <Button variant="outline" onClick={() => setConfirming("ban")} className="text-danger hover:bg-danger-soft">
          {kind === "user" ? "დაბლოკვა" : "ავტორის დაბლოკვა"}
        </Button>
      )}

      {confirming === "dismiss" && (
        <Dialog title="ჩივილების უარყოფა" art="report" onClose={close}>
          <EditForm canSave save={() => dismissReports(kind, id)} onClose={close} saveLabel="უარყოფა">
            <p className="text-muted">
              {open === 1 ? "ჩივილი" : `${open} ჩივილი`} დაიხურება, {targetNames[kind]} კი ისე დარჩება, როგორც არის.
            </p>
          </EditForm>
        </Dialog>
      )}
      {confirming === "delete" &&
        (kind === "post" ? (
          <DeletePostDialog comments={comments} remove={() => deleteReported(kind, id)} onClose={close} />
        ) : (
          <Dialog title="კომენტარის წაშლა" art="delete" onClose={close}>
            <EditForm canSave save={() => deleteReported(kind, id)} onClose={close} saveLabel="წაშლა" danger>
              <p className="text-muted">კომენტარი სამუდამოდ წაიშლება. მასზე პასუხები დარჩება.</p>
            </EditForm>
          </Dialog>
        ))}
      {confirming === "ban" && <BanDialog save={(reason) => banReportedAuthor(kind, id, reason)} onClose={close} />}
    </div>
  );
}
