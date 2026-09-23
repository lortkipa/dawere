'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { ExternalLink, FileText, Loader2, PenLine, Plus, Star, StarOff, Trash2 } from 'lucide-react';
import { deleteTopicAction, saveTopicAction, setTopicFeaturedAction } from '@/app/actions/admin';
import { FormDialog, RowMenu, TD_CLASS, TH_CLASS, TableFrame } from '@/components/admin/controls';
import { toast } from '@/components/toaster';
import { Badge, Button, Field, FormError, Input, Textarea } from '@/components/ui';
import type { FormState } from '@/lib/validation';
import { formatCount } from '@/lib/utils';

export type TopicRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isFeatured: boolean;
  published: number;
  followers: number;
};

type Editing = TopicRow | 'new' | null;

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      შენახვა
    </Button>
  );
}

function TopicDialog({ topic, onClose }: { topic: Editing; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(saveTopicAction, { ok: false } as FormState);
  const open = topic !== null;
  const t = topic === 'new' ? null : topic;
  const errors = state.fieldErrors ?? {};
  const v = { name: t?.name ?? '', slug: t?.slug ?? '', description: t?.description ?? '', ...state.values };

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (state.ok) {
      toast(t ? 'თემა შეინახა' : 'თემა შეიქმნა');
      onClose();
    }
    // Only a fresh success should close; `state` changes once per submit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-raised p-0 text-ink shadow-lift"
    >
      {open ? (
        <form action={formAction} className="space-y-4 p-6">
          <h2 className="text-base font-semibold">{t ? 'თემის რედაქტირება' : 'ახალი თემა'}</h2>
          {t ? <input type="hidden" name="id" value={t.id} /> : null}
          <Field label="სახელი" htmlFor="topic-name" error={errors.name}>
            <Input id="topic-name" name="name" defaultValue={v.name} required maxLength={40} autoFocus />
          </Field>
          <Field label="მისამართი" hint="/topic/…" htmlFor="topic-slug" error={errors.slug}>
            <Input id="topic-slug" name="slug" defaultValue={v.slug} maxLength={40} placeholder="სახელიდან შეიქმნება" />
          </Field>
          <Field label="აღწერა" htmlFor="topic-description" error={errors.description}>
            <Textarea id="topic-description" name="description" defaultValue={v.description} rows={3} maxLength={200} />
          </Field>
          <label className="flex items-start gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={t?.isFeatured ?? false}
              className="mt-1 size-4 accent-[var(--accent)]"
            />
            <span>
              რჩეული
              <span className="block text-[13px] text-muted">ჩანს რეგისტრაციისას და გვერდითა თემებში.</span>
            </span>
          </label>
          {state.error ? <FormError>{state.error}</FormError> : null}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              გაუქმება
            </Button>
            <SaveButton />
          </div>
        </form>
      ) : null}
    </dialog>
  );
}

export function TopicsManager({ rows }: { rows: TopicRow[] }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [editKey, setEditKey] = useState(0);
  const [deleting, setDeleting] = useState<TopicRow | null>(null);
  const [pending, startTransition] = useTransition();

  function edit(topic: Editing) {
    // A fresh form state per opening, so an old error never greets a new edit.
    setEditKey((k) => k + 1);
    setEditing(topic);
  }

  function toggleFeatured(topic: TopicRow) {
    startTransition(async () => {
      const result = await setTopicFeaturedAction(topic.id, !topic.isFeatured);
      if (!result.ok) toast(result.error ?? 'ვერ მოხერხდა.', 'error');
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => edit('new')}>
          <Plus />
          ახალი თემა
        </Button>
      </div>

      <TableFrame>
        <thead className="border-b border-line bg-sunken">
          <tr>
            <th className={TH_CLASS}>თემა</th>
            <th className={TH_CLASS}>აღწერა</th>
            <th className={`${TH_CLASS} text-right`}>სტატიები</th>
            <th className={`${TH_CLASS} text-right`}>დაინტერესებული</th>
            <th className={`${TH_CLASS} w-12`}>
              <span className="sr-only">მოქმედებები</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((topic) => (
            <tr key={topic.id}>
              <td className={TD_CLASS}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFeatured(topic)}
                    disabled={pending}
                    title={topic.isFeatured ? 'რჩეულებიდან ამოღება' : 'რჩეულად მონიშვნა'}
                    aria-pressed={topic.isFeatured}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-hover hover:text-ink"
                  >
                    <Star className={topic.isFeatured ? 'size-4 fill-accent text-accent' : 'size-4'} />
                  </button>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => edit(topic)}
                      className="truncate text-left font-medium text-ink hover:underline"
                    >
                      {topic.name}
                    </button>
                    <p className="truncate text-[12px] text-subtle">/topic/{topic.slug}</p>
                  </div>
                  {topic.isFeatured ? <Badge tone="accent">რჩეული</Badge> : null}
                </div>
              </td>
              <td className={`${TD_CLASS} max-w-xs`}>
                <p className="line-clamp-2 text-[13px] text-muted">{topic.description || '—'}</p>
              </td>
              <td className={`${TD_CLASS} text-right text-muted tabular-nums`}>{formatCount(topic.published)}</td>
              <td className={`${TD_CLASS} text-right text-muted tabular-nums`}>{formatCount(topic.followers)}</td>
              <td className={TD_CLASS}>
                <RowMenu
                  items={[
                    { label: 'რედაქტირება', icon: <PenLine />, onSelect: () => edit(topic) },
                    topic.isFeatured
                      ? { label: 'რჩეულებიდან ამოღება', icon: <StarOff />, onSelect: () => toggleFeatured(topic) }
                      : { label: 'რჩეულად მონიშვნა', icon: <Star />, onSelect: () => toggleFeatured(topic) },
                    { label: 'სტატიები', icon: <FileText />, href: `/admin/posts?topic=${topic.slug}` },
                    { label: 'საიტზე ნახვა', icon: <ExternalLink />, href: `/topic/${topic.slug}` },
                    null,
                    { label: 'წაშლა', icon: <Trash2 />, danger: true, onSelect: () => setDeleting(topic) },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </TableFrame>

      <TopicDialog key={editKey} topic={editing} onClose={() => setEditing(null)} />

      <FormDialog
        open={deleting !== null}
        title="წავშალოთ თემა?"
        description={
          deleting ? (
            <>
              „{deleting.name}“ მოეხსნება {deleting.published > 0 ? `${deleting.published} სტატიას` : 'ყველა სტატიას'}. თავად
              სტატიები არ წაიშლება.{' '}
              <Link href={`/admin/posts?topic=${deleting.slug}`} className="underline underline-offset-2">
                ნახე სტატიები
              </Link>
            </>
          ) : null
        }
        confirmLabel="წაშლა"
        pending={pending}
        onClose={() => !pending && setDeleting(null)}
        onConfirm={() => {
          const topic = deleting;
          if (!topic) return;
          startTransition(async () => {
            const result = await deleteTopicAction(topic.id);
            setDeleting(null);
            toast(result.ok ? 'თემა წაიშალა' : (result.error ?? 'ვერ მოხერხდა.'), result.ok ? 'success' : 'error');
          });
        }}
      />
    </>
  );
}
