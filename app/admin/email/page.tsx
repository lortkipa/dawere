import { CodeEmailEditor } from "@/components/admin/code-email-editor";
import { PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { defaultCodeEmailFooter } from "@/lib/code-email";
import { getSiteText } from "@/lib/site-texts";
import { formatShortDate } from "@/lib/user-view";

export default async function AdminEmail() {
  await requireAdmin();
  const saved = await getSiteText("code-email-footer");
  const editor = saved && (saved.editorName || saved.editorEmail);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="ელფოსტა" />
      <p className="-mt-2 text-[15px] text-muted">
        {saved
          ? `შესვლის კოდის წერილი. ბოლოს შეცვალა ${editor || "წაშლილმა ადმინმა"}, ${formatShortDate(saved.updatedAt)}.`
          : "შესვლის კოდის წერილი. ჯერ საწყისი ტექსტია."}
      </p>
      {/* Keyed by the saved text, so a save or reset starts the editor from what's live. */}
      <CodeEmailEditor
        key={saved?.value ?? "default"}
        footer={saved?.value ?? defaultCodeEmailFooter}
        isDefault={!saved}
      />
    </div>
  );
}
