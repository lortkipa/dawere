"use client";

import { useState, useTransition } from "react";
import { resetCodeEmailFooter, saveCodeEmailFooter } from "@/app/admin/email/actions";
import {
  cleanCodeEmailFooter,
  codeEmailSubject,
  codeEmailText,
  codeLifetimeMinutes,
  maxCodeEmailFooterLength,
} from "@/lib/code-email";
import { Button } from "../button";
import { useLeaveWarning } from "../writer";

const genericError = "რაღაც შეცდომაა, სცადე თავიდან";
const sampleCode = "123456";

export function CodeEmailEditor({ footer, isDefault }: { footer: string; isDefault: boolean }) {
  const [value, setValue] = useState(footer);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const dirty = cleanCodeEmailFooter(value) !== footer;
  useLeaveWarning(dirty && !pending, "ცვლილებები არ შეინახება. მაინც გახვალ?");

  function run(action: () => Promise<{ error: string } | void>) {
    setError("");
    startTransition(async () => {
      try {
        const result = await action();
        if (result?.error) setError(result.error);
      } catch {
        setError(genericError);
      }
    });
  }

  function reset() {
    if (!window.confirm("წერილს საწყისი ტექსტი დაუბრუნდება. გავაგრძელო?")) return;
    run(resetCodeEmailFooter);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label htmlFor="code-email-footer" className="text-sm font-medium">
          ტექსტი კოდის ქვემოთ
        </label>
        <textarea
          id="code-email-footer"
          rows={6}
          maxLength={maxCodeEmailFooterLength}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError("");
          }}
          className="block w-full resize-y rounded-lg border border-line bg-bg px-4 py-3 text-base outline-offset-0 transition-colors focus:border-ink"
        />
        <p className="text-sm text-muted">
          კოდი ყოველთვის {codeLifetimeMinutes} წუთი მოქმედებს, ასე რომ ტექსტში სხვა დრო არ დაწერო. ცარიელი ტექსტით
          წერილი კოდით მთავრდება.
        </p>
        {error && (
          <p aria-live="polite" className="text-sm text-error">
            {error}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button onClick={() => run(() => saveCodeEmailFooter(value))} disabled={!dirty || pending}>
            შენახვა
          </Button>
          {!isDefault && (
            <Button variant="outline" onClick={reset} disabled={pending}>
              ნაგულისხმევის აღდგენა
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">წინასწარი ნახვა</p>
        <div className="rounded-xl border border-line">
          <p className="border-b border-line px-4 py-3 text-sm">
            <span className="text-muted">თემა: </span>
            {codeEmailSubject(sampleCode)}
          </p>
          <p className="px-4 py-4 text-[15px] leading-relaxed break-words whitespace-pre-wrap">
            {codeEmailText(sampleCode, cleanCodeEmailFooter(value))}
          </p>
        </div>
      </div>
    </div>
  );
}
