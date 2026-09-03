"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { saveArticle } from "@/app/actions/articles";
import { AccountMenu } from "@/components/account/AccountMenu";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { Button } from "@/components/ui/Button";
import { ResultModal } from "@/components/ui/ResultModal";
import prose from "@/components/article/Prose.module.css";
import type { Account } from "@/lib/account";
import { EditorToolbar } from "./EditorToolbar";
import styles from "./Editor.module.css";

export type EditorArticle = {
  id: string;
  title: string;
  html: string;
  slug: string | null;
  status: "draft" | "published";
};

type EditorProps = {
  account: Account;
  /** Absent for a brand-new article; the first save is what gives it an id. */
  article?: EditorArticle;
};

export function Editor({ account, article }: EditorProps) {
  const router = useRouter();
  const titleField = useRef<HTMLTextAreaElement>(null);

  const [id, setId] = useState(article?.id);
  const [title, setTitle] = useState(article?.title ?? "");
  const [busy, setBusy] = useState<"draft" | "publish" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The save that just landed, kept until its dialog is dismissed. */
  const [done, setDone] = useState<Done | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Whether the piece was already public when this editor opened. It cannot
  // change underneath us: publishing from here navigates away.
  const isPublished = article?.status === "published";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The reader's type scale starts at h2 — the article title is the h1.
        heading: { levels: [2, 3] },
        // Clicking a link in the editor should put the caret in it, not leave.
        link: { openOnClick: false, defaultProtocol: "https" },
      }),
    ],
    content: article?.html ?? "",
    // The editor is a browser thing; rendering it during SSR only produces
    // markup React then has to reconcile away.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `${prose.prose} ${styles.surface}`,
        "aria-label": "სტატიის ტექსტი",
      },
    },
    // Emptiness comes from the editor's own lifecycle rather than from
    // useEditorState: that hook is bound to the editor it was first handed, and
    // on the first render there is no editor yet — so it would answer "empty"
    // forever and leave the placeholder sitting under a loaded article.
    onCreate: ({ editor }) => setIsEmpty(editor.isEmpty),
    onUpdate: ({ editor }) => {
      setIsEmpty(editor.isEmpty);
      touch();
    },
  });

  function touch() {
    setDirty(true);
  }

  // The title box grows with its content instead of scrolling inside itself.
  useEffect(() => {
    const field = titleField.current;
    if (!field) return;

    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [title]);

  useEffect(() => {
    if (!dirty) return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(publish: boolean) {
    if (!editor || busy) return;

    setBusy(publish ? "publish" : "draft");
    setError(null);

    const result = await saveArticle({
      id,
      title,
      html: editor.getHTML(),
      publish,
    });

    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }

    setDirty(false);

    // The first save turns /write into /write/<id>, so a reload comes back to
    // the draft rather than to an empty editor. replaceState rather than the
    // router: the page is already the right one, only its address is stale.
    const isNew = !id;
    if (isNew) {
      setId(result.id);
      window.history.replaceState(null, "", `/write/${result.id}`);
    }

    setBusy(null);
    // The slug rides along: once an article is public, the only place left to
    // go from here is the article itself.
    setDone({ kind: isNew ? "created" : "saved", slug: result.slug });
  }

  return (
    <div className={styles.page}>
      {/* Same metrics as every other route's bar — what changes is only what
          sits in it. */}
      <header className={styles.bar}>
        {/* The wordmark is the same door everywhere: back to the feed. The
            way back to what is being written from is the arrow on the right. */}
        <Link href="/feed" className={styles.wordmark}>
          dawere
        </Link>

        {/* The one state worth reporting. Neither unsaved changes nor a
            finished save are news — the beforeunload warning is what actually
            protects work in progress. */}
        <span className={styles.state} role="status">
          {busy ? "ინახება…" : null}
        </span>

        <div className={styles.tools}>
          <Link
            href={`/${account.handle}`}
            className={styles.back}
            aria-label="უკან, ჩემს გვერდზე"
          >
            <ArrowLeftIcon />
          </Link>

          <AccountMenu account={account} />
        </div>
      </header>

      <main className={styles.sheet}>
        <div className={styles.toolbar}>
          {editor && <EditorToolbar editor={editor} />}
        </div>

        <textarea
          ref={titleField}
          rows={1}
          className={styles.title}
          placeholder="სათაური"
          aria-label="სათაური"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            touch();
          }}
          onKeyDown={(event) => {
            // A title is one line; Enter belongs to the article under it.
            if (event.key !== "Enter") return;
            event.preventDefault();
            editor?.commands.focus("start");
          }}
        />

        <div className={styles.canvas}>
          <EditorContent editor={editor} />
          {isEmpty && (
            <p
              className={`${prose.prose} ${styles.placeholder}`}
              aria-hidden="true"
            >
              დაიწყე წერა…
            </p>
          )}
        </div>

        {/* At the end of the article, where you finish writing. */}
        <div className={styles.actions}>
          <div className={styles.buttons}>
            {/* One button, because there is only one thing to do here: put the
                piece out. A published article keeps the same button, which now
                saves the edit rather than publishing it again. */}
            <Button
              className={styles.primary}
              disabled={busy !== null}
              onClick={() => save(!isPublished)}
            >
              {isPublished ? "შენახვა" : "გამოქვეყნება"}
            </Button>
          </div>
        </div>
      </main>

      {/* The article that was just made is a different event from a save on one
          that already existed, so the dialog says which of the two happened. */}
      <ResultModal
        open={done !== null}
        onClose={() => setDone(null)}
        tone="done"
        heading={
          done?.kind === "created"
            ? done.slug
              ? "სტატია გამოქვეყნდა"
              : "სტატია შეიქმნა"
            : "ცვლილებები შენახულია"
        }
        note={
          done?.kind === "created"
            ? "სტატია შენს სიაშია და მისი ბმული მზადაა."
            : "ყველა ცვლილება ჩაიწერა."
        }
      >
        {done?.slug && (
          <Button
            fullWidth
            className={styles.doneGo}
            onClick={() => router.push(`/a/${done.slug}`)}
          >
            სტატიის ნახვა
          </Button>
        )}
        <Button
          fullWidth
          variant={done?.slug ? "outline" : "solid"}
          className={done?.slug ? styles.doneStay : styles.doneGo}
          onClick={() => setDone(null)}
        >
          {done?.slug ? "წერის გაგრძელება" : "კარგი"}
        </Button>
      </ResultModal>

      {/* A failed save is worth stopping for, in the same dialog and the other
          colour. */}
      <ResultModal
        open={error !== null}
        onClose={() => setError(null)}
        tone="failed"
        heading="გამოქვეყნება ვერ მოხერხდა"
        note={error ?? undefined}
      />
    </div>
  );
}

type Done = {
  kind: "created" | "saved";
  /** Present once the article is public — the address to hand the author. */
  slug: string | null;
};
