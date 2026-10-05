"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { checkNewUser, createUser } from "@/app/admin/users/actions";
import type { Role } from "@/lib/db/schema";
import { maxNameLength, minTopics, type Option } from "@/lib/onboarding-options";
import { emailPattern, isValidHandle, maxHandleLength, normalizeEmail, normalizeHandle } from "@/lib/profile-rules";
import { roleLabels } from "@/lib/roles";
import { Button } from "../button";
import { Chip } from "../chip";
import { Dialog } from "../dialog";
import { errorClass } from "../edit-form";
import { TextInput } from "../text-input";

const labelClass = "mb-1.5 block text-sm font-medium";

export function CreateUserButton({ canCreateAdmin, topics }: { canCreateAdmin: boolean; topics: Option[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>დამატება</Button>
      {open && <CreateUserDialog canCreateAdmin={canCreateAdmin} topics={topics} onClose={() => setOpen(false)} />}
    </>
  );
}

// Two steps, like onboarding: who it is, then their topics. The account is ready to use at once.
function CreateUserDialog({
  canCreateAdmin,
  topics,
  onClose,
}: {
  canCreateAdmin: boolean;
  topics: Option[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"account" | "topics">("account");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const normalizedHandle = normalizeHandle(handle);
  const valid =
    step === "account"
      ? emailPattern.test(normalizeEmail(email)) &&
        name.trim().length > 0 &&
        (!normalizedHandle || isValidHandle(normalizedHandle))
      : chosen.length >= minTopics;

  function toggle(slug: string) {
    setChosen((items) => (items.includes(slug) ? items.filter((item) => item !== slug) : [...items, slug]));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || pending) return;
    setError("");
    startTransition(async () => {
      if (step === "account") {
        const result = await checkNewUser(email, handle);
        if (result?.error) setError(result.error);
        else setStep("topics");
        return;
      }
      const result = await createUser({ email, name, handle, topics: chosen, role });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/admin/users/${result.id}`);
      onClose();
    });
  }

  return (
    <Dialog title="ახალი მომხმარებელი" art="profile" wide onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} onChange={() => setError("")} className="flex min-h-0 flex-1 flex-col">
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={2}
          aria-valuenow={step === "account" ? 1 : 2}
          aria-label="ნაბიჯი"
          className="mb-5 flex gap-1.5"
        >
          <span className="h-1.5 flex-1 rounded-full bg-ink" />
          <span
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step === "topics" ? "bg-ink" : "bg-line"}`}
          />
        </div>

        <div className="-m-1 min-h-0 overflow-y-auto p-1">
          {step === "account" ? (
            <div key="account" className="animate-rise flex flex-col gap-4">
              <label>
                <span className={labelClass}>ელფოსტა</span>
                <TextInput
                  autoFocus
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full"
                />
              </label>
              <label>
                <span className={labelClass}>სახელი</span>
                <TextInput
                  maxLength={maxNameLength}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full"
                />
              </label>
              <label>
                <span className={labelClass}>
                  მომხმარებლის სახელი <span className="font-normal text-muted">(არასავალდებულო)</span>
                </span>
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted"
                  >
                    @
                  </span>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={maxHandleLength}
                    invalid={!!normalizedHandle && !isValidHandle(normalizedHandle)}
                    value={handle}
                    onChange={(event) => setHandle(event.target.value.replace(/@/g, "").toLowerCase())}
                    className="w-full pl-9"
                  />
                </div>
                <span className="mt-1.5 block text-sm text-muted">
                  {normalizedHandle && !isValidHandle(normalizedHandle)
                    ? "ლათინური ასოები, ციფრები და . _ - ~, 3-დან 30 სიმბოლომდე"
                    : "ცარიელს თუ დატოვებ, შემთხვევითი შეიქმნება."}
                </span>
              </label>
              {canCreateAdmin && (
                <div>
                  <span className={labelClass}>როლი</span>
                  <div role="radiogroup" aria-label="როლი" className="flex flex-wrap gap-2">
                    {(["user", "admin"] as const).map((value) => (
                      <Chip
                        key={value}
                        role="radio"
                        option={{ slug: value, emoji: value === "admin" ? "🛡️" : "👤", label: roleLabels[value] }}
                        selected={role === value}
                        onClick={() => setRole(value)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div key="topics" className="animate-rise">
              <p className="mb-4 text-[15px] text-muted">რა თემები აინტერესებს? აირჩიე მინიმუმ {minTopics}.</p>
              <div role="group" aria-label="თემები" className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <Chip
                    key={topic.slug}
                    option={topic}
                    selected={chosen.includes(topic.slug)}
                    onClick={() => toggle(topic.slug)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p aria-live="polite" className={`mt-3 text-sm ${errorClass}`}>
            {error}
          </p>
        )}
        <div className="mt-6 flex shrink-0 justify-between gap-2">
          {step === "account" ? (
            <Button variant="outline" onClick={onClose}>
              გაუქმება
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStep("account")}>
              უკან
            </Button>
          )}
          <Button type="submit" disabled={!valid || pending}>
            {step === "account" ? "გაგრძელება" : "დამატება"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
