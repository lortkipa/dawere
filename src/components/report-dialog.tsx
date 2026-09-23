'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Flag } from 'lucide-react';
import { reportAction } from '@/app/actions/reports';
import { FormDialog } from '@/components/admin/controls';
import { toast } from '@/components/toaster';
import { Textarea } from '@/components/ui';
import type { ReportTarget } from '@/db/schema';
import { REASONS_FOR, REPORT_REASONS } from '@/lib/reports';
import { cn } from '@/lib/utils';

const TITLES: Record<ReportTarget, string> = {
  post: 'სტატიის შეტყობინება',
  comment: 'კომენტარის შეტყობინება',
  user: 'პროფილის შეტყობინება',
};

/** Asks why, then files the report. Mount it only while it is open. */
export function ReportDialog({
  targetType,
  targetId,
  onClose,
}: {
  targetType: ReportTarget;
  targetId: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [reason, setReason] = useState('');

  return (
    <FormDialog
      open
      title={TITLES[targetType]}
      description="რა არღვევს წესებს? შეტყობინებას მხოლოდ ადმინები ნახავენ; ვინ გამოგზავნა, ავტორი ვერ გაიგებს."
      confirmLabel="გაგზავნა"
      tone="primary"
      pending={pending}
      error={error}
      onClose={() => !pending && onClose()}
      onConfirm={(data) => {
        if (!reason) {
          setError('აირჩიე მიზეზი.');
          return;
        }
        startTransition(async () => {
          const result = await reportAction({
            targetType,
            targetId,
            reason,
            details: String(data.get('details') ?? ''),
          });
          if (!result.ok) {
            setError(result.error ?? 'ვერ მოხერხდა.');
            return;
          }
          toast(result.duplicate ? 'ამაზე უკვე შეგვატყობინე — ადმინები განიხილავენ.' : 'მადლობა, შეტყობინება მიღებულია.');
          onClose();
        });
      }}
    >
      <fieldset className="space-y-1">
        <legend className="sr-only">მიზეზი</legend>
        {REASONS_FOR[targetType].map((value) => (
          <label
            key={value}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
              reason === value ? 'border-accent/40 bg-accent-soft text-ink' : 'border-transparent text-muted hover:bg-hover hover:text-ink',
            )}
          >
            <input
              type="radio"
              name="reason"
              value={value}
              checked={reason === value}
              onChange={() => {
                setReason(value);
                setError(undefined);
              }}
              className="size-4 accent-accent"
            />
            {REPORT_REASONS[value]}
          </label>
        ))}
      </fieldset>
      <Textarea
        name="details"
        rows={3}
        maxLength={1000}
        required={reason === 'other'}
        placeholder={reason === 'other' ? 'მოკლედ აღწერე, რა ხდება.' : 'დამატებითი დეტალები (არასავალდებულო)'}
        aria-label="დეტალები"
      />
    </FormDialog>
  );
}

/** A "report" trigger for a post or a profile; signed-out readers are sent to sign in first. */
export function ReportButton({
  targetType,
  targetId,
  signedIn,
  variant = 'link',
}: {
  targetType: ReportTarget;
  targetId: string;
  signedIn: boolean;
  variant?: 'link' | 'icon';
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function onClick() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setOpen(true);
  }

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={onClick}
          title="დარღვევის შეტყობინება"
          aria-label="დარღვევის შეტყობინება"
          className="flex size-9 items-center justify-center rounded-lg border border-line-strong bg-raised text-muted shadow-soft transition-colors hover:bg-hover hover:text-ink"
        >
          <Flag className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 text-[12px] text-subtle transition-colors hover:text-ink"
        >
          <Flag className="size-3.5" aria-hidden />
          დარღვევის შეტყობინება
        </button>
      )}
      {open ? <ReportDialog targetType={targetType} targetId={targetId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
