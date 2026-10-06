"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  checkHandle,
  deleteAccount,
  removeAvatar,
  updateAvatar,
  updateBio,
  updateEmail,
  updateFavoritesPublic,
  updateHandle,
  updateName,
  updateTheme,
  updateTopics,
} from "@/app/settings/actions";
import { maxNameLength, minTopics, type Option } from "@/lib/onboarding-options";
import {
  emailPattern,
  handleTakenError,
  isValidHandle,
  maxAvatarBytes,
  maxBioLength,
  maxHandleLength,
  normalizeEmail,
  normalizeHandle,
} from "@/lib/profile-rules";
import type { Theme } from "@/lib/theme-options";
import { avatarUrl } from "@/lib/user-view";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { Chip } from "./chip";
import { Dialog } from "./dialog";
import { EditForm, errorClass } from "./edit-form";
import { headingClasses } from "./heading";
import { TextInput } from "./text-input";

export type SettingsUser = {
  email: string;
  handle: string;
  name: string;
  bio: string | null;
  avatar: string | null;
  topics: string[];
  favoritesPublic: boolean;
};

type Field = "email" | "handle" | "name" | "avatar" | "bio" | "topics" | "favorites" | "theme" | "delete";

export function Settings({
  user,
  host,
  topics,
  theme,
}: {
  user: SettingsUser;
  host: string;
  topics: Option[];
  theme: Theme;
}) {
  const [editing, setEditing] = useState<Field | null>(null);
  const close = () => setEditing(null);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <h1 className={headingClasses}>პარამეტრები</h1>

      <div className="mt-8 flex flex-col">
        <Row label="ელფოსტა" onClick={() => setEditing("email")}>
          {user.email}
        </Row>
        <Row label="მომხმარებლის სახელი" onClick={() => setEditing("handle")}>
          @{user.handle}
        </Row>
        <Row label="სახელი" onClick={() => setEditing("name")}>
          {user.name}
        </Row>
        <Row label="ფოტო" onClick={() => setEditing("avatar")}>
          <Avatar src={avatarUrl(user.avatar)} className="ml-auto size-9" />
        </Row>
        <Row label="აღწერა" onClick={() => setEditing("bio")}>
          {user.bio ?? "დამატება"}
        </Row>
        <Row label="თემები" onClick={() => setEditing("topics")}>
          {topics
            .filter((topic) => user.topics.includes(topic.slug))
            .map((topic) => topic.label)
            .join(", ")}
        </Row>
        <Row label="რჩეულები" onClick={() => setEditing("favorites")}>
          {user.favoritesPublic ? "ყველა ხედავს" : "მხოლოდ მე"}
        </Row>
        <Row label="იერსახე" onClick={() => setEditing("theme")}>
          {themeOptions.find((option) => option.slug === theme)?.label}
        </Row>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <Row label="ანგარიშის წაშლა" danger onClick={() => setEditing("delete")} />
      </div>

      {editing === "email" && <EmailDialog current={user.email} onClose={close} />}
      {editing === "handle" && <HandleDialog current={user.handle} host={host} onClose={close} />}
      {editing === "name" && <NameDialog current={user.name} onClose={close} />}
      {editing === "avatar" && <AvatarDialog current={user.avatar} onClose={close} />}
      {editing === "bio" && <BioDialog current={user.bio ?? ""} onClose={close} />}
      {editing === "topics" && <TopicsDialog current={user.topics} topics={topics} onClose={close} />}
      {editing === "favorites" && <FavoritesDialog current={user.favoritesPublic} onClose={close} />}
      {editing === "theme" && <ThemeDialog current={theme} onClose={close} />}
      {editing === "delete" && <DeleteDialog onClose={close} />}
    </div>
  );
}

