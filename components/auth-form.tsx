"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyCode } from "@/app/auth/actions";
import { emailPattern } from "@/lib/profile-rules";
import { FacebookIcon, GoogleIcon } from "./brand-icons";
import { Button } from "./button";
import { headingClasses } from "./heading";
import { TextInput } from "./text-input";

const codeLength = 6;
const emptyCode = Array<string>(codeLength).fill("");
const resendCooldown = 60;

// What /auth/google sends back in `?error=` when signing in with Google didn't work.
const googleErrors: Record<string, string> = {
  google: "Google-ით შესვლა ვერ მოხერხდა. სცადე თავიდან.",
  "google-off": "Google-ით შესვლა ჯერ არ მუშაობს.",
  banned: "ეს ანგარიში დაბლოკილია",
};

export function AuthForm() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("next");
  const googleError = googleErrors[searchParams.get("error") ?? ""];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailPattern.test(email.trim())) {
      setError("შეიყვანე სწორი ელფოსტა");
      return;
    }
    // Sending the code comes with the backend; for now just move on.
    setStep("code");
  }

  if (step === "code") {
    return (
      <CodeStep email={email.trim()} onBack={() => setStep("email")} />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className={`mb-5 text-center ${headingClasses}`}>შესვლა ან რეგისტრაცია</h1>

      {/* A plain link: the route redirects to Google, which a client-side navigation can't follow. */}
      <a
        href={returnTo ? `/auth/google?next=${encodeURIComponent(returnTo)}` : "/auth/google"}
        className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-3 whitespace-nowrap rounded-lg border border-line bg-bg px-6 text-base font-medium text-ink transition-colors hover:bg-surface"
      >
        <GoogleIcon />
        Google-ით გაგრძელება
      </a>
      {/* Links to /auth/facebook once that exists. */}
      <Button variant="outline" size="lg" className="w-full gap-3">
        <FacebookIcon />
        Facebook-ით გაგრძელება
      </Button>
      {googleError && (
        <p role="alert" className="text-center text-sm text-error">
          {googleError}
        </p>
      )}

      <div className="my-3 flex items-center gap-4 text-sm text-muted">
        <span className="h-px flex-1 bg-line" />
        ან
        <span className="h-px flex-1 bg-line" />
      </div>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            ელფოსტა
          </label>
          <TextInput
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            invalid={Boolean(error)}
            aria-describedby={error ? "email-error" : undefined}
          />
          {error && (
            <p id="email-error" className="text-sm text-error">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full">
          კოდის გაგზავნა
        </Button>
      </form>

      <p className="mt-6 text-center text-sm leading-relaxed text-muted">
        გაგრძელებით ეთანხმები{" "}
        <Link href="/terms" className="text-ink underline underline-offset-2">
          წესებსა
        </Link>{" "}
        და{" "}
        <Link href="/privacy" className="text-ink underline underline-offset-2">
          კონფიდენციალურობის პოლიტიკას
        </Link>
        .
      </p>
    </div>
  );
}

function CodeStep({ email, onBack }: { email: string; onBack: () => void }) {
  const [digits, setDigits] = useState(emptyCode);
  // What the check returned: a wrong code, or a blocked address.
  const [error, setError] = useState("");
  const invalid = Boolean(error);
  const [pending, startTransition] = useTransition();
  const returnTo = useSearchParams().get("next");
  const [sends, setSends] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(resendCooldown);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  function focusBox(index: number) {
    boxes.current[Math.max(0, Math.min(index, codeLength - 1))]?.focus();
  }

  // Writes digits starting at `index`, then checks the code once every box is filled.
  function fill(index: number, input: string) {
    const next = [...digits];
    const typed = input.replace(/\D/g, "").slice(0, codeLength - index).split("");
    typed.forEach((digit, offset) => {
      next[index + offset] = digit;
    });
    setDigits(next);
    setError("");
    focusBox(index + typed.length);

    if (next.every(Boolean)) {
      // On success the action redirects, so only a failure comes back.
      startTransition(async () => {
        const result = await verifyCode(email, next.join(""), returnTo);
        if (result?.error) setError(result.error);
      });
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      setError("");
      focusBox(index - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  }

  // The boxes lose focus while disabled, so hand it back after a wrong code.
  useEffect(() => {
    if (invalid && !pending) boxes.current[codeLength - 1]?.focus();
  }, [invalid, pending]);

  // Counts against a deadline so a backgrounded phone tab doesn't slow the timer.
  useEffect(() => {
    const resendAt = Date.now() + resendCooldown * 1000;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [sends]);

  function resend() {
    // Resending comes with the backend.
    setDigits(emptyCode);
    setError("");
    setSends((count) => count + 1);
    setSecondsLeft(resendCooldown);
    focusBox(0);
  }

  return (
    <div className="animate-rise flex flex-col items-center text-center">
      <span className="mb-6 grid size-16 place-items-center rounded-full bg-surface">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-7"
        >
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      </span>

      <h1 className={`text-center ${headingClasses}`}>შეამოწმე ელფოსტა</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        კოდი გამოგიგზავნეთ მისამართზე
        <span className="block font-medium break-all text-ink">{email}</span>
      </p>

      <div
        role="group"
        aria-label="კოდი"
        className="mt-8 flex w-full items-center gap-2 sm:gap-2.5"
      >
        {digits.map((digit, index) => (
          <div key={index} className="contents">
            {index === codeLength / 2 && (
              <span aria-hidden="true" className="h-0.5 w-3 shrink-0 rounded-full bg-line" />
            )}
            <input
              ref={(element) => {
                boxes.current[index] = element;
              }}
              autoFocus={index === 0}
              disabled={pending}
              autoComplete={index === 0 ? "one-time-code" : "off"}
              inputMode="numeric"
              aria-label={`${index + 1}-ე ციფრი`}
              aria-invalid={invalid ? true : undefined}
              value={digit}
              placeholder="0"
              onFocus={(event) => event.target.select()}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, "");
                if (!event.target.value) {
                  const next = [...digits];
                  next[index] = "";
                  setDigits(next);
                  setError("");
                  return;
                }
                // One keystroke into a filled box keeps the new digit; longer input is autofill.
                fill(index, value.length <= 2 ? value.slice(-1) : value);
              }}
              onPaste={(event) => {
                event.preventDefault();
                fill(index, event.clipboardData.getData("text"));
              }}
              onKeyDown={(event) => handleKeyDown(index, event)}
              className={`h-14 w-full min-w-0 flex-1 rounded-xl border text-center text-xl font-medium outline-none transition-colors placeholder:text-[color:light-dark(#c4c4c2,var(--color-fainter))] focus:bg-bg disabled:opacity-60 ${
                invalid
                  ? "border-error bg-bg"
                  : "border-transparent bg-surface focus:border-ink"
              }`}
            />
          </div>
        ))}
      </div>

      <p aria-live="polite" className="mt-3 min-h-5 text-sm text-error">
        {error}
      </p>

      <p className="mt-5 text-sm text-muted">
        {secondsLeft > 0 ? (
          `კოდის თავიდან გაგზავნა შეგეძლება ${secondsLeft} წამში.`
        ) : (
          <>
            კოდი არ მოგივიდა?{" "}
            <button
              type="button"
              onClick={resend}
              className="cursor-pointer font-medium text-ink hover:underline"
            >
              თავიდან გაგზავნა
            </button>
          </>
        )}
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-3 cursor-pointer text-sm font-medium text-ink hover:underline"
      >
        ელფოსტის შეცვლა
      </button>
    </div>
  );
}
