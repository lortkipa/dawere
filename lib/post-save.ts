import "server-only";
import { randomBytes } from "node:crypto";
import { getSchema, type JSONContent } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { posts, type Post } from "./db/schema";
import {
  isSafeHref,
  maxBodyLength,
  maxDescriptionLength,
  maxImages,
  maxTitleLength,
  maxUploadBytes,
} from "./post-rules";
import { postExtensions } from "./post-schema";
import { getCategories } from "./categories";
import type { Option } from "./onboarding-options";
import { maxTags, normalizeTag } from "./tags";
import { deleteImages, saveImage } from "./uploads";
import { imageUrl } from "./user-view";

export const genericError = "რაღაც შეცდომაა, სცადე თავიდან";
const unreadableError = "ერთ-ერთ ფოტოს ვერ ვკითხულობთ, სცადე სხვა";

const schema = getSchema(postExtensions);
// The editor sends new photos as files and points their nodes at `upload:<n>`.
const uploadSrc = /^upload:(\d{1,3})$/;
// A photo the post being edited already has.
const savedSrc = /^\/images\/([0-9a-f]{32}\.webp)$/;

function walk(node: JSONContent, visit: (node: JSONContent) => void) {
  visit(node);
  node.content?.forEach((child) => walk(child, visit));
}

// The editor sends the tags as a JSON array of what the author picked or typed.
function parseTags(value: FormDataEntryValue | null, categories: Option[]) {
  let list: unknown;
  try {
    list = JSON.parse(String(value));
  } catch {
    return null;
  }
  if (!Array.isArray(list) || !list.every((item) => typeof item === "string")) return null;
  const tags = list.map((item) => normalizeTag(item, categories));
  if (tags.some((tag) => tag === null)) return null;
  const unique = [...new Set(tags as string[])];
  return unique.length <= maxTags ? unique : null;
}

function uploadedFile(formData: FormData, key: string) {
  const file = formData.get(key);
  return file instanceof File && file.size > 0 && file.size <= maxUploadBytes ? file : null;
}

// Publishes a new post by `authorId`, or replaces the content of `existing`. When editing, photos
// the post already had can stay (by their /images/ src, and the cover with `keepCover`); the ones
// left out are deleted from disk once the row is saved.
export async function savePost(
  formData: FormData,
  { authorId, existing }: { authorId: string; existing?: Post },
): Promise<{ error: string } | { id: string }> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title || title.length > maxTitleLength) return { error: genericError };
  if (!description || description.length > maxDescriptionLength) return { error: genericError };
  const tags = parseTags(formData.get("tags"), await getCategories());
  if (!tags) return { error: genericError };

  // fromJSON throws on node types, marks or nesting the schema doesn't allow and drops
  // attributes it doesn't know.
  let doc: Node;
  try {
    doc = Node.fromJSON(schema, JSON.parse(String(formData.get("body"))));
    doc.check();
  } catch {
    return { error: genericError };
  }

  const text = doc.textContent.trim();
  if (!text) return { error: genericError };
  if (text.length > maxBodyLength) return { error: "ტექსტი ზედმეტად გრძელია" };

  const owned = new Set(existing?.images ?? []);
  const body = doc.toJSON() as JSONContent;
  const uploads = new Set<string>();
  const kept = new Set<string>();
  let valid = true;
  walk(body, (node) => {
    if (node.type === "heading" && ![1, 2, 3].includes(node.attrs?.level)) valid = false;
    if (node.type === "image") {
      const src = node.attrs?.src ?? "";
      const upload = uploadSrc.exec(src);
      const saved = savedSrc.exec(src);
      if (upload) uploads.add(upload[1]);
      else if (saved && owned.has(saved[1])) kept.add(saved[1]);
      else valid = false;
    }
    for (const mark of node.marks ?? []) {
      if (mark.type === "link" && !isSafeHref(mark.attrs?.href)) valid = false;
    }
  });
  if (!valid) return { error: genericError };

  const keepCover = Boolean(existing?.cover && formData.get("keepCover") === "1");
  const hasCover = formData.has("cover");
  const coverFile = hasCover ? uploadedFile(formData, "cover") : null;
  if (hasCover && !coverFile) return { error: unreadableError };
  const coverCount = coverFile || keepCover ? 1 : 0;
  if (uploads.size + kept.size + coverCount > maxImages) {
    return { error: `ბლოგში ${maxImages}-ზე მეტი ფოტო არ უნდა იყოს` };
  }

  const files = new Map<string, File>();
  for (const n of uploads) {
    const file = uploadedFile(formData, `image-${n}`);
    if (!file) return { error: unreadableError };
    files.set(n, file);
  }

  // sharp throws on anything that isn't an image; whatever was already saved goes.
  const saved: string[] = [];
  const names = new Map<string, string>();
  let cover: string | null = keepCover ? existing!.cover : null;
  try {
    if (coverFile) {
      cover = await saveImage(Buffer.from(await coverFile.arrayBuffer()));
      saved.push(cover);
    }
    for (const [n, file] of files) {
      const name = await saveImage(Buffer.from(await file.arrayBuffer()));
      saved.push(name);
      names.set(n, name);
    }
  } catch {
    await deleteImages(saved);
    return { error: unreadableError };
  }

  walk(body, (node) => {
    const upload = node.type === "image" ? uploadSrc.exec(node.attrs!.src) : null;
    if (upload) node.attrs = { ...node.attrs, src: imageUrl(names.get(upload[1])!) };
  });

  const images = [...(cover && keepCover ? [cover] : []), ...kept, ...saved];
  try {
    if (existing) {
      await db.update(posts).set({ title, description, cover, body, images, tags }).where(eq(posts.id, existing.id));
    } else {
      const id = randomBytes(6).toString("hex");
      await db.insert(posts).values({ id, userId: authorId, title, description, cover, body, images, tags });
      return { id };
    }
  } catch (error) {
    await deleteImages(saved);
    throw error;
  }

  await deleteImages(existing.images.filter((name) => !images.includes(name)));
  return { id: existing.id };
}

// Comments, likes, favorites and views go with the row through ON DELETE CASCADE.
export async function removePost(post: Post) {
  await db.delete(posts).where(eq(posts.id, post.id));
  await deleteImages(post.images);
}
