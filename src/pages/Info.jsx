import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import db from '@/api/client';

// Landingsside for «Info»-seksjonen. Lister alle innholdssider
// fra content_pages dynamisk (sortert på order_index, ties brytes
// på title). Lenker går til /Side/<slug> som rendres av
// DynamicContentPage.
export default function Info() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const all = await db.entities.ContentPage.list();
        if (!mounted) return;
        const sorted = (all || []).slice().sort((a, b) => {
          const ao = a.order_index ?? 999;
          const bo = b.order_index ?? 999;
          if (ao !== bo) return ao - bo;
          return (a.title || '').localeCompare(b.title || '', 'no');
        });
        setPages(sorted);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Info load:', e?.message || e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
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
            marginBottom: '0.75rem',
          }}
          className="text-[#2C2C2A] dark:text-[#F4F0E9]"
        >
          Info
        </h1>
        <p
          className="text-[#6A6A6A] dark:text-[rgba(244,240,233,0.65)]"
          style={{
            fontFamily: "'Spectral', Georgia, serif",
            fontSize: '1.05rem',
            marginBottom: '2.5rem',
          }}
        >
          Velg et tema for å lese mer.
        </p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-[#E8E0D8] dark:bg-gray-800 rounded-md animate-pulse" />
            ))}
          </div>
        ) : pages.length === 0 ? (
          <p className="text-[#B6B9B3] italic" style={{ fontFamily: "'Spectral', Georgia, serif" }}>
            Ingen sider er lagt inn ennå.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pages.map((p) => {
              const title = p.title || p.menu_label || p.slug;
              const subtitle = p.subtitle || '';
              return (
                <Link
                  key={p.slug}
                  to={`/Side/${p.slug}`}
                  className="group block border border-[#DECCB4] dark:border-[rgba(244,240,233,0.15)] rounded-md p-5 bg-white dark:bg-[rgba(255,255,255,0.03)] hover:border-[#4A6B65] dark:hover:border-[#BD7B59] transition-colors"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2
                      className="text-[#2C2C2A] dark:text-[#F4F0E9]"
                      style={{
                        fontFamily: "'Spectral', Georgia, serif",
                        fontWeight: 400,
                        fontSize: '1.25rem',
                        marginBottom: subtitle ? '0.4rem' : 0,
                      }}
                    >
                      {title}
                    </h2>
                    <ArrowRight
                      className="text-[#B6B9B3] group-hover:text-[#4A6B65] dark:group-hover:text-[#BD7B59] transition-colors flex-shrink-0 mt-1"
                      size={18}
                      strokeWidth={1.5}
                    />
                  </div>
                  {subtitle && (
                    <p
                      className="text-[#6A6A6A] dark:text-[rgba(244,240,233,0.6)]"
                      style={{
                        fontFamily: "'Spectral', Georgia, serif",
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {subtitle}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