function Row({
  label,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mx-3 flex min-h-14 cursor-pointer items-center justify-between gap-6 rounded-lg px-3 py-3 text-left transition-colors ${
        danger ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-surface"
      }`}
    >
      <span className="shrink-0 font-medium">{label}</span>
      <span className="min-w-0 truncate text-right text-muted">{children}</span>
    </button>
  );
}

function EmailDialog({ current, onClose }: { current: string; onClose: () => void }) {
  const [value, setValue] = useState(current);
  const email = normalizeEmail(value);

  return (
    <Dialog title="ელფოსტა" art="email" onClose={onClose}>
      <EditForm
        canSave={emailPattern.test(email) && email !== current}
        save={() => updateEmail(email)}
        onClose={onClose}
        hint="ამ ელფოსტით შედიხარ dawere-ზე."
      >
        <TextInput
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-label="ელფოსტა"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full"
        />
      </EditForm>
    </Dialog>
  );
}

function HandleDialog({ current, host, onClose }: { current: string; host: string; onClose: () => void }) {
  const [value, setValue] = useState(current);
  // The last answer from the server, kept with the handle it was about.
  const [checked, setChecked] = useState<{ handle: string; available: boolean } | null>(null);
  const handle = normalizeHandle(value);
  const valid = isValidHandle(handle);
  const changed = handle !== current;

  useEffect(() => {
    if (!valid || !changed) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const available = await checkHandle(handle);
      if (!stale) setChecked({ handle, available });
    }, 400);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [handle, valid, changed]);

  const available = checked?.handle === handle ? checked.available : undefined;
  const taken = valid && changed && available === false;

  return (
    <Dialog title="მომხმარებლის სახელი" art="profile" onClose={onClose}>
      <EditForm
        canSave={valid && changed && available === true}
        save={() => updateHandle(handle)}
        onClose={onClose}
        hint={
          taken ? (
            <span className={errorClass}>{handleTakenError}</span>
          ) : valid ? (
            `${host}/@${handle}`
          ) : (
            "ლათინური ასოები, ციფრები და . _ - ~, 3-დან 30 სიმბოლომდე"
          )
        }
      >
        <div role="note" className="mb-4 flex gap-3 rounded-xl border border-warning/25 bg-warning-soft p-4 text-sm">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 size-5 shrink-0 text-warning"
          >
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <div className="min-w-0">
            <p className="font-semibold text-warning">ძველი ბმულები აღარ იმუშავებს</p>
            <p className="mt-1 text-ink/80">
              პროფილისა და ბლოგების მისამართები შეიცვლება, ამიტომ ძველი სახელით გაზიარებული ბმულები აღარ გაიხსნება.
            </p>
          </div>
        </div>
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">
            @
          </span>
          <TextInput
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label="მომხმარებლის სახელი"
            maxLength={maxHandleLength}
            invalid={taken}
            value={value}
            onChange={(event) => setValue(event.target.value.replace(/@/g, "").toLowerCase())}
            className="w-full pl-9"
          />
        </div>
      </EditForm>
    </Dialog>
  );
}

function NameDialog({ current, onClose }: { current: string; onClose: () => void }) {
  const [value, setValue] = useState(current);
  const name = value.trim();

  return (
    <Dialog title="სახელი" art="profile" onClose={onClose}>
      <EditForm
        canSave={name.length > 0 && name !== current}
        save={() => updateName(name)}
        onClose={onClose}
        counter={`${value.length}/${maxNameLength}`}
      >
        <TextInput
          autoComplete="name"
          aria-label="სახელი"
          maxLength={maxNameLength}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full"
        />
      </EditForm>
    </Dialog>
  );
}

function BioDialog({ current, onClose }: { current: string; onClose: () => void }) {
  const [value, setValue] = useState(current);
  const bio = value.trim();

  return (
    <Dialog title="აღწერა" art="write" onClose={onClose}>
      <EditForm
        canSave={bio !== current}
        save={() => updateBio(bio)}
        onClose={onClose}
        counter={`${value.length}/${maxBioLength}`}
      >
        <textarea
          aria-label="აღწერა"
          rows={4}
          maxLength={maxBioLength}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="block w-full resize-none rounded-lg border border-line bg-bg px-4 py-3 text-base outline-offset-0 transition-colors focus:border-ink"
        />
      </EditForm>
    </Dialog>
  );
}

function AvatarDialog({ current, onClose }: { current: string | null; onClose: () => void }) {
  // The chosen file with an object URL for previewing it.
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [tooBig, setTooBig] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!picked) return;
    return () => URL.revokeObjectURL(picked.url);
  }, [picked]);

  const shown = picked ? picked.url : removing ? undefined : avatarUrl(current);

  function save() {
    if (!picked) return removeAvatar();
    const data = new FormData();
    data.set("avatar", picked.file);
    return updateAvatar(data);
  }

  return (
    <Dialog title="ფოტო" art="photo" onClose={onClose}>
      <EditForm
        canSave={picked !== null || (removing && current !== null)}
        save={save}
        onClose={onClose}
        hint={tooBig ? <span className={errorClass}>ფოტო 5 მბ-ზე დიდი არ უნდა იყოს</span> : undefined}
      >
        <div className="flex flex-col items-center gap-5">
          <Avatar src={shown} className="size-28" />
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => input.current?.click()}>
              ფოტოს არჩევა
            </Button>
            {shown && (
              <Button
                variant="ghost"
                onClick={() => {
                  setPicked(null);
                  setRemoving(true);
                }}
                className="text-danger hover:bg-danger-soft"
              >
                ფოტოს წაშლა
              </Button>
            )}
          </div>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Clearing lets the same file be picked again after a removal.
              event.target.value = "";
              if (!file) return;
              setTooBig(file.size > maxAvatarBytes);
              if (file.size > maxAvatarBytes) return;
              setPicked({ file, url: URL.createObjectURL(file) });
              setRemoving(false);
            }}
          />
        </div>
      </EditForm>
    </Dialog>
  );
}

function TopicsDialog({ current, topics, onClose }: { current: string[]; topics: Option[]; onClose: () => void }) {
  const [chosen, setChosen] = useState(current);
  const changed = chosen.length !== current.length || chosen.some((slug) => !current.includes(slug));

  function toggle(slug: string) {
    setChosen((items) => (items.includes(slug) ? items.filter((item) => item !== slug) : [...items, slug]));
  }

  return (
    <Dialog title="თემები" art="topics" wide onClose={onClose}>
      <EditForm
        canSave={chosen.length >= minTopics && changed}
        save={() => updateTopics(chosen)}
        onClose={onClose}
      >
        <p className="mb-4 text-sm text-muted">
          აირჩიე მინიმუმ {minTopics}. ამ თემების ბლოგები მთავარ გვერდზე უფრო მაღლა გამოჩნდება.
        </p>
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
      </EditForm>
    </Dialog>
  );
}

const favoritesOptions = [
  { slug: "public", emoji: "🌍", label: "ყველა ხედავს" },
  { slug: "private", emoji: "🔒", label: "მხოლოდ მე" },
];

function FavoritesDialog({ current, onClose }: { current: boolean; onClose: () => void }) {
  const [isPublic, setIsPublic] = useState(current);

  return (
    <Dialog title="რჩეულები" art="favorites" onClose={onClose}>
      <EditForm canSave={isPublic !== current} save={() => updateFavoritesPublic(isPublic)} onClose={onClose}>
        <p className="mb-4 text-sm text-muted">აირჩიე, ვინ ნახავს რჩეულებს შენს პროფილზე.</p>
        <div role="radiogroup" aria-label="რჩეულები" className="flex flex-wrap gap-2">
          {favoritesOptions.map((option) => (
            <Chip
              key={option.slug}
              role="radio"
              option={option}
              selected={isPublic === (option.slug === "public")}
              onClick={() => setIsPublic(option.slug === "public")}
            />
          ))}
        </div>
      </EditForm>
    </Dialog>
  );
}

const themeOptions: { slug: Theme; emoji: string; label: string }[] = [
  { slug: "system", emoji: "💻", label: "სისტემური" },
  { slug: "light", emoji: "☀️", label: "ნათელი" },
  { slug: "dark", emoji: "🌙", label: "მუქი" },
];

function ThemeDialog({ current, onClose }: { current: Theme; onClose: () => void }) {
  const [theme, setTheme] = useState(current);

  return (
    <Dialog title="იერსახე" art="theme" onClose={onClose}>
      <EditForm canSave={theme !== current} save={() => updateTheme(theme)} onClose={onClose}>
        <p className="mb-4 text-sm text-muted">
          სისტემური იერსახე მოწყობილობის პარამეტრებს მიჰყვება.
        </p>
        <div role="radiogroup" aria-label="იერსახე" className="flex flex-wrap gap-2">
          {themeOptions.map((option) => (
            <Chip
              key={option.slug}
              role="radio"
              option={option}
              selected={theme === option.slug}
              onClick={() => setTheme(option.slug)}
            />
          ))}
        </div>
      </EditForm>
    </Dialog>
  );
}

function DeleteDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="ანგარიშის წაშლა" art="delete" onClose={onClose}>
      <EditForm canSave save={() => deleteAccount()} onClose={onClose} saveLabel="წაშლა" danger>
        <p className="text-muted">
          პროფილი, ბლოგები და ფოტო სამუდამოდ წაიშლება და მათ ვეღარ აღადგენ.
        </p>
      </EditForm>
    </Dialog>
  );
}
