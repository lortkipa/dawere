'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ExternalLink, EyeOff, ImagePlus, Loader2, RotateCcw, Save, Send, Trash2, Undo2, X } from 'lucide-react';
import { discardPendingRevisionAction, updatePostAdminAction } from '@/app/actions/admin';
import { usePostActions } from '@/components/admin/posts-table';
import { FormDialog } from '@/components/admin/controls';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { TagInput } from '@/components/editor/tag-input';
import { toast } from '@/components/toaster';
import { Button, ButtonLink, FormError } from '@/components/ui';
import type { PostRevision } from '@/db/schema';
import { uploadImage } from '@/lib/upload-client';

/**
 * An admin's editor for someone else's post. Unlike the author's editor it
 * does not autosave: every save is a logged moderation change, so it happens
 * when the admin says so and not on every keystroke.
 */
export function AdminPostEditor({
  postId,
  slug,
  published,
  hasPending,
  initial,
  topicSuggestions,
}: {
  postId: string;
  slug: string;
  published: boolean;
  hasPending: boolean;
  initial: PostRevision;
  topicSuggestions: string[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<PostRevision>(initial);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, startSave] = useTransition();
  const [uploadingCover, setUploadingCover] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discarding, startDiscard] = useTransition();
  const coverRef = useRef<HTMLInputElement>(null);
  const { act, dialogs, pending } = usePostActions({ onDeleted: () => router.push('/admin/posts') });

  function update(patch: Partial<PostRevision>) {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  }

  // Leaving with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function save() {
    setError(undefined);
    startSave(async () => {
      const result = await updatePostAdminAction(postId, draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDirty(false);
      toast('შენახულია');
    });
  }

  async function onCoverSelected(file: File) {
    setUploadingCover(true);
    try {
      const result = await uploadImage(file);
      if (result.url) update({ coverImageUrl: result.url });
      else setError(result.error);
    } finally {
      setUploadingCover(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0">
        {hasPending ? (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-text">
            <AlertCircle className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              ავტორს აქვს გამოუქვეყნებელი ცვლილებები. აქ ჩანს საიტზე არსებული ვერსია; თუ ავტორი „განახლებას“ დააჭერს,
              მისი ვერსია ჩაანაცვლებს შენს ცვლილებებს.
            </span>
            <Button variant="outline" size="sm" onClick={() => setConfirmDiscard(true)}>
              <Undo2 />
              ავტორის ცვლილებების გაუქმება
            </Button>
          </div>
        ) : null}

        {error ? (
          <div className="mb-6">
            <FormError>{error}</FormError>
          </div>
        ) : null}

        <div className="rounded-2xl border border-line bg-raised px-4 py-6 sm:px-8 sm:py-8">
          {draft.coverImageUrl ? (
            <div className="group relative mb-6 overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.coverImageUrl} alt="" className="max-h-72 w-full object-cover" />
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => coverRef.current?.click()}
                  className="flex h-8 items-center gap-1.5 rounded-full bg-black/65 px-3 text-[13px] font-medium text-white backdrop-blur hover:bg-black/80"
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
              className="mb-4 inline-flex h-8 items-center gap-2 rounded-full px-2.5 text-[13px] text-subtle transition-colors hover:bg-hover hover:text-ink"
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

          <input
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="სათაური"
            maxLength={160}
            aria-label="სათაური"
            className="w-full bg-transparent text-[1.75rem] leading-tight font-bold tracking-tight text-ink placeholder:text-subtle/60 focus:outline-none"
          />
          <input
            value={draft.subtitle}
            onChange={(e) => update({ subtitle: e.target.value })}
            placeholder="ქვესათაური"
            maxLength={240}
            aria-label="ქვესათაური"
            className="mt-2 w-full bg-transparent text-lg text-muted placeholder:text-subtle/60 focus:outline-none"
          />

          <div className="mt-5">
            <TagInput value={draft.topics} onChange={(topics) => update({ topics })} suggestions={topicSuggestions} />
          </div>

          <div className="mt-6">
            <RichTextEditor
              initialContent={initial.contentHtml}
              onChange={(contentHtml) => update({ contentHtml })}
              onUploadImage={uploadImage}
              onError={setError}
            />
          </div>
        </div>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-8 lg:self-start">
        <Button className="w-full" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {dirty ? 'ცვლილებების შენახვა' : 'შენახულია'}
        </Button>
        <p className="text-[12px] leading-relaxed text-subtle">
          {published
            ? 'შენახვისთანავე მკითხველი ახალ ვერსიას დაინახავს.'
            : 'სტატია მონახაზია: ცვლილებებს მხოლოდ ავტორი და ადმინები ხედავენ.'}
        </p>

        <div className="space-y-2 border-t border-line pt-3">
          {published ? (
            <>
              <ButtonLink href={`/p/${slug}`} variant="outline" className="w-full">
                <ExternalLink />
                საიტზე ნახვა
              </ButtonLink>
              <Button variant="outline" className="w-full" disabled={pending} onClick={() => act.unpublish([postId])}>
                <EyeOff />
                პუბლიკაციიდან მოხსნა
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              disabled={pending || dirty}
              title={dirty ? 'ჯერ შეინახე ცვლილებები' : undefined}
              onClick={() => act.publish(postId)}
            >
              <Send />
              გამოქვეყნება
            </Button>
          )}
          <Button variant="danger" className="w-full" disabled={pending} onClick={() => act.delete([postId])}>
            <Trash2 />
            წაშლა
          </Button>
        </div>

        <p className="border-t border-line pt-3 text-[12px] leading-relaxed text-subtle">
          ყველა ცვლილება{' '}
          <Link href="/admin/log" className="underline underline-offset-2 hover:text-ink">
            ადმინების ჟურნალში
          </Link>{' '}
          ჩაიწერება.
        </p>
      </aside>

      <FormDialog
        open={confirmDiscard}
        title="გავაუქმოთ ავტორის ცვლილებები?"
        description="ავტორის გამოუქვეყნებელი ვერსია წაიშლება. საიტზე არსებული ტექსტი უცვლელი დარჩება."
        confirmLabel="გაუქმება"
        pending={discarding}
        onClose={() => !discarding && setConfirmDiscard(false)}
        onConfirm={() =>
          startDiscard(async () => {
            const result = await discardPendingRevisionAction(postId);
            setConfirmDiscard(false);
            toast(result.ok ? 'ავტორის ცვლილებები გაუქმდა' : (result.error ?? 'ვერ მოხერხდა.'), result.ok ? 'success' : 'error');
          })
        }
      />
      {dialogs}
    </div>
  );
}
