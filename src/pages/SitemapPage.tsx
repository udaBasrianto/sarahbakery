import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { apiClient } from "@/integrations/api/client";
import {
  Home,
  ShoppingBag,
  Cake,
  FileText,
  Users,
  UserCheck,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  BookOpen,
  ShieldCheck,
} from "lucide-react";

interface BlogSlug {
  id: string;
  title: string;
  slug: string;
}

interface ProductSlug {
  id: string;
  name: string;
  slug: string;
}

export default function SitemapPage() {
  const [blogs, setBlogs] = useState<BlogSlug[]>([]);
  const [products, setProducts] = useState<ProductSlug[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [blogRes, prodRes] = await Promise.all([
          apiClient
            .from("blog_posts")
            .select("id,title,slug")
            .eq("is_published", true)
            .limit(10),
          apiClient
            .from("products")
            .select("id,name,slug")
            .eq("is_available", true)
            .limit(12),
        ]);
        if (blogRes.data) setBlogs(blogRes.data as BlogSlug[]);
        if (prodRes.data) setProducts(prodRes.data as ProductSlug[]);
      } catch (err) {
        console.error("Failed to load sitemap links", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sitemapJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Beranda",
        item: "https://sarahbakery.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Peta Situs",
        item: "https://sarahbakery.com/sitemap",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 pt-6 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Peta Situs (Sitemap)"
        description="Peta situs resmi Sarah Bakery. Jelajahi semua daftar produk, katalog roti dan kue, artikel blog, pesanan kustom, dan layanan pelanggan."
        jsonLd={sitemapJsonLd}
      />

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Banner Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 p-8 text-white shadow-xl">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Navigasi Situs
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Peta Situs Sarah Bakery
            </h1>
            <p className="text-amber-100 max-w-2xl text-sm sm:text-base leading-relaxed">
              Selamat datang di direktori lengkap halaman Sarah Bakery. Gunakan peta situs ini untuk menelusuri seluruh fitur, produk unggulan, artikel, dan layanan kami dengan cepat.
            </p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Dynamic XML & SEO Indexer Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                XML Sitemap untuk Mesin Pencari
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Peta situs format XML yang disesuaikan untuk Googlebot, Bingbot, dan crawler mesin pencari.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100 transition-colors w-full sm:w-auto"
            >
              Buka sitemap.xml <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-colors w-full sm:w-auto"
            >
              robots.txt <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Halaman Utama */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                <Home className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Halaman Utama & Layanan
              </h2>
            </div>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/"
                  className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <span>Beranda (Homepage)</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </li>
              <li>
                <Link
                  to="/products"
                  className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <span>Katalog Produk & Roti</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </li>
              <li>
                <Link
                  to="/custom-order"
                  className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <span>Pemesanan Kue Kustom</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <span>Blog & Resep Bakery</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </li>
              <li>
                <Link
                  to="/affiliate"
                  className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <span>Program Afiliasi Sarah Bakery</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Card 2: Produk Unggulan */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Cake className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Produk Roti & Kue
              </h2>
            </div>
            {products.length > 0 ? (
              <ul className="space-y-2.5">
                {products.map((prod) => (
                  <li key={prod.id}>
                    <Link
                      to={`/product/${prod.slug || prod.id}`}
                      className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    >
                      <span className="truncate max-w-[240px]">{prod.name}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">
                Menampilkan semua varian kue panggang, bolu gulung, roti tawar lembut, dan kue kering.
              </p>
            )}
          </div>

          {/* Card 3: Artikel Blog */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Artikel & Edukasi Bakery
              </h2>
            </div>
            {blogs.length > 0 ? (
              <ul className="space-y-2.5">
                {blogs.map((b) => (
                  <li key={b.id}>
                    <Link
                      to={`/blog/${b.slug || b.id}`}
                      className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      <span className="truncate max-w-[240px]">{b.title}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">
                Panduan resep, tips menjaga kelembutan roti, dan artikel seputar kuliner.
              </p>
            )}
          </div>

          {/* Card 4: Akun Pelanggan */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Area Pelanggan & Akun
              </h2>
            </div>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/auth"
                  className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <span>Masuk / Daftar Akun</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <span>Dashboard Saya</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard/orders"
                  className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <span>Riwayat Pesanan</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard/wishlist"
                  className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <span>Daftar Keinginan (Wishlist)</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
