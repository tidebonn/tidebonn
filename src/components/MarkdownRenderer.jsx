import ReactMarkdown from 'react-markdown';

// Felles markdown-renderer for innholdssider og forhåndsvisning i editor.
// Støtter:
//   - Standard markdown: overskrifter, lister, blockquotes, links, bilder
//   - YouTube-embed via code-block med språk 'youtube' (video-ID som innhold)
//   - Bilder via standard ![alt](url)

function YouTubeEmbed({ videoId }) {
  return (
    <div
      style={{
        position: 'relative',
        paddingBottom: '56.25%',
        height: 0,
        overflow: 'hidden',
        margin: '1.75rem 0',
        backgroundColor: 'rgba(0,0,0,0.05)',
      }}
    >
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video"
      />
    </div>
  );
}

export default function MarkdownRenderer({ content }) {
  if (!content) return null;
  return (
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
          <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem', listStyle: 'disc' }} {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol style={{ marginBottom: '1rem', paddingLeft: '1.5rem', listStyle: 'decimal' }} {...props} />
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
        em: ({ node, ...props }) => <em style={{ fontStyle: 'italic' }} {...props} />,
        img: ({ node, ...props }) => (
          // eslint-disable-next-line jsx-a11y/alt-text
          <img style={{ maxWidth: '100%', height: 'auto', margin: '1.5rem 0' }} {...props} />
        ),
        hr: () => <hr style={{ border: 'none', borderTop: '0.5px solid #DECCB4', margin: '2rem 0' }} />,
        // YouTube-embed via code-block med language="youtube".
        // Inline-code ignoreres her (videreformidles som vanlig kode).
        code: ({ node, inline, className, children, ...props }) => {
          const lang = /language-(\w+)/.exec(className || '')?.[1];
          if (!inline && lang === 'youtube') {
            const videoId = String(children).trim().replace(/\n$/, '');
            if (/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
              return <YouTubeEmbed videoId={videoId} />;
            }
            return (
              <pre style={{ background: '#FAF5EB', padding: '0.75rem', fontSize: '0.85rem' }}>
                <code>Ugyldig YouTube-ID: {videoId}</code>
              </pre>
            );
          }
          return inline ? (
            <code style={{ background: '#EBE4D7', padding: '0.1em 0.3em', fontSize: '0.9em' }} className={className} {...props}>
              {children}
            </code>
          ) : (
            <pre style={{ background: '#2C2C2A', color: '#F4F0E9', padding: '1rem', overflowX: 'auto', fontSize: '0.85rem' }}>
              <code className={className} {...props}>{children}</code>
            </pre>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
