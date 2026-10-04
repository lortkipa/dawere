"use client";

import type { JSONContent } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import { TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { unstable_rethrow } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useTransition, type KeyboardEvent, type RefObject } from "react";
import { publishPost } from "@/app/write/actions";
import { imageTypes, maxDescriptionLength, maxImages, maxPickedImageBytes, maxTitleLength } from "@/lib/post-rules";
import { postExtensions } from "@/lib/post-schema";
import { shrinkImage } from "@/lib/shrink-image";
import { minTags } from "@/lib/tags";
import { Button } from "./button";
import { TagInput } from "./tag-input";
import { Toolbar } from "./writer-toolbar";

const errorClass = "text-[#d93025]";
const tooBigError = "ფოტო 20 მბ-ზე დიდი არ უნდა იყოს";
const unreadableError = "ამ ფაილს ვერ ვკითხულობთ, სცადე სხვა ფოტო";
const tooManyError = `ბლოგში ${maxImages}-ზე მეტი ფოტო არ უნდა იყოს`;

type Picked = { blob: Blob; url: string };

function walk(node: JSONContent, visit: (node: JSONContent) => void) {
  visit(node);
  node.content?.forEach((child) => walk(child, visit));
}

function countImages(view: EditorView) {
  let count = 0;
  view.state.doc.descendants((node) => {
    if (node.type.name === "image") count++;
  });
  return count;
}

