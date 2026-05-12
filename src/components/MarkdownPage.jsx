import { useEffect, useState } from 'react';
import db from '@/api/client';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';

// Felles renderingskomponent for innholdssider (Om tidebønn, Om appen).
// Henter rad fra content_pages via slug, og rendrer markdown med samme
// typografi og bredde som resten av appen.
//
// Markdown-syntaks (utvides senere via admin-editor):
//   # H1                 → store overskrifter
//   ## H2 / ### H3       → mindre overskrifter
//   ![alt](bilde-url)    → bilder
//   [tekst](lenke)       → lenker
//   > sitat              → blockquote
//   - liste
//   **fet**, *kursiv*
//
// For YouTube/Vimeo-embed kan admin lime inn iframe-HTML i innholdet
// når editoren bygges — markdown-rendereren slipper HTML videre i
// dag (men ikke <script> e.l. — react-markdown sanerer farlige tags).

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
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1
                    style={{
                      fontFamily: "'Spectral', Georgia, serif",
                      fontWeight: 300,
                      fontSize: '1.75rem',
                      marginTop: '2.5rem',
                      marginBottom: '1.25rem',
                    }}
                    className="text-[#2C2C2A] dark:text-[#F4F0E9]"
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h2
                    style={{
                      fontFamily: "'Spectral', Georgia, serif",
                      fontWeight: 300,
                      fontSize: '1.5rem',
                      marginTop: '2.5rem',
                      marginBottom: '1rem',
                    }}
                    className="text-[#2C2C2A] dark:text-[#F4F0E9]"
                    {...props}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <h3
                    style={{
                      fontFamily: "'Spectral', Georgia, serif",
                      fontWeight: 400,
                      fontSize: '1.15rem',
                      marginTop: '1.75rem',
                      marginBottom: '0.75rem',
                    }}
                    className="text-[#2C2C2A] dark:text-[#F4F0E9]"
                    {...props}
                  />
                ),
                h4: ({ node, ...props }) => (
                  <h4
                    style={{
                      fontFamily: "'Spectral', Georgia, serif",
                      fontWeight: 500,
                      fontSize: '1rem',
                      marginTop: '1.5rem',
                      marginBottom: '0.5rem',
                    }}
                    className="text-[#2C2C2A] dark:text-[#F4F0E9]"
                    {...props}
                  />
                ),
                p: ({ node, ...props }) => (
                  <p
                    style={{
                      fontFamily: "'Spectral', Georgia, serif",
                      fontWeight: 300,
                      lineHeight: 1.85,
                      marginBottom: '1rem',
                    }}
                    className="text-[#2C2C2A] dark:text-[#E8E0D8]"
                    {...props}
                  />
                ),
                a: ({ node, ...props }) => (
                  <a
                    className="text-[#4A6B65] dark:text-[#BD7B59] hover:underline"
                    target={props.href?.startsWith('http') ? '_blank' : undefined}
                    rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    style={{
                      marginBottom: '1rem',
                      paddingLeft: '1.25rem',
                      listStyle: 'disc',
                    }}
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    style={{
                      marginBottom: '1rem',
                      paddingLeft: '1.5rem',
                      listStyle: 'decimal',
                    }}
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li
                    style={{
                      fontFamily: "'Spectral', Georgia, serif",
                      fontWeight: 300,
                      lineHeight: 1.8,
                      marginBottom: '0.35rem',
                    }}
                    className="text-[#2C2C2A] dark:text-[#E8E0D8]"
                    {...props}
                  />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    style={{
                      borderLeft: '3px solid #4A6B65',
                      paddingLeft: '1.25rem',
                      paddingTop: '0.25rem',
                      paddingBottom: '0.25rem',
                      margin: '1.5rem 0',
                      fontFamily: "'Spectral', Georgia, serif",
                      fontWeight: 300,
                      fontStyle: 'italic',
                    }}
                    className="text-[#4A4A4A] dark:text-[#D8D0C8]"
                    {...props}
                  />
                ),
                strong: ({ node, ...props }) => (
                  <strong style={{ fontWeight: 600 }} className="text-[#2C2C2A] dark:text-[#F4F0E9]" {...props} />
                ),
                em: ({ node, ...props }) => (
                  <em style={{ fontStyle: 'italic' }} {...props} />
                ),
                img: ({ node, ...props }) => (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <img
                    style={{ maxWidth: '100%', height: 'auto', margin: '1.5rem 0' }}
                    {...props}
                  />
                ),
                hr: () => (
                  <hr style={{ border: 'none', borderTop: '0.5px solid #DECCB4', margin: '2rem 0' }} />
                ),
              }}
            >
              {page.content}
            </ReactMarkdown>
          </div>
        )}
      </motion.div>
    </div>
  );
}
