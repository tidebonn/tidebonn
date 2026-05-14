import { useEffect, useState } from 'react';
import db from '@/api/client';
import { motion } from 'framer-motion';
import MarkdownRenderer from '@/components/MarkdownRenderer';

// Felles innholdsside (Om tidebønn, Om appen): henter rad fra
// content_pages via slug og rendrer med MarkdownRenderer.
export default function MarkdownPage({ slug, fallbackTitle }) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pages = await db.entities.ContentPage.filter({ slug });
        if (mounted && pages.length > 0) setPage(pages[0]);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('MarkdownPage load:', e?.message || e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1
          style={{
            fontFamily: "'Spectral', Georgia, serif",
            fontWeight: 300,
            fontSize: '2rem',
            marginBottom: '2rem',
          }}
          className="text-[#2C2C2A] dark:text-[#F4F0E9]"
        >
          {page?.title || fallbackTitle}
        </h1>

        {loading ? (
          <div className="space-y-4">
            <div className="h-4 w-full bg-[#E8E0D8] dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-11/12 bg-[#E8E0D8] dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-10/12 bg-[#E8E0D8] dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-full bg-[#E8E0D8] dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-6 w-1/2 bg-[#E8E0D8] dark:bg-gray-800 rounded animate-pulse mt-8" />
            <div className="h-4 w-full bg-[#E8E0D8] dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-10/12 bg-[#E8E0D8] dark:bg-gray-800 rounded animate-pulse" />
          </div>
        ) : !page?.content ? (
          <p className="text-[#B6B9B3] italic" style={{ fontFamily: "'Spectral', Georgia, serif" }}>
            Innhold er ikke lagt inn ennå. Administrator kan redigere denne siden under Admin → Innhold.
          </p>
        ) : (
          <div className="mb-12">
            <MarkdownRenderer content={page.content} />
          </div>
        )}
      </motion.div>
    </div>
  );
}
