'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ExternalLink,
  EyeOff,
  ImagePlus,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { RichTextEditor } from './rich-text-editor';
import { TagInput } from './tag-input';
import {
  deletePostAction,
  discardChangesAction,
  publishPostAction,
  savePostAction,
  unpublishPostAction,
  type SaveResult,
} from '@/app/actions/posts';
import { Button, FormError, MENU_CLASS, MENU_ITEM_CLASS } from '@/components/ui';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from '@/components/toaster';
import { uploadImage } from '@/lib/upload-client';
import { cn, minutesForLength } from '@/lib/utils';

type Draft = {
  title: string;
  subtitle: string;
  contentHtml: string;
  coverImageUrl: string | null;
  topics: string[];
};

type SaveState = 'idle' | 'dirty' | 'saving' | 'error';

/** A textarea that grows with its content, including on first render. */
function useAutoHeight(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return ref;
}

export function PostEditor({
  postId,
  slug,
  status,
  initial,
  initiallyPending,
  topicSuggestions,
}: {
  postId: string;
  slug: string;
  status: 'draft' | 'published';
  initial: Draft;
  /** A published post with edits that have not been pushed live yet. */
  initiallyPending: boolean;
  topicSuggestions: string[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | undefined>();
  const [pendingChanges, setPendingChanges] = useState(initiallyPending);
  // Anything typed this session, saved or not: enough to make "update" meaningful.
  const [edited, setEdited] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<'delete' | 'discard' | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [textLength, setTextLength] = useState(0);
  const [pending, startTransition] = useTransition();
  const coverRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const titleRef = useAutoHeight(draft.title);
  const subtitleRef = useAutoHeight(draft.subtitle);

  const published = status === 'published';

  // `latest` lets the save and unload handlers read current values without
  // re-registering on every keystroke.
  const latest = useRef(draft);
  const dirty = useRef(false);
  const inFlight = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  /**
   * Saves are serialised: a save started while another is running waits for
   * it, so an older snapshot can never land after a newer one. A failed save
   * leaves the draft dirty, so the next attempt still carries the changes.
   * Resolves to whether this call actually stored something.
   */
  const save = useCallback(async () => {
    while (inFlight.current) await inFlight.current;
    if (!dirty.current) return false;
    dirty.current = false;
    setSaveState('saving');

    const run = (async () => {
      let result: SaveResult;
      try {
        result = await savePostAction(postId, latest.current);
      } catch {
        result = { ok: false, error: 'კავშირი ვერ დამყარდა. ცვლილებები ჯერ არ შენახულა.' };
      }
      if (result.ok) {
        setSaveState(dirty.current ? 'dirty' : 'idle');
        setError(undefined);
        if (published) setPendingChanges(true);
      } else {
        dirty.current = true;
        setSaveState('error');
        setError(result.error);
      }
      return result.ok;
    })();

    inFlight.current = run;
    try {
      return await run;
    } finally {
      inFlight.current = null;
    }
  }, [postId, published]);

  const saveNow = useCallback(async () => {
    if (await save()) toast('შენახულია');
  }, [save]);

  function update(patch: Partial<Draft>) {
    dirty.current = true;
    setEdited(true);
    setSaveState('dirty');
    setDraft((current) => ({ ...current, ...patch }));
  }

  // Nothing is saved behind the writer's back: a warning when leaving with
  // unsaved changes, and Ctrl/Cmd+S alongside the save button.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (dirty.current || inFlight.current) event.preventDefault();
    }
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveNow();
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('keydown', onKey);
    };
  }, [saveNow]);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  function fail(message: string | undefined) {
    setError(message);
    toast(message ?? 'ვერ მოხერხდა.', 'error');
  }

  function onPublish() {
    startTransition(async () => {
      await save();
      if (dirty.current) return; // the save failed; its error is already showing
      const result = await publishPostAction(postId);
      // A successful publish redirects, so reaching here means it refused.
      if (result && !result.ok) fail(result.error);
    });
  }

  function onUnpublish() {
    setMenuOpen(false);
    startTransition(async () => {
      await save();
      const result = await unpublishPostAction(postId);
      if (result.ok) {
        toast('სტატია მონახაზებში გადავიდა');
        router.refresh();
      } else {
        fail(result.error);
      }
    });
  }

  function onDiscard() {
    startTransition(async () => {
      // Anything still queued would re-create the revision we are discarding.
      dirty.current = false;
      while (inFlight.current) await inFlight.current;
      const result = await discardChangesAction(postId);
      if (result.ok) {
        // Reload rather than refresh: the editor's content is uncontrolled and
        // must be rebuilt from the published text.
        window.location.reload();
      } else {
        setConfirm(null);
        fail(result.error);
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      dirty.current = false;
      while (inFlight.current) await inFlight.current;
      const result = await deletePostAction(postId);
      if (result && !result.ok) {
        setConfirm(null);
        fail(result.error);
      }
    });
  }

  async function onCoverSelected(file: File) {
    setUploadingCover(true);
    try {
      const result = await uploadImage(file);
      if (result.url) update({ coverImageUrl: result.url });
      else fail(result.error);
    } finally {
      setUploadingCover(false);
    }
  }

  const minutes = minutesForLength(textLength);
  const characters = textLength.toLocaleString('en-US').replace(/,/g, ' ');

  return (
    <>
      <main className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col px-4 pt-8 pb-8 sm:px-6 sm:pt-14">
        {published && pendingChanges ? (
          <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-warning-border bg-warning-soft px-5 py-3.5 text-sm text-warning-text">
            <AlertCircle className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              ცვლილებებს ჯერ მხოლოდ შენ ხედავ. მკითხველი ძველ ვერსიას კითხულობს, სანამ „განახლებას“ არ დააჭერ.
            </span>
          </div>
        ) : null}

        {error ? (
          <div className="mb-6">
            <FormError>{error}</FormError>
          </div>
        ) : null}

        {/* ------------------------------------------------------------ cover */}
        {draft.coverImageUrl ? (
          <div className="group relative mb-10 overflow-hidden rounded-2xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.coverImageUrl} alt="" className="max-h-96 w-full object-cover" />
            <div className="absolute top-3 right-3 flex gap-2 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                className="flex h-8 items-center gap-1.5 rounded-full bg-black/65 px-3.5 text-[13px] font-medium text-white backdrop-blur hover:bg-black/80"
              >
                {uploadingCover ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                შეცვლა
              </button>
              <button
                type="button"
                onClick={() => update({ coverImageUrl: null })}
                className="flex size-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur hover:bg-black/80"
                aria-label="ყდის სურათის წაშლა"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            disabled={uploadingCover}
            className="mb-6 -ml-3 inline-flex h-9 items-center gap-2 rounded-full px-3 text-[13px] text-subtle transition-colors hover:bg-hover hover:text-ink"
          >
            {uploadingCover ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            ყდის სურათი
          </button>
        )}
        <input
          ref={coverRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onCoverSelected(file);
            event.target.value = '';
          }}
        />

        {/* ----------------------------------------------------------- fields */}
        <textarea
          ref={titleRef}
          value={draft.title}
          onChange={(e) => update({ title: e.target.value.replace(/\n/g, '') })}
          placeholder="სათაური"
          rows={1}
          maxLength={160}
          aria-label="სათაური"
          className="headline w-full resize-none overflow-hidden bg-transparent text-[2.15rem] leading-[1.12] text-ink placeholder:text-subtle/60 focus:outline-none sm:text-[2.9rem]"
        />

        <textarea
          ref={subtitleRef}
          value={draft.subtitle}
          onChange={(e) => update({ subtitle: e.target.value.replace(/\n/g, '') })}
          placeholder="ქვესათაური — ერთი წინადადება, რომელიც კითხვის სურვილს აღძრავს"
          rows={1}
          maxLength={240}
          aria-label="ქვესათაური"
          className="mt-4 w-full resize-none overflow-hidden bg-transparent text-lg leading-relaxed text-muted placeholder:text-subtle/60 focus:outline-none sm:text-[1.3rem]"
        />

        <div className="mt-5">
          <TagInput
            value={draft.topics}
            onChange={(topics) => update({ topics })}
            suggestions={topicSuggestions}
          />
        </div>

        <div className="mt-8">
          <RichTextEditor
            initialContent={initial.contentHtml}
            onChange={(contentHtml, length) => {
              setTextLength(length);
              update({ contentHtml });
            }}
            onReady={setTextLength}
            onUploadImage={uploadImage}
            onError={fail}
          />
        </div>

        <p className="mt-10 mb-8 border-t border-line pt-4 text-[12px] text-subtle">
          {characters} სიმბოლო · დაახლოებით {minutes} წთ კითხვა
          <span className="hidden sm:inline"> · Ctrl+S ინახავს მონახაზს</span>
        </p>

        {/* ------------------------------------------------------------ dock */}
        {/* The article's own actions travel with the writer: a bar that rides
            the foot of the column and settles under the text once it is
            scrolled to the end. */}
        <div className="publish-dock sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 mt-auto">
          <div className="flex w-full items-center gap-1 rounded-full border border-line bg-raised/85 p-1.5 shadow-lift backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setConfirm('delete')}
              aria-label="სტატიის წაშლა"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-danger-soft hover:text-danger sm:px-4"
            >
              <Trash2 className="size-4" />
              <span className="hidden sm:inline">წაშლა</span>
            </button>

            {/* A draft has nothing else to offer beyond delete, save and publish. */}
            {published ? (
              <>
                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label="სხვა მოქმედებები"
                    className={cn(
                      'flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-ink',
                      menuOpen && 'bg-hover text-ink',
                    )}
                  >
                    <MoreHorizontal className="size-[18px]" />
                  </button>
                  {menuOpen ? (
                    <div role="menu" className={cn(MENU_CLASS, 'absolute bottom-full left-0 mb-3 w-60')}>
                      <MenuItem icon={ExternalLink} href={`/p/${slug}`} className="sm:hidden">
                        სტატიის ნახვა
                      </MenuItem>
                      {pendingChanges ? (
                        <MenuItem
                          icon={Undo2}
                          onClick={() => {
                            setMenuOpen(false);
                            setConfirm('discard');
                          }}
                        >
                          ცვლილებების გაუქმება
                        </MenuItem>
                      ) : null}
                      <MenuItem icon={EyeOff} onClick={onUnpublish}>
                        მონახაზებში გადატანა
                      </MenuItem>
                    </div>
                  ) : null}
                </div>

                <Link
                  href={`/p/${slug}`}
                  aria-label="სტატიის ნახვა"
                  title="სტატიის ნახვა"
                  className="hidden size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-ink sm:inline-flex"
                >
                  <ExternalLink className="size-[18px]" />
                </Link>
              </>
            ) : null}

            <SaveButton
              state={saveState}
              published={published}
              disabled={pending}
              onSave={() => void saveNow()}
              className="ml-auto"
            />

            <Button
              onClick={onPublish}
              disabled={pending || (published && !pendingChanges && !edited)}
              className="flex-1 sm:flex-none sm:px-6"
            >
              {pending ? <Loader2 className="animate-spin" /> : null}
              {published ? 'განახლება' : 'გამოქვეყნება'}
            </Button>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={confirm === 'delete'}
        title="წავშალოთ სტატია?"
        description="სტატია, მისი კომენტარები და სტატისტიკა სამუდამოდ წაიშლება. ამის დაბრუნება შეუძლებელია."
        confirmLabel="წაშლა"
        pending={pending}
        onConfirm={onDelete}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'discard'}
        title="გავაუქმოთ ცვლილებები?"
        description="რედაქტორი დაუბრუნდება გამოქვეყნებულ ვერსიას. ბოლო განახლების შემდეგ შეტანილი ცვლილებები დაიკარგება."
        confirmLabel="გაუქმება"
        pending={pending}
        onConfirm={onDiscard}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  href,
  danger,
  className,
}: {
  icon: typeof Trash2;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  className?: string;
}) {
  const classes = cn(MENU_ITEM_CLASS, danger && 'text-danger hover:bg-danger-soft hover:text-danger', className);
  if (href) {
    return (
      <Link href={href} role="menuitem" className={classes}>
        <Icon />
        {children}
      </Link>
    );
  }
  return (
    <button type="button" role="menuitem" onClick={onClick} className={classes}>
      <Icon />
      {children}
    </button>
  );
}

