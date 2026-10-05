"use client";

import { useState, useTransition, type ReactNode } from "react";
import { createCategory, deleteCategory, moveCategory, updateCategory } from "@/app/admin/categories/actions";
import {
  categoryLabelPattern,
  categorySlugPattern,
  maxCategoryEmojiLength,
  maxCategoryLabelLength,
} from "@/lib/category-rules";
import { minTopics } from "@/lib/onboarding-options";
import { Button } from "../button";
import { Dialog } from "../dialog";
import { EditForm } from "../edit-form";
import { TextInput } from "../text-input";
import { Table, rowClass, tdClass, thClass } from "./ui";

type Category = { slug: string; label: string; emoji: string; readers: number; posts: number };

const labelClass = "mb-1.5 block text-sm font-medium";

// The order here is the order readers see in onboarding and settings.
export function CategoryManager({ categories }: { categories: Category[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [pending, startTransition] = useTransition();
  const canDelete = categories.length > minTopics;

  function move(slug: string, direction: "up" | "down") {
    startTransition(async () => {
      await moveCategory(slug, direction);
    });
  }

  return (
    <>
      <div className="-mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-muted">ამ თანმიმდევრობით ჩანს რეგისტრაციასა და პარამეტრებში.</p>
        <Button onClick={() => setAdding(true)}>დამატება</Button>
      </div>

      <Table fit>
        <thead>
          <tr>
            <th className={`${thClass} w-0`}>რიგი</th>
            <th className={thClass}>კატეგორია</th>
            <th className={`${thClass} hidden sm:table-cell`}>slug</th>
            <th className={`${thClass} hidden text-right sm:table-cell`}>მკითხველი</th>
            <th className={`${thClass} hidden text-right sm:table-cell`}>ბლოგი</th>
            <th className={thClass} />
          </tr>
        </thead>
        <tbody className={pending ? "opacity-60 transition-opacity" : undefined}>
          {categories.map((category, index) => (
            <tr key={category.slug} className={rowClass}>
              <td className={tdClass}>
                <div className="flex flex-col gap-1 sm:flex-row">
                  <IconButton label="ზემოთ" disabled={index === 0 || pending} onClick={() => move(category.slug, "up")}>
                    <path d="m18 15-6-6-6 6" />
                  </IconButton>
                  <IconButton
                    label="ქვემოთ"
                    disabled={index === categories.length - 1 || pending}
                    onClick={() => move(category.slug, "down")}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </IconButton>
                </div>
              </td>
              <td className={tdClass}>
                <span className="flex items-center gap-2 font-medium">
                  <span aria-hidden="true">{category.emoji}</span>
                  {category.label}
                </span>
                <span className="mt-0.5 block text-sm text-muted tabular-nums sm:hidden">
                  {category.readers} მკითხველი · {category.posts} ბლოგი
                </span>
              </td>
              <td className={`${tdClass} hidden font-mono text-sm text-muted sm:table-cell`}>{category.slug}</td>
              <td className={`${tdClass} hidden text-right tabular-nums sm:table-cell`}>{category.readers}</td>
              <td className={`${tdClass} hidden text-right tabular-nums sm:table-cell`}>{category.posts}</td>
              <td className={tdClass}>
                <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:justify-end">
                  <Button variant="outline" size="sm" onClick={() => setEditing(category)}>
                    შეცვლა
                  </Button>
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleting(category)}
                      className="text-danger hover:bg-danger-soft"
                    >
                      წაშლა
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {adding && <CategoryDialog onClose={() => setAdding(false)} />}
      {editing && <CategoryDialog category={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <Dialog title="კატეგორიის წაშლა" art="delete" onClose={() => setDeleting(null)}>
          <EditForm
            canSave
            save={() => deleteCategory(deleting.slug)}
            onClose={() => setDeleting(null)}
            saveLabel="წაშლა"
            danger
          >
            <p className="text-muted">
              „{deleting.label}“ {deleting.readers} მკითხველის თემებიდან ამოიშლება. {deleting.posts} ბლოგს თეგად დარჩება
              „{deleting.label.toLowerCase()}“.
            </p>
          </EditForm>
        </Dialog>
      )}
    </>
  );
}

// Adds a category, or edits the label and emoji of `category`; its slug never changes.
function CategoryDialog({ category, onClose }: { category?: Category; onClose: () => void }) {
  const [emoji, setEmoji] = useState(category?.emoji ?? "");
  const [label, setLabel] = useState(category?.label ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const cleanLabel = label.trim().replace(/\s+/g, " ");
  const labelValid = cleanLabel.length > 0 && categoryLabelPattern.test(cleanLabel);
  const slugValid = categorySlugPattern.test(slug);
  const emojiValid = emoji.trim().length > 0 && !/\s/.test(emoji.trim());
  const changed = !category || cleanLabel !== category.label || emoji.trim() !== category.emoji;

  return (
    <Dialog title={category ? "კატეგორია" : "ახალი კატეგორია"} art="topics" onClose={onClose}>
      <EditForm
        canSave={labelValid && emojiValid && (!!category || slugValid) && changed}
        save={() =>
          category
            ? updateCategory(category.slug, { label: cleanLabel, emoji })
            : createCategory({ slug, label: cleanLabel, emoji })
        }
        onClose={onClose}
        saveLabel={category ? "შენახვა" : "დამატება"}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <label>
              <span className={labelClass}>ემოჯი</span>
              <TextInput
                maxLength={maxCategoryEmojiLength}
                value={emoji}
                onChange={(event) => setEmoji(event.target.value)}
                className="w-full text-center text-xl"
              />
            </label>
            <label>
              <span className={labelClass}>სახელი</span>
              <TextInput
                autoFocus
                maxLength={maxCategoryLabelLength}
                invalid={label.trim() !== "" && !labelValid}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                className="w-full"
              />
            </label>
          </div>
          {category ? (
            <p className="text-sm text-muted">
              slug: <span className="font-mono">{category.slug}</span> — მკითხველები და ბლოგები მას ინახავენ, ამიტომ არ
              იცვლება.
            </p>
          ) : (
            <label>
              <span className={labelClass}>slug</span>
              <TextInput
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={30}
                invalid={slug !== "" && !slugValid}
                value={slug}
                onChange={(event) => setSlug(event.target.value.toLowerCase())}
                className="w-full font-mono"
              />
              <span className="mt-1.5 block text-sm text-muted">
                ლათინური ასოები, ციფრები და -, მაგალითად photography. მერე აღარ შეიცვლება.
              </span>
            </label>
          )}
        </div>
      </EditForm>
    </Dialog>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 cursor-pointer place-items-center rounded-lg border border-line text-ink transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-30"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
