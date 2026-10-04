"use server";

import { randomBytes } from "node:crypto";
import { getSchema, type JSONContent } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import {
  isSafeHref,
  maxBodyLength,
  maxDescriptionLength,
  maxImages,
  maxTitleLength,
  maxUploadBytes,
} from "@/lib/post-rules";
import { postExtensions } from "@/lib/post-schema";
import { getCurrentUser } from "@/lib/session";
import { maxTags, minTags, normalizeTag } from "@/lib/tags";
import { deleteImages, saveImage } from "@/lib/uploads";
import { imageUrl } from "@/lib/user-view";

type Result = { error: string } | void;

const genericError = "რაღაც შეცდომაა, სცადე თავიდან";
const unreadableError = "ერთ-ერთ ფოტოს ვერ ვკითხულობთ, სცადე სხვა";

const schema = getSchema(postExtensions);
// The editor sends photos as files and points their nodes at `upload:<n>`.
const uploadSrc = /^upload:(\d{1,3})$/;

function walk(node: JSONContent, visit: (node: JSONContent) => void) {
  visit(node);
  node.content?.forEach((child) => walk(child, visit));
}

// The editor sends the tags as a JSON array of what the author picked or typed.
function parseTags(value: FormDataEntryValue | null) {
  let list: unknown;
  try {
    list = JSON.parse(String(value));
  } catch {
    return null;
  }
  if (!Array.isArray(list) || !list.every((item) => typeof item === "string")) return null;
  const tags = list.map(normalizeTag);
  if (tags.some((tag) => tag === null)) return null;
  const unique = [...new Set(tags as string[])];
  return unique.length >= minTags && unique.length <= maxTags ? unique : null;
}

function uploadedFile(formData: FormData, key: string) {
  const file = formData.get(key);
  return file instanceof File && file.size > 0 && file.size <= maxUploadBytes ? file : null;
}

export async function publishPost(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (!user.onboardedAt) redirect("/onboarding");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title || title.length > maxTitleLength) return { error: genericError };
  if (!description || description.length > maxDescriptionLength) return { error: genericError };
  const tags = parseTags(formData.get("tags"));
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

  const body = doc.toJSON() as JSONContent;
  const uploads = new Set<string>();
  let valid = true;
  walk(body, (node) => {
    if (node.type === "heading" && ![1, 2, 3].includes(node.attrs?.level)) valid = false;
    if (node.type === "image") {
      const match = uploadSrc.exec(node.attrs?.src ?? "");
      if (match) uploads.add(match[1]);
      else valid = false;
    }
    for (const mark of node.marks ?? []) {
      if (mark.type === "link" && !isSafeHref(mark.attrs?.href)) valid = false;
    }
  });
  if (!valid) return { error: genericError };

  const hasCover = formData.has("cover");
  const coverFile = hasCover ? uploadedFile(formData, "cover") : null;
  if (hasCover && !coverFile) return { error: unreadableError };
  if (uploads.size + (coverFile ? 1 : 0) > maxImages) {
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
  let cover: string | null = null;
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
    if (node.type === "image") {
      const n = uploadSrc.exec(node.attrs!.src)![1];
      node.attrs = { ...node.attrs, src: imageUrl(names.get(n)!) };
    }
  });

  const id = randomBytes(6).toString("hex");
  try {
    await db.insert(posts).values({ id, userId: user.id, title, description, cover, body, images: saved, tags });
  } catch (error) {
    await deleteImages(saved);
    throw error;
  }

  redirect(`/@${user.handle}/${id}`);
}
