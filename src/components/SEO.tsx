import React from "react";
import { Helmet } from "react-helmet-async";

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogType?: "website" | "article" | "product";
  ogImage?: string;
  keywords?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  noIndex?: boolean;
}

const DEFAULT_TITLE = "Sarah Bakery - Toko Roti & Kue Spesialis Kualitas Tekstur dan Kemurnian Rasa";
const DEFAULT_DESCRIPTION =
  "Sarah Bakery menyediakan berbagai pilihan bolu panggang, roti manis, kue kering, dan pastry lembut buatan tangan dengan bahan premium dan cita rasa autentik.";
const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/640f06dd-3668-465b-a4f2-3711767cd895";
const SITE_NAME = "Sarah Bakery";

export const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalUrl,
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  keywords = "sarah bakery, toko roti, kue panggang, bolu lembut, pastry premium, kue kering",
  jsonLd,
  noIndex = false,
}) => {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const currentUrl = canonicalUrl || (typeof window !== "undefined" ? window.location.href : "");

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}
      {currentUrl && <link rel="canonical" href={currentUrl} />}

      {/* Open Graph Meta Tags */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {currentUrl && <meta property="og:url" content={currentUrl} />}
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* Schema.org Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};
