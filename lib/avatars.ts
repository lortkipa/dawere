import "server-only";
import { randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import sharp from "sharp";

// The standalone server chdirs into .next/standalone, which a build wipes, so production
// should set UPLOAD_DIR to an absolute path.
const avatarDir = path.resolve(process.env.UPLOAD_DIR ?? "uploads", "avatars");
const avatarName = /^[0-9a-f]{32}\.webp$/;
const avatarSize = 400;

// Re-encoding fixes EXIF rotation, strips metadata and throws on anything that isn't an image.
export async function saveAvatar(input: Buffer) {
  const image = await sharp(input)
    .rotate()
    .resize(avatarSize, avatarSize, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();

  const name = `${randomBytes(16).toString("hex")}.webp`;
  await mkdir(avatarDir, { recursive: true });
  await writeFile(path.join(avatarDir, name), image);
  return name;
}

export async function deleteAvatar(name: string | null) {
  if (name && avatarName.test(name)) await rm(path.join(avatarDir, name), { force: true });
}

// Returns null for names that don't look like ours, so a request can't climb out of the folder.
export async function openAvatar(name: string) {
  if (!avatarName.test(name)) return null;
  const file = path.join(avatarDir, name);
  try {
    const { size } = await stat(file);
    return { size, stream: Readable.toWeb(createReadStream(file)) as ReadableStream };
  } catch {
    return null;
  }
}
