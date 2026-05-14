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
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6B65]"></div>
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
