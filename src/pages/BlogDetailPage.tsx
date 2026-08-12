import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { apiClient } from "@/integrations/api/client";
import { Calendar, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string | null;
  tags: string[] | null;
  published_at: string | null;
}

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data } = await apiClient
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (!data) setNotFound(true);
      else setPost(data as BlogPost);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-bold mb-2">Artikel tidak ditemukan</h1>
        <Link to="/blog" className="text-primary underline">
          Kembali ke Blog
        </Link>
      </div>
    );
  }

  const url = `https://sarah-bakery.lovable.app/blog/${post.slug}`;
  const metaTitle = post.meta_title || post.title;
  const metaDesc =
    post.meta_description || post.excerpt || `${post.title} - Sarah Bakery`;

  return (
    <div className="pb-24 min-h-screen bg-background">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        {post.keywords && <meta name="keywords" content={post.keywords} />}
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url" content={url} />
        {post.cover_image && (
          <meta property="og:image" content={post.cover_image} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: metaDesc,
            image: post.cover_image || undefined,
            datePublished: post.published_at,
            mainEntityOfPage: url,
            author: { "@type": "Organization", name: "Sarah Bakery" },
            publisher: {
              "@type": "Organization",
              name: "Sarah Bakery",
            },
          })}
        </script>
      </Helmet>

      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-2 px-4 h-14">
          <Link to="/blog" className="p-2 -ml-2 hover:bg-secondary rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg truncate">Artikel</h1>
        </div>
      </header>

      <article className="px-4 py-4">
        {post.cover_image && (
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-56 object-cover rounded-2xl mb-4"
          />
        )}
        <h1 className="text-2xl font-display font-bold text-foreground">
          {post.title}
        </h1>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          {post.published_at &&
            new Date(post.published_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
        </div>
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        )}
        {post.excerpt && (
          <p className="text-base text-muted-foreground mt-4 italic">
            {post.excerpt}
          </p>
        )}
        <div className="prose prose-sm max-w-none mt-6 text-foreground whitespace-pre-wrap leading-relaxed">
          {post.content}
        </div>
      </article>
    </div>
  );
}



