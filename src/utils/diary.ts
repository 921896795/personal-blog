import { getCollection, type CollectionEntry } from "astro:content";

export type DiaryEntry = CollectionEntry<"diary">;

export function getDiarySlug(entry: DiaryEntry) {
  return entry.id.replace(/\.(md|mdx)$/i, "");
}

/** 日记标题，缺省时退回文件名 */
export function getDiaryTitle(entry: DiaryEntry) {
  return entry.data.title || getDiarySlug(entry);
}

export async function getDiaryEntries() {
  const entries = await getCollection("diary", ({ data }) => !data.draft);
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
