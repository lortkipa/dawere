"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { useState, type FormEvent, type ReactNode } from "react";
import { isSafeHref } from "@/lib/post-rules";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { TextInput } from "./text-input";

// Icons only; each button's name is in its label and tooltip.
export function Toolbar({ editor, onPickImage }: { editor: Editor | null; onPickImage: () => void }) {
  const [linking, setLinking] = useState(false);

  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      canUndo: editor?.can().undo() ?? false,
      canRedo: editor?.can().redo() ?? false,
      h1: editor?.isActive("heading", { level: 1 }) ?? false,
      h2: editor?.isActive("heading", { level: 2 }) ?? false,
      h3: editor?.isActive("heading", { level: 3 }) ?? false,
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      strike: editor?.isActive("strike") ?? false,
      code: editor?.isActive("code") ?? false,
      bulletList: editor?.isActive("bulletList") ?? false,
      orderedList: editor?.isActive("orderedList") ?? false,
      blockquote: editor?.isActive("blockquote") ?? false,
      codeBlock: editor?.isActive("codeBlock") ?? false,
      link: editor?.isActive("link") ?? false,
    }),
  });

  const run = (command: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => {
    if (editor) command(editor.chain().focus()).run();
  };

  return (
    // The inner row is as wide as its buttons: centred while it fits, scrolled sideways once it
    // doesn't, and it never wraps.
    <div role="toolbar" aria-label="ფორმატირება" className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex w-max items-center gap-0.5 px-4 py-1.5 sm:px-6">
        <Tool label="დაბრუნება" disabled={!state?.canUndo} onClick={() => run((c) => c.undo())}>
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </Tool>
        <Tool label="გამეორება" disabled={!state?.canRedo} onClick={() => run((c) => c.redo())}>
          <path d="m15 14 5-5-5-5" />
          <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
        </Tool>

        <Separator />
        <Tool label="სათაური 1" active={state?.h1} onClick={() => run((c) => c.toggleHeading({ level: 1 }))}>
          <path d="M4 12h8M4 18V6M12 18V6" />
          <path d="m17 12 3-2v8" />
        </Tool>
        <Tool label="სათაური 2" active={state?.h2} onClick={() => run((c) => c.toggleHeading({ level: 2 }))}>
          <path d="M4 12h8M4 18V6M12 18V6" />
          <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
        </Tool>
        <Tool label="სათაური 3" active={state?.h3} onClick={() => run((c) => c.toggleHeading({ level: 3 }))}>
          <path d="M4 12h8M4 18V6M12 18V6" />
          <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" />
          <path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" />
        </Tool>

        <Separator />
        <Tool label="მუქი" active={state?.bold} onClick={() => run((c) => c.toggleBold())}>
          <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
        </Tool>
        <Tool label="დახრილი" active={state?.italic} onClick={() => run((c) => c.toggleItalic())}>
          <path d="M19 4h-9M14 20H5M15 4 9 20" />
        </Tool>
        <Tool label="გადახაზული" active={state?.strike} onClick={() => run((c) => c.toggleStrike())}>
          <path d="M16 4H9a3 3 0 0 0-2.83 4" />
          <path d="M14 12a4 4 0 0 1 0 8H6M4 12h16" />
        </Tool>
        <Tool label="კოდი" active={state?.code} onClick={() => run((c) => c.toggleCode())}>
          <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
        </Tool>

        <Separator />
        <Tool label="სია" active={state?.bulletList} onClick={() => run((c) => c.toggleBulletList())}>
          <path d="M3 6h.01M3 12h.01M3 18h.01M8 6h13M8 12h13M8 18h13" />
        </Tool>
        <Tool label="დანომრილი სია" active={state?.orderedList} onClick={() => run((c) => c.toggleOrderedList())}>
          <path d="M10 6h11M10 12h11M10 18h11M4 10h2M4 6h1v4" />
          <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
        </Tool>
        <Tool label="ციტატა" active={state?.blockquote} onClick={() => run((c) => c.toggleBlockquote())}>
          <path d="M17 6H3M21 12H8M21 18H8M3 12v6" />
        </Tool>
        <Tool label="კოდის ბლოკი" active={state?.codeBlock} onClick={() => run((c) => c.toggleCodeBlock())}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="m10 9-3 3 3 3M14 15l3-3-3-3" />
        </Tool>

        <Separator />
        <Tool label="ბმული" active={state?.link} onClick={() => setLinking(true)}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </Tool>
        <Tool label="ფოტო" onClick={onPickImage}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
        </Tool>
        <Tool label="გამყოფი ხაზი" onClick={() => run((c) => c.setHorizontalRule())}>
          <path d="M5 12h14" />
        </Tool>
      </div>

      {linking && editor && <LinkDialog editor={editor} onClose={() => setLinking(false)} />}
    </div>
  );
}

function Tool({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-30 ${
        active ? "bg-surface text-ink" : "text-muted hover:bg-surface hover:text-ink"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}

function Separator() {
  return <span aria-hidden="true" className="mx-1.5 h-5 w-px shrink-0 bg-line" />;
}

// Without a scheme the address is taken as a website; email links need `mailto:`.
function toHref(value: string) {
  const trimmed = value.trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function LinkDialog({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const current = editor.getAttributes("link").href as string | undefined;
  const [value, setValue] = useState(current ?? "");
  const empty = value.trim() === "";
  const href = toHref(value);
  const valid = empty ? Boolean(current) : isSafeHref(href) && /^mailto:|\.[a-z]{2,}/i.test(href);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return;
    const chain = editor.chain().focus().extendMarkRange("link");
    if (empty) chain.unsetLink().run();
    // With nothing selected, the address itself becomes the link text.
    else if (editor.state.selection.empty && !current) {
      chain.insertContent({ type: "text", text: value.trim(), marks: [{ type: "link", attrs: { href } }] }).run();
    } else chain.setLink({ href }).run();
    onClose();
  }

  return (
    <Dialog title="ბმული" onClose={onClose}>
      <form noValidate onSubmit={handleSubmit}>
        <TextInput
          type="url"
          inputMode="url"
          aria-label="ბმული"
          placeholder="example.com"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full"
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            გაუქმება
          </Button>
          <Button type="submit" disabled={!valid}>
            {empty && current ? "წაშლა" : "შენახვა"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
