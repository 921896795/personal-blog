import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"posts">;

export function getPostSlug(post: Post) {
  return post.id.replace(/\.(md|mdx)$/i, "");
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

export function getReadingTime(body: string) {
  const words = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<[^>]+>/g, "")
    .trim().length;
  const minutes = Math.max(1, Math.ceil(words / 500));
  return `${minutes} 分钟阅读`;
}

export async function getPublishedPosts() {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  return posts.sort(
    (a, b) => b.data.pubDatetime.valueOf() - a.data.pubDatetime.valueOf()
  );
}

export async function getAllTags() {
  const posts = await getPublishedPosts();
  const tagMap = new Map<string, number>();

  posts.forEach(post => {
    post.data.tags.forEach(tag => {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    });
  });

  return [...tagMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, "zh-CN"));
}
