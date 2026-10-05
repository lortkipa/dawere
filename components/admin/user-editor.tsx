"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  checkUserHandle,
  deleteUser,
  removeUserAvatar,
  setUserRole,
  signOutUser,
  updateUserBio,
  updateUserEmail,
  updateUserFavoritesPublic,
  updateUserHandle,
  updateUserAvatar,
  updateUserName,
  updateUserTopics,
} from "@/app/admin/users/actions";
import type { Role } from "@/lib/db/schema";
import { maxNameLength, minTopics, topics } from "@/lib/onboarding-options";
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
import { roleLabels } from "@/lib/roles";
import { avatarUrl } from "@/lib/user-view";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { Chip } from "../chip";
import { Dialog } from "../dialog";
import { EditForm, errorClass } from "../edit-form";
import { TextInput } from "../text-input";

type EditedUser = {
  id: string;
  email: string;
  handle: string;
  name: string;
  bio: string | null;
  avatar: string | null;
  favoritesPublic: boolean;
  role: Role;
  topics: string[];
};

type Field = "email" | "handle" | "name" | "bio" | "avatar" | "favorites" | "role" | "topics";

const topicLabels = (slugs: string[]) =>
  topics
    .filter((topic) => slugs.includes(topic.slug))
    .map((topic) => `${topic.emoji} ${topic.label}`)
    .join(", ");

// The same dialogs as the reader's own settings, acting on someone else, grouped in cards.
export function UserEditor({
  user,
  editable,
  emailLocked,
  canSetRole,
}: {
  user: EditedUser;
  editable: boolean;
  emailLocked: boolean;
  canSetRole: boolean;
}) {
  const [editing, setEditing] = useState<Field | null>(null);
  const close = () => setEditing(null);
  const edit = (field: Field) => (editable ? () => setEditing(field) : undefined);

  return (
    <div className="flex flex-col gap-6">
      <Card title="პროფილი">
        <Row label="ფოტო" onEdit={edit("avatar")}>
          <Avatar src={avatarUrl(user.avatar)} className="size-10" />
        </Row>
        <Row label="სახელი" onEdit={edit("name")}>
          {user.name || "—"}
        </Row>
        <Row label="მომხმარებლის სახელი" onEdit={edit("handle")}>
          @{user.handle}
        </Row>
        <Row
          label="ელფოსტა"
          onEdit={emailLocked ? undefined : edit("email")}
          note={emailLocked && editable ? "სუპერადმინის ელფოსტა .env-შია" : undefined}
        >
          {user.email}
        </Row>
        <Row label="აღწერა" onEdit={edit("bio")}>
          {user.bio || "—"}
        </Row>
      </Card>

      <Card title="ალგორითმი">
        <Row label="თემები" onEdit={edit("topics")} wrap>
          {topicLabels(user.topics) || "—"}
        </Row>
      </Card>

      <Card title="პარამეტრები">
        <Row label="რჩეულები" onEdit={edit("favorites")}>
          {user.favoritesPublic ? "ყველა ხედავს" : "მხოლოდ ის"}
        </Row>
        <Row label="როლი" onEdit={canSetRole ? () => setEditing("role") : undefined}>
          {roleLabels[user.role]}
        </Row>
      </Card>

      {editing === "email" && <EmailDialog user={user} onClose={close} />}
      {editing === "handle" && <HandleDialog user={user} onClose={close} />}
      {editing === "name" && <NameDialog user={user} onClose={close} />}
      {editing === "bio" && <BioDialog user={user} onClose={close} />}
      {editing === "avatar" && <AvatarDialog user={user} onClose={close} />}
      {editing === "favorites" && <FavoritesDialog user={user} onClose={close} />}
      {editing === "role" && <RoleDialog user={user} onClose={close} />}
      {editing === "topics" && <TopicsDialog user={user} onClose={close} />}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line">
      <h2 className="border-b border-line px-5 py-3 font-semibold">{title}</h2>
      <div className="flex flex-col divide-y divide-line px-5">{children}</div>
    </section>
  );
}

