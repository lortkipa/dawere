"use client";

import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { unstable_rethrow } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { restoreLegal, saveLegal } from "@/app/admin/legal/actions";
import { maxLegalTitleLength, type LegalDoc } from "@/lib/legal-docs";
import { legalExtensions } from "@/lib/legal-schema";
import { Button } from "../button";
import { AutoTextarea, useLeaveWarning } from "../writer";
import { Toolbar } from "../writer-toolbar";

const genericError = "რაღაც შეცდომაა, სცადე თავიდან";

// The page remounts it after a save (keyed by the newest version), so `initial` is always what
// readers see now.
export function LegalEditor({ doc, initial }: { doc: LegalDoc; initial: { title: string; body: JSONContent } }) {
  const [title, setTitle] = useState(initial.title);
  const [bodyEdited, setBodyEdited] = useState(false);
  const [bodyEmpty, setBodyEmpty] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    content: initial.body,
    extensions: legalExtensions,
    editorProps: { attributes: { class: "post-body min-h-[40vh] outline-none", "aria-label": "ტექსტი" } },
    onUpdate: ({ editor }) => {
      setError("");
      setBodyEdited(true);
      setBodyEmpty(editor.state.doc.textContent.trim() === "");
    },
  });

  const dirty = title !== initial.title || bodyEdited;
  const canSave = dirty && title.trim() !== "" && !bodyEmpty && !pending;
  useLeaveWarning(dirty && !pending, "ცვლილებები არ შეინახება. მაინც გახვალ?");

  function save() {
    if (!editor || !canSave) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await saveLegal(doc, { title, body: JSON.stringify(editor.getJSON()) });
        if (result?.error) setError(result.error);
      } catch (caught) {
        // The action ends with redirect(), which must reach Next.
        unstable_rethrow(caught);
        setError(genericError);
      }
    });
  }

  return (
    <div className="pb-28">
      <div className="mx-auto max-w-2xl px-4 pt-6 pb-6 sm:px-6">
        <AutoTextarea
          ref={titleRef}
          aria-label="სათაური"
          placeholder="სათაური"
          maxLength={maxLegalTitleLength}
          value={title}
          onChange={(value) => {
            setError("");
            setTitle(value);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
            event.preventDefault();
            editor?.commands.focus("start");
          }}
          className="text-[clamp(1.5rem,6vw,2.25rem)] leading-tight font-extrabold tracking-[-0.015em]"
        />
      </div>

      <div className="sticky top-14 z-40 border-y border-line bg-bg md:top-0">
        <Toolbar editor={editor} />
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-8 sm:px-6">
        <EditorContent editor={editor} />
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 sm:bottom-6">
        <div className="mx-auto flex max-w-6xl flex-col items-end gap-2 px-4 sm:px-6 [&>*]:pointer-events-auto">
          {error && (
            <p aria-live="polite" className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-error shadow-sm">
              {error}
            </p>
          )}
          <Button
            size="lg"
            disabled={!canSave}
            onClick={save}
            className="shadow-lg disabled:opacity-100 disabled:bg-[color:light-dark(#a5a1f0,#3a377a)]"
          >
            გამოქვეყნება
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RestoreButton({ id }: { id: string }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function restore() {
    if (!window.confirm("ეს ვერსია ახლავე გამოქვეყნდება. გავაგრძელო?")) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await restoreLegal(id);
        if (result?.error) setError(result.error);
      } catch (caught) {
        unstable_rethrow(caught);
        setError(genericError);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={restore} disabled={pending}>
        აღდგენა
      </Button>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