// Nothing is uploaded until publishing: photos live in the browser as blobs, and the editor
// shows them from blob: URLs.
export function Writer() {
  const [cover, setCover] = useState<Picked | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  // Problems with photos in the body show under the toolbar, cover problems under the cover.
  const [notice, setNotice] = useState("");
  const [coverError, setCoverError] = useState("");
  const [draggingCover, setDraggingCover] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // Kept for the whole visit, so undo can bring back a photo that was deleted.
  const blobs = useRef(new Map<string, Blob>());
  const coverInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef(cover);
  useEffect(() => {
    coverRef.current = cover;
  }, [cover]);

  // A photo dropped next to the cover or the body would otherwise replace the page with it.
  useEffect(() => {
    const ignore = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", ignore);
    window.addEventListener("drop", ignore);
    return () => {
      window.removeEventListener("dragover", ignore);
      window.removeEventListener("drop", ignore);
    };
  }, []);

  useEffect(() => {
    const urls = blobs.current;
    return () => urls.forEach((_, url) => URL.revokeObjectURL(url));
  }, []);

  // Shrinks the photos and puts them at `pos`, or at the cursor.
  async function insertImages(view: EditorView, files: File[], pos?: number) {
    setNotice("");
    if (countImages(view) + (coverRef.current ? 1 : 0) + files.length > maxImages) return setNotice(tooManyError);
    if (files.some((file) => file.size > maxPickedImageBytes)) return setNotice(tooBigError);

    let picked: Blob[];
    try {
      picked = await Promise.all(files.map(shrinkImage));
    } catch {
      return setNotice(unreadableError);
    }

    const { schema } = view.state;
    const nodes = picked.map((blob) => {
      const url = URL.createObjectURL(blob);
      blobs.current.set(url, blob);
      return schema.nodes.image.create({ src: url });
    });
    const transaction = view.state.tr;
    if (pos !== undefined) transaction.setSelection(TextSelection.near(transaction.doc.resolve(pos)));
    // Each insert leaves the selection after the photo, so they line up in order.
    for (const node of nodes) transaction.replaceSelectionWith(node);
    view.dispatch(transaction.scrollIntoView());
    view.focus();
  }

  function imageFiles(list: FileList | null | undefined) {
    return Array.from(list ?? []).filter((file) => imageTypes.includes(file.type));
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [...postExtensions, Placeholder.configure({ placeholder: "დაწერე ტექსტი…" })],
    editorProps: {
      attributes: { class: "post-body min-h-[40vh] outline-none", "aria-label": "ტექსტი" },
      handlePaste: (view, event) => {
        const files = imageFiles(event.clipboardData?.files);
        if (files.length === 0) return false;
        event.preventDefault();
        insertImages(view, files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = moved ? [] : imageFiles(event.dataTransfer?.files);
        if (files.length === 0) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        insertImages(view, files, pos);
        return true;
      },
    },
    onUpdate: () => setNotice(""),
  });

  const bodyHasText = useEditorState({
    editor,
    selector: ({ editor }) => (editor?.state.doc.textContent.trim().length ?? 0) > 0,
  });
  const bodyHasImages = useEditorState({
    editor,
    selector: ({ editor }) => (editor ? countImages(editor.view) > 0 : false),
  });

  const canPublish =
    title.trim() !== "" && description.trim() !== "" && tags.length >= minTags && Boolean(bodyHasText) && !pending;
  const dirty = Boolean(title.trim() || description.trim() || tags.length || cover || bodyHasText || bodyHasImages);
  useLeaveWarning(dirty && !pending);

  function pickCover(file: File | undefined) {
    setCoverError("");
    if (!file) return;
    if (file.size > maxPickedImageBytes) return setCoverError(tooBigError);
    if (!cover && editor && countImages(editor.view) >= maxImages) return setCoverError(tooManyError);
    shrinkImage(file).then(
      (blob) => {
        if (cover) URL.revokeObjectURL(cover.url);
        setCover({ blob, url: URL.createObjectURL(blob) });
      },
      () => setCoverError(unreadableError),
    );
  }

  function removeCover() {
    setCoverError("");
    if (cover) URL.revokeObjectURL(cover.url);
    setCover(null);
  }

  function publish() {
    if (!editor || !canPublish) return;
    setError("");

    // Each photo goes as a file, and its node points at it as `upload:<n>`. A blob: URL that
    // isn't ours (pasted from another tab) is dropped.
    const data = new FormData();
    const body = editor.getJSON();
    const index = new Map<string, number>();
    walk(body, (node) => {
      node.content = node.content?.filter((child) => child.type !== "image" || blobs.current.has(child.attrs?.src));
      if (node.type !== "image") return;
      const url = node.attrs!.src as string;
      if (!index.has(url)) {
        index.set(url, index.size);
        data.set(`image-${index.get(url)}`, blobs.current.get(url)!);
      }
      node.attrs = { ...node.attrs, src: `upload:${index.get(url)}` };
    });

    data.set("title", title.trim());
    data.set("description", description.trim());
    data.set("tags", JSON.stringify(tags));
    data.set("body", JSON.stringify(body));
    if (cover) data.set("cover", cover.blob);

    startTransition(async () => {
      try {
        const result = await publishPost(data);
        if (result?.error) setError(result.error);
      } catch (caught) {
        // The action ends with redirect(), which reaches here as an error while the post page
        // loads. It must go on to Next, not show as a failure.
        unstable_rethrow(caught);
        setError("რაღაც შეცდომაა, სცადე თავიდან");
      }
    });
  }

  return (
    <div className="pb-32">
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 sm:pt-10">
        {/* Takes the cover's place: click to pick a photo, or drop one on it (also to replace). */}
        <div
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            setDraggingCover(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDraggingCover(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDraggingCover(false);
            const file = imageFiles(event.dataTransfer.files)[0];
            if (file) pickCover(file);
            else if (event.dataTransfer.files.length > 0) setCoverError(unreadableError);
          }}
        >
          {cover ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.url}
                alt=""
                className={`w-full rounded-xl transition-opacity ${draggingCover ? "opacity-60" : ""}`}
              />
              <div className="absolute top-3 right-3 flex gap-2">
                <CoverButton label="ფოტოს შეცვლა" onClick={() => coverInput.current?.click()}>
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M8 16H3v5" />
                </CoverButton>
                <CoverButton label="ფოტოს წაშლა" onClick={removeCover}>
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </CoverButton>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInput.current?.click()}
              className={`flex aspect-[2/1] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 text-center transition-colors ${
                draggingCover ? "border-ink bg-[#efefed]" : "border-line bg-surface hover:bg-[#f1f1ef]"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-8 text-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 5h6M19 2v6M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" />
                <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
                <circle cx="9" cy="9" r="2" />
              </svg>
              <span className="font-medium text-ink">მთავარი ფოტოს დამატება</span>
              <span className="-mt-2 text-sm text-muted">ან გადმოიტანე ფოტო აქ</span>
            </button>
          )}
        </div>
        {coverError && (
          <p aria-live="polite" className={`mt-2 text-sm ${errorClass}`}>
            {coverError}
          </p>
        )}
        <input
          ref={coverInput}
          type="file"
          accept={imageTypes.join(",")}
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Clearing lets the same file be picked again after a removal.
            event.target.value = "";
            pickCover(file);
          }}
        />
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-8 pb-6 sm:px-6">
        <AutoTextarea
          ref={titleRef}
          aria-label="სათაური"
          placeholder="სათაური"
          maxLength={maxTitleLength}
          value={title}
          onChange={setTitle}
          onKeyDown={(event) => enterPressed(event) && descriptionRef.current?.focus()}
          className="text-[clamp(1.75rem,5vw,2.5rem)] leading-tight font-extrabold tracking-[-0.015em]"
        />
        <AutoTextarea
          ref={descriptionRef}
          aria-label="მოკლე აღწერა"
          placeholder="მოკლე აღწერა"
          maxLength={maxDescriptionLength}
          value={description}
          onChange={setDescription}
          // With five tags picked the tag field is gone, so Enter goes straight to the body.
          onKeyDown={(event) =>
            enterPressed(event) && (tagsRef.current ? tagsRef.current.focus() : editor?.commands.focus("start"))
          }
          className="mt-3 text-lg leading-relaxed text-muted"
        />
        <TagInput ref={tagsRef} tags={tags} onChange={setTags} onDone={() => editor?.commands.focus("start")} />
      </div>

      <div className="sticky top-16 z-40 border-y border-line bg-white">
        <Toolbar editor={editor} onPickImage={() => imageInput.current?.click()} />
        {notice && (
          <p aria-live="polite" className={`mx-auto max-w-2xl px-4 pb-2 text-sm sm:px-6 ${errorClass}`}>
            {notice}
          </p>
        )}
        <input
          ref={imageInput}
          type="file"
          accept={imageTypes.join(",")}
          multiple
          hidden
          onChange={(event) => {
            const files = imageFiles(event.target.files);
            event.target.value = "";
            if (editor && files.length > 0) insertImages(editor.view, files);
          }}
        />
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-8 sm:px-6">
        <EditorContent editor={editor} />
      </div>

      {/* Fixed at the bottom, so publishing never needs a scroll to the end. It lines up with the
          header's right edge (same max-w-6xl and padding as the avatar). */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 sm:bottom-6">
        <div className="mx-auto flex max-w-6xl flex-col items-end gap-2 px-4 sm:px-6 [&>*]:pointer-events-auto">
          {error && (
            <p
              aria-live="polite"
              className={`rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-sm ${errorClass}`}
            >
              {error}
            </p>
          )}
          <Button
            size="lg"
            disabled={!canPublish}
            onClick={publish}
            className="shadow-lg disabled:opacity-100 disabled:bg-[#a5a1f0]"
          >
            გამოქვეყნება
          </Button>
        </div>
      </div>
    </div>
  );
}

// Title and description are one line each: Enter moves on to the next field.
function enterPressed(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) return false;
  event.preventDefault();
  return true;
}

function CoverButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 cursor-pointer place-items-center rounded-lg bg-white/90 text-ink shadow-sm transition-colors hover:bg-white"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[18px]"
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

// A one-line field that wraps and grows instead of scrolling. Pasted line breaks become spaces.
function AutoTextarea({
  ref,
  value,
  onChange,
  className,
  ...props
}: Omit<React.ComponentProps<"textarea">, "onChange" | "value" | "ref"> & {
  ref: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [ref, value]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    });
    observer.observe(element.parentElement!);
    return () => observer.disconnect();
  }, [ref]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\r?\n/g, " "))}
      className={`block w-full resize-none overflow-hidden bg-transparent text-ink outline-none placeholder:text-[#b4b4b2] ${className}`}
      {...props}
    />
  );
}

// Warns before a reload, closing the tab or following a link while something is written. The
// browser's back button can't be caught reliably, so it isn't.
function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    // Runs before Next's <Link> handler, which skips navigating once the event is cancelled.
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]");
      if (!link || link.closest("[contenteditable]") || link.getAttribute("target") === "_blank") return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!window.confirm("ბლოგი არ შეინახება. მაინც გახვალ?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active]);
}
