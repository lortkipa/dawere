"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { report } from "@/app/reports/actions";
import { maxReportDetails, reasonsFor, reportTitles, type ReportKind } from "@/lib/report-rules";
import { Button } from "./button";
import { Dialog, DialogFooter } from "./dialog";
import { EditForm } from "./edit-form";
import { Icon, MenuItem, menuClass, useDismiss } from "./menu";

// Picks a reason and sends the report; then says it was sent instead of closing at once.
export function ReportDialog({ kind, id, onClose }: { kind: ReportKind; id: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);
  const needsDetails = reason === "other" && !details.trim();

  if (sent) {
    return (
      <Dialog title="ჩივილი გაიგზავნა" art="report" onClose={onClose}>
        <p className="text-muted">ადმინები განიხილავენ.</p>
        <DialogFooter>
          <Button onClick={onClose}>კარგი</Button>
        </DialogFooter>
      </Dialog>
    );
  }

  return (
    <Dialog title={reportTitles[kind]} art="report" onClose={onClose}>
      <EditForm
        canSave={Boolean(reason) && !needsDetails}
        save={() => report(kind, id, reason, details)}
        onClose={onClose}
        onSaved={() => setSent(true)}
        saveLabel="გაგზავნა"
        counter={`${details.length}/${maxReportDetails}`}
      >
        <fieldset>
          <legend className="mb-2 text-sm text-muted">რა არის არასწორად?</legend>
          <div className="flex flex-col">
            {reasonsFor(kind).map((option) => (
              <label
                key={option.slug}
                className="-mx-1 flex cursor-pointer items-center gap-3 rounded-lg px-1 py-1.5 text-[15px] transition-colors hover:bg-surface"
              >
                <input
                  type="radio"
                  name="reason"
                  value={option.slug}
                  checked={reason === option.slug}
                  onChange={() => setReason(option.slug)}
                  className="size-4 shrink-0 cursor-pointer accent-[var(--color-ink)]"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label htmlFor="report-details" className="mt-4 mb-1.5 block text-sm font-medium">
          {reason === "other" ? "დეტალები" : "დეტალები (არასავალდებულო)"}
        </label>
        <textarea
          id="report-details"
          rows={2}
          maxLength={maxReportDetails}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          className="block w-full resize-none rounded-lg border border-line bg-bg px-4 py-3 text-base outline-offset-0 transition-colors focus:border-ink"
        />
      </EditForm>
    </Dialog>
  );
}

// A "…" menu whose only item reports `id`: on a post page's byline, a profile and comments.
export function ReportMenu({
  kind,
  id,
  label,
  vertical = false,
  className = "",
}: {
  kind: ReportKind;
  id: string;
  label: string;
  // Comments use the smaller vertical dots.
  vertical?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-label="მეტი"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink ${
          vertical ? "size-8" : "size-9"
        }`}
      >
        {vertical ? (
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="1.75" />
            <circle cx="12" cy="12" r="1.75" />
            <circle cx="12" cy="19" r="1.75" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.75" />
            <circle cx="12" cy="12" r="1.75" />
            <circle cx="19" cy="12" r="1.75" />
          </svg>
        )}
      </button>

      {open && (
        <div role="menu" className={`${menuClass} w-60`}>
          <ReportItem
            onClick={() => {
              close();
              setReporting(true);
            }}
          >
            {label}
          </ReportItem>
        </div>
      )}

      {reporting && <ReportDialog kind={kind} id={id} onClose={() => setReporting(false)} />}
    </div>
  );
}

export function ReportItem({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <MenuItem icon={<FlagIcon />} danger onClick={onClick}>
      {children}
    </MenuItem>
  );
}

export function FlagIcon() {
  return (
    <Icon>
      <path d="M4 22V4a1 1 0 0 1 1-1h13l-2.5 5L18 13H5" />
    </Icon>
  );
}
