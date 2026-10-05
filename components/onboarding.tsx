"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { logout } from "@/app/auth/actions";
import { completeOnboarding } from "@/app/onboarding/actions";
import {
  maxNameLength,
  maxReferralOtherLength,
  minTopics,
  referrals,
  type Option,
} from "@/lib/onboarding-options";
import { Button } from "./button";
import { Chip } from "./chip";
import { headingClasses } from "./heading";
import { TextInput } from "./text-input";

const steps = ["name", "topics", "referral"] as const;

export function Onboarding({ topics }: { topics: Option[] }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [chosenTopics, setChosenTopics] = useState<string[]>([]);
  const [referral, setReferral] = useState("");
  const [referralOther, setReferralOther] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  // The page the person was reading before signing in, to return to at the end.
  const returnTo = useSearchParams().get("next");

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const valid = {
    name: name.trim().length > 0,
    topics: chosenTopics.length >= minTopics,
    referral: referral !== "" && (referral !== "other" || referralOther.trim().length > 0),
  }[current];

  function toggleTopic(slug: string) {
    setChosenTopics((chosen) =>
      chosen.includes(slug) ? chosen.filter((item) => item !== slug) : [...chosen, slug],
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || pending) return;
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    setError("");
    // On success the action redirects, so only a failure comes back.
    startTransition(async () => {
      const result = await completeOnboarding(
        {
          name,
          topics: chosenTopics,
          referral,
          referralOther,
        },
        returnTo,
      );
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="უკან"
          disabled={pending}
          // On the first step, going back signs out and returns to the sign-in page.
          onClick={() => (step === 0 ? startTransition(() => logout(returnTo)) : setStep(step - 1))}
          className="-ml-2 grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-ink transition-colors hover:bg-surface disabled:opacity-40"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
          >
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </button>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={step + 1}
          aria-label="ნაბიჯი"
          className="flex flex-1 gap-1.5"
        >
          {steps.map((item, index) => (
            <span
              key={item}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                index <= step ? "bg-ink" : "bg-line"
              }`}
            />
          ))}
        </div>
      </div>

      <div key={current} className="animate-rise mt-8">
        {current === "name" && (
          <>
            <h1 id="onboarding-heading" className={headingClasses}>
              რა გქვია?
            </h1>
            <TextInput
              autoFocus
              aria-labelledby="onboarding-heading"
              autoComplete="name"
              placeholder="სახელი"
              maxLength={maxNameLength}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-6 w-full"
            />
          </>
        )}

        {current === "topics" && (
          <>
            <h1 id="onboarding-heading" className={headingClasses}>
              რა თემები გაინტერესებს?
            </h1>
            <p className="mt-2 text-[15px] text-muted">აირჩიე მინიმუმ {minTopics}</p>
            <div role="group" aria-labelledby="onboarding-heading" className="mt-6 flex flex-wrap gap-2">
              {topics.map((topic) => (
                <Chip
                  key={topic.slug}
                  option={topic}
                  selected={chosenTopics.includes(topic.slug)}
                  onClick={() => toggleTopic(topic.slug)}
                />
              ))}
            </div>
          </>
        )}

        {current === "referral" && (
          <>
            <h1 id="onboarding-heading" className={headingClasses}>
              საიდან გაიგე dawere-ის შესახებ?
            </h1>
            <div role="radiogroup" aria-labelledby="onboarding-heading" className="mt-6 flex flex-wrap gap-2">
              {referrals.map((option) => (
                <Chip
                  key={option.slug}
                  role="radio"
                  option={option}
                  selected={referral === option.slug}
                  onClick={() => setReferral(option.slug)}
                />
              ))}
            </div>
            {referral === "other" && (
              <TextInput
                autoFocus
                aria-label="საიდან გაიგე"
                placeholder="დაწერე, საიდან გაიგე"
                maxLength={maxReferralOtherLength}
                value={referralOther}
                onChange={(event) => setReferralOther(event.target.value)}
                className="animate-rise mt-4 w-full"
              />
            )}
          </>
        )}
      </div>

      {/* Pinned to the bottom on phones, right under the step on larger screens. */}
      <div className="sticky bottom-0 mt-auto bg-bg pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:mt-8 sm:bg-transparent sm:pt-0">
        <Button type="submit" size="lg" disabled={!valid || pending} className="w-full">
          {isLast ? "დასრულება" : "გაგრძელება"}
        </Button>
        {error && (
          <p aria-live="polite" className="mt-3 text-center text-sm text-error">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
