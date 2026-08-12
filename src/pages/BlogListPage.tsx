import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { apiClient } from "@/integrations/api/client";
import { Calendar, ChevronLeft } from "lucide-react";

interface BlogListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
  tags: string[] | null;
}

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await apiClient
        .from("blog_posts")
        .select("id,title,slug,excerpt,cover_image,published_at,tags")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      setPosts((data as BlogListItem[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="pb-24 min-h-screen">
      <SEO
        title="Blog & Resep Kuliner"
        description="Kumpulan artikel, tips memanggang bolu lembut, resep pastry, dan kisah unik dari dapur Sarah Bakery."
      />

      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-2 px-4 h-14">
          <Link to="/" className="p-2 -ml-2 hover:bg-secondary rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg">Blog</h1>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {loading ? (
          <p className="text-muted-foreground text-center py-12">Memuat...</p>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Belum ada artikel
          </div>
        ) : (
          posts.map((p) => (
            <Link
              key={p.id}
              to={`/blog/${p.slug}`}
              className="block bg-card border border-border rounded-2xl overflow-hidden hover:shadow-soft transition-shadow"
            >
              {p.cover_image && (
                <img
                  src={p.cover_image}
                  alt={p.title}
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-4">
                <h2 className="font-display font-bold text-foreground line-clamp-2">
                  {p.title}
                </h2>
                {p.excerpt && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {p.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  {p.published_at &&
                    new Date(p.published_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                </div>
              </div>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}