function SaveButton({
  state,
  published,
  disabled,
  onSave,
  className,
}: {
  state: SaveState;
  /** On a live post a save keeps the edits private until "update". */
  published: boolean;
  disabled: boolean;
  onSave: () => void;
  className?: string;
}) {
  const saveLabel = published ? 'ცვლილებების შენახვა' : 'მონახაზის შენახვა';
  const { icon: Icon, label, short } = {
    idle: { icon: Save, label: saveLabel, short: 'შენახვა' },
    dirty: { icon: Save, label: saveLabel, short: 'შენახვა' },
    saving: { icon: Loader2, label: 'ინახება…', short: 'ინახება…' },
    error: { icon: AlertCircle, label: 'ხელახლა ცდა', short: 'ხელახლა' },
  }[state];
  const actionable = state === 'dirty' || state === 'error';

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={disabled || !actionable}
      aria-label={label}
      title={actionable ? 'Ctrl+S' : undefined}
      className={cn(
        'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors',
        'disabled:pointer-events-none [&>svg]:size-4 [&>svg]:shrink-0',
        {
          idle: 'bg-sunken text-subtle',
          dirty: 'bg-accent-soft text-accent hover:bg-accent hover:text-accent-contrast',
          saving: 'bg-accent-soft text-accent',
          error: 'bg-danger-soft text-danger hover:bg-danger hover:text-danger-contrast',
        }[state],
        disabled && 'opacity-45',
        className,
      )}
    >
      <Icon className={cn(state === 'saving' && 'animate-spin')} />
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
