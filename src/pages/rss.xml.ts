import rss from "@astrojs/rss";
import { SITE } from "@/config";
import { getPostSlug, getPublishedPosts } from "@/utils/posts";

export async function GET(context: { site: URL }) {
  const posts = await getPublishedPosts();

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: posts.map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDatetime,
      link: `/posts/${getPostSlug(post)}/`
    }))
  });
}
