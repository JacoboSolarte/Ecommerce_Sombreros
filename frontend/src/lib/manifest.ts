import { readFile } from "node:fs/promises";
import path from "node:path";

export interface ImageEntry {
  src: string;
  alt: string;
  title: string;
  author: string;
  license: string;
  sourceUrl: string;
  group: "region" | "process" | "products" | "other";
}

type Loose = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function pick(o: Loose, keys: string[]): string {
  for (const k of keys) {
    const v = str(o[k]);
    if (v) return v;
  }
  return "";
}

function normalize(o: Loose, keyHint?: string): ImageEntry | null {
  let src = pick(o, ["src", "path", "url", "file", "localPath", "local"]) || keyHint || "";
  if (!src) return null;
  src = src.replace(/\\/g, "/");
  if (!src.startsWith("/") && !src.startsWith("http")) {
    src = src.startsWith("images/") ? `/${src}` : `/images/${src}`;
  }
  const group: ImageEntry["group"] = src.includes("/region/")
    ? "region"
    : src.includes("/process/")
      ? "process"
      : src.includes("/products/")
        ? "products"
        : "other";
  const lic = o.license;
  const license =
    typeof lic === "string"
      ? lic
      : lic && typeof lic === "object"
        ? pick(lic as Loose, ["name", "id", "short", "title"])
        : pick(o, ["licence", "licenseName"]);
  return {
    src,
    alt: pick(o, ["alt", "altText", "description", "caption"]) || pick(o, ["title"]),
    title: pick(o, ["title", "caption", "description", "alt"]),
    author: pick(o, ["author", "creator", "artist", "credit", "photographer", "attribution"]),
    license,
    sourceUrl: pick(o, ["sourceUrl", "source_url", "source", "pageUrl", "page", "originalUrl", "link"]),
    group,
  };
}

/** Reads public/images/manifest.json. Tolerant of array / {images} / keyed-object shapes. */
export async function loadManifest(): Promise<ImageEntry[]> {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "public", "images", "manifest.json"),
      "utf8",
    );
    const data = JSON.parse(raw.replace(/^﻿/, "")) as unknown;
    let list: ImageEntry[] = [];
    const collect = (arr: unknown[]) => {
      for (const it of arr) {
        if (it && typeof it === "object") {
          const e = normalize(it as Loose);
          if (e) list.push(e);
        }
      }
    };
    if (Array.isArray(data)) collect(data);
    else if (data && typeof data === "object") {
      const obj = data as Loose;
      const arr = obj.images ?? obj.items ?? obj.files;
      if (Array.isArray(arr)) collect(arr);
      else {
        for (const [k, v] of Object.entries(obj)) {
          if (Array.isArray(v)) collect(v);
          else if (v && typeof v === "object") {
            const e = normalize(v as Loose, k);
            if (e) list.push(e);
          }
        }
      }
    }
    list = list.filter((e) => !e.src.includes("/raw/"));
    return list;
  } catch {
    return [];
  }
}
