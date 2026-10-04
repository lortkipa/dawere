import "server-only";
import { randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import sharp from "sharp";

// The standalone server chdirs into .next/standalone, which a build wipes, so production
// should set UPLOAD_DIR to an absolute path. Every path into it carries turbopackIgnore:
// otherwise the build takes uploads for part of the app and walks the whole project, failing
// on ./data/postgres, which only the Postgres container can read.
const uploadDir = path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR ?? "uploads");
const avatarDir = path.join(/* turbopackIgnore: true */ uploadDir, "avatars");
const imageDir = path.join(/* turbopackIgnore: true */ uploadDir, "images");
const fileName = /^[0-9a-f]{32}\.webp$/;
const avatarSize = 400;
const imageWidth = 1600;

const newName = () => `${randomBytes(16).toString("hex")}.webp`;

// Names that don't look like ours are refused, so a request can't climb out of the folder.
const isOurs = (name: string | null): name is string => name !== null && fileName.test(name);

async function open(file: string) {
  try {
    const { size } = await stat(file);
    return { size, stream: Readable.toWeb(createReadStream(file)) as ReadableStream };
  } catch {
    return null;
  }
}

// Re-encoding fixes EXIF rotation, strips metadata and throws on anything that isn't an image.
export async function saveAvatar(input: Buffer) {
  const image = await sharp(input)
    .rotate()
    .resize(avatarSize, avatarSize, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();
  const name = newName();
  await mkdir(avatarDir, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ avatarDir, name), image);
  return name;
}

export async function deleteAvatar(name: string | null) {
  if (isOurs(name)) await rm(path.join(/* turbopackIgnore: true */ avatarDir, name), { force: true });
}

export async function openAvatar(name: string) {
  return isOurs(name) ? open(path.join(/* turbopackIgnore: true */ avatarDir, name)) : null;
}

// Covers and photos in a post's body. They keep their ratio.
export async function saveImage(input: Buffer) {
  const image = await sharp(input)
    .rotate()
    .resize({ width: imageWidth, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const name = newName();
  await mkdir(imageDir, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ imageDir, name), image);
  return name;
}

export async function deleteImages(names: string[]) {
  await Promise.all(names.filter(isOurs).map((name) => rm(path.join(/* turbopackIgnore: true */ imageDir, name), { force: true })));
}

export async function openImage(name: string) {
  return isOurs(name) ? open(path.join(/* turbopackIgnore: true */ imageDir, name)) : null;
}
