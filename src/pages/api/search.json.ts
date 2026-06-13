import { formatDate, getPostSlug, getPublishedPosts } from "@/utils/posts";

export async function GET() {
  const posts = await getPublishedPosts();

  return new Response(
    JSON.stringify(
      posts.map(post => ({
        title: post.data.title,
        description: post.data.description,
        tags: post.data.tags,
        url: `/posts/${getPostSlug(post)}/`,
        date: formatDate(post.data.pubDatetime)
      }))
    ),
    {
      headers: {
        "content-type": "application/json; charset=utf-8"
      }
    }
  );
}
