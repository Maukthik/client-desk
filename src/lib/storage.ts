import "server-only";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";

/*
 * Local-disk storage for deliverable files. The interface is deliberately
 * small (put / get / remove by key) so an S3-compatible driver can replace it
 * without touching callers.
 */

// The upload directory is runtime configuration, so tell the bundler not to trace it.
const root = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./storage/uploads");

function resolveKey(key: string) {
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export async function putObject(key: string, body: WebReadableStream<Uint8Array>) {
  const target = resolveKey(key);
  await mkdir(/*turbopackIgnore: true*/ path.dirname(target), { recursive: true });
  await pipeline(Readable.fromWeb(body), createWriteStream(/*turbopackIgnore: true*/ target));
}

export async function getObject(key: string) {
  const target = resolveKey(key);
  const info = await stat(/*turbopackIgnore: true*/ target);
  return { size: info.size, stream: Readable.toWeb(createReadStream(/*turbopackIgnore: true*/ target)) as ReadableStream<Uint8Array> };
}

export async function removeObject(key: string) {
  await rm(/*turbopackIgnore: true*/ resolveKey(key), { force: true });
}

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 50) * 1024 * 1024;