// A label, the value and, when it can be changed, a „შეცვლა“ button.
function Row({
  label,
  onEdit,
  note,
  wrap = false,
  children,
}: {
  label: string;
  onEdit?: () => void;
  note?: string;
  wrap?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-16 flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-6">
      <span className="shrink-0 text-sm font-medium text-muted sm:w-44">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <div className="min-w-0">
          <div className={wrap ? "break-words" : "truncate"}>{children}</div>
          {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
        </div>
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0">
            შეცვლა
          </Button>
        )}
      </div>
    </div>
  );
}

type DialogProps = { user: EditedUser; onClose: () => void };

function EmailDialog({ user, onClose }: DialogProps) {
  const [value, setValue] = useState(user.email);
  const email = normalizeEmail(value);

  return (
    <Dialog title="ელფოსტა" onClose={onClose}>
      <EditForm
        canSave={emailPattern.test(email) && email !== user.email}
        save={() => updateUserEmail(user.id, email)}
        onClose={onClose}
      >
        <TextInput
          type="email"
          inputMode="email"
          aria-label="ელფოსტა"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full"
        />
      </EditForm>
    </Dialog>
  );
}

function HandleDialog({ user, onClose }: DialogProps) {
  const [value, setValue] = useState(user.handle);
  const [checked, setChecked] = useState<{ handle: string; available: boolean } | null>(null);
  const handle = normalizeHandle(value);
  const valid = isValidHandle(handle);
  const changed = handle !== user.handle;

  useEffect(() => {
    if (!valid || !changed) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const available = await checkUserHandle(user.id, handle);
      if (!stale) setChecked({ handle, available });
    }, 400);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [user.id, handle, valid, changed]);

  const available = checked?.handle === handle ? checked.available : undefined;
  const taken = valid && changed && available === false;

  return (
    <Dialog title="მომხმარებლის სახელი" onClose={onClose}>
      <EditForm
        canSave={valid && changed && available === true}
        save={() => updateUserHandle(user.id, handle)}
        onClose={onClose}
        hint={
          taken ? (
            <span className={errorClass}>{handleTakenError}</span>
          ) : valid ? (
            `/@${handle}`
          ) : (
            "ლათინური ასოები, ციფრები და . _ - ~, 3-დან 30 სიმბოლომდე"
          )
        }
      >
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

function NameDialog({ user, onClose }: DialogProps) {
  const [value, setValue] = useState(user.name);
  const name = value.trim();

  return (
    <Dialog title="სახელი" onClose={onClose}>
      <EditForm
        canSave={name.length > 0 && name !== user.name}
        save={() => updateUserName(user.id, name)}
        onClose={onClose}
        counter={`${value.length}/${maxNameLength}`}
      >
        <TextInput
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

function BioDialog({ user, onClose }: DialogProps) {
  const [value, setValue] = useState(user.bio ?? "");
  const bio = value.trim();

  return (
    <Dialog title="აღწერა" onClose={onClose}>
      <EditForm
        canSave={bio !== (user.bio ?? "")}
        save={() => updateUserBio(user.id, bio)}
        onClose={onClose}
        counter={`${value.length}/${maxBioLength}`}
      >
        <textarea
          aria-label="აღწერა"
          rows={4}
          maxLength={maxBioLength}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="block w-full resize-none rounded-lg border border-line bg-white px-4 py-3 text-base outline-offset-0 transition-colors focus:border-ink"
        />
      </EditForm>
    </Dialog>
  );
}

function AvatarDialog({ user, onClose }: DialogProps) {
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [tooBig, setTooBig] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!picked) return;
    return () => URL.revokeObjectURL(picked.url);
  }, [picked]);

  const shown = picked ? picked.url : removing ? undefined : avatarUrl(user.avatar);

  function save() {
    if (!picked) return removeUserAvatar(user.id);
    const data = new FormData();
    data.set("avatar", picked.file);
    return updateUserAvatar(user.id, data);
  }

  return (
    <Dialog title="ფოტო" onClose={onClose}>
      <EditForm
        canSave={picked !== null || (removing && user.avatar !== null)}
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
                className="text-red-600 hover:bg-red-50"
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

function TopicsDialog({ user, onClose }: DialogProps) {
  const [chosen, setChosen] = useState(user.topics);
  const changed = chosen.length !== user.topics.length || chosen.some((slug) => !user.topics.includes(slug));

  function toggle(slug: string) {
    setChosen((items) => (items.includes(slug) ? items.filter((item) => item !== slug) : [...items, slug]));
  }

  return (
    <Dialog title="თემები" wide onClose={onClose}>
      <EditForm
        canSave={chosen.length >= minTopics && changed}
        save={() => updateUserTopics(user.id, chosen)}
        onClose={onClose}
      >
        <p className="mb-4 text-center text-sm text-muted">
          აირჩიე მინიმუმ {minTopics}. ამ თემების ბლოგები მის მთავარ გვერდზე უფრო მაღლა გამოჩნდება.
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
  { slug: "private", emoji: "🔒", label: "მხოლოდ ის" },
];

function FavoritesDialog({ user, onClose }: DialogProps) {
  const [isPublic, setIsPublic] = useState(user.favoritesPublic);

  return (
    <Dialog title="რჩეულები" onClose={onClose}>
      <EditForm
        canSave={isPublic !== user.favoritesPublic}
        save={() => updateUserFavoritesPublic(user.id, isPublic)}
        onClose={onClose}
      >
        <div role="radiogroup" aria-label="რჩეულები" className="flex flex-wrap justify-center gap-2">
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

function RoleDialog({ user, onClose }: DialogProps) {
  const [role, setRole] = useState<Role>(user.role);

  return (
    <Dialog title="როლი" onClose={onClose}>
      <EditForm canSave={role !== user.role} save={() => setUserRole(user.id, role)} onClose={onClose}>
        <p className="mb-4 text-center text-sm text-muted">ადმინი ხედავს ადმინის გვერდს და მართავს მომხმარებლებს.</p>
        <div role="radiogroup" aria-label="როლი" className="flex flex-wrap justify-center gap-2">
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
      </EditForm>
    </Dialog>
  );
}

export function UserActions({
  id,
  handle,
  onboarded,
  sessions,
  canSignOut,
  canDelete,
  posts,
  comments,
}: {
  id: string;
  handle: string;
  onboarded: boolean;
  sessions: number;
  canSignOut: boolean;
  canDelete: boolean;
  posts: number;
  comments: number;
}) {
  const [confirming, setConfirming] = useState<"signout" | "delete" | null>(null);
  const close = () => setConfirming(null);

  return (
    <div className="flex flex-wrap gap-2">
      {onboarded && (
        <Button variant="outline" href={`/@${handle}`}>
          პროფილი საიტზე
        </Button>
      )}
      {canSignOut && sessions > 0 && (
        <Button variant="outline" onClick={() => setConfirming("signout")}>
          ყველგან გასვლა
        </Button>
      )}
      {canDelete && (
        <Button variant="outline" onClick={() => setConfirming("delete")} className="text-red-600 hover:bg-red-50">
          წაშლა
        </Button>
      )}

      {confirming === "signout" && (
        <Dialog title="ყველგან გასვლა" onClose={close}>
          <EditForm canSave save={() => signOutUser(id)} onClose={close} saveLabel="გასვლა" danger>
            <p className="text-center text-muted">
              მომხმარებელი ყველა მოწყობილობაზე გავა ანგარიშიდან ({sessions} სესია).
            </p>
          </EditForm>
        </Dialog>
      )}
      {confirming === "delete" && (
        <Dialog title="მომხმარებლის წაშლა" onClose={close}>
          <EditForm canSave save={() => deleteUser(id)} onClose={close} saveLabel="წაშლა" danger>
            <p className="text-center text-muted">
              ანგარიში, {posts} ბლოგი და {comments} კომენტარი სამუდამოდ წაიშლება.
            </p>
          </EditForm>
        </Dialog>
      )}
    </div>
  );
}
