import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const formatPrayerText = (text) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  
  return lines.map((line, index) => {
    if (line.trim() === '') {
      return <div key={index} className="h-4" />;
    }
    
    const trimmedLine = line.trim();
    if (trimmedLine && trimmedLine === trimmedLine.toUpperCase() && /[A-ZÆØÅ]/.test(trimmedLine)) {
      return (
        <h4 key={index} className="mb-3 mt-6 text-[#4D8082] dark:text-[#6B9EA0] font-serif font-semibold text-lg tracking-wide">
          {trimmedLine}
        </h4>
      );
    }
    
    return (
      <p key={index} className="mb-2 leading-relaxed text-[#4A4A4A] dark:text-gray-200">
        {line}
      </p>
    );
  });
};

export default function PrayerContent({ prayer, onScrollComplete, noInternalScroll, showGroupMarkers = false }) {
  const contentRef = useRef(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  // Skjul/vis gruppe-markører (I/II) basert på showGroupMarkers
  // En gruppe-markør er en .markør inne i en .linje som også inneholder
  // en .tekst med en p.henvisning-gruppe
  useEffect(() => {
    if (!contentRef.current) return;
    const linjer = contentRef.current.querySelectorAll('.linje');
    linjer.forEach(linje => {
      const markør = linje.querySelector('.markør');
      const harGruppeHenvisning = linje.querySelector('.tekst p.veksellesning-gruppe') !== null;
      if (markør && harGruppeHenvisning) {
        markør.style.visibility = showGroupMarkers ? 'visible' : 'hidden';
      }
    });
  }, [showGroupMarkers, prayer]);

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
        
        if (isAtBottom && !hasScrolledToEnd) {
          setHasScrolledToEnd(true);
          onScrollComplete?.();
        }
      }
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [hasScrolledToEnd, onScrollComplete]);

  const Section = ({ title, content, icon }) => {
    if (!content) return null;
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          {icon && <span className="text-[#6B9EA0]">{icon}</span>}
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#6B9EA0]">{title}</h3>
        </div>
        <div className="pl-0 md:pl-4">
          {formatPrayerText(content)}
        </div>
      </motion.div>
    );
  };

  return (
    <div 
      ref={contentRef}
      className={noInternalScroll ? "px-1 prayer-content" : "max-h-[70vh] overflow-y-auto px-1 prayer-content"}
    >
      <style>{`
        .prayer-content::-webkit-scrollbar {
          width: 6px;
        }
        .prayer-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .prayer-content::-webkit-scrollbar-thumb {
          background: #6B9EA040;
          border-radius: 3px;
        }
        .prayer-content::-webkit-scrollbar-thumb:hover {
          background: #6B9EA060;
        }
        
        .prayer-rich-text h2 {
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-size: 0.85em;
          font-weight: 400;
          font-family: 'EB Garamond', Georgia, serif;
          color: #4A4A4A;
          margin-top: 2rem;
          margin-bottom: 0.1rem;
        }
        
        .dark .prayer-rich-text h2 {
          color: #9A9A9A;
        }
        
        .prayer-rich-text h3 {
          font-family: 'EB Garamond', Georgia, serif;
          font-style: italic;
          font-weight: 400;
          font-size: 1.1em;
          color: #1A1A1A;
          text-transform: none;
          letter-spacing: 0;
          margin-top: 0.7rem;
          margin-bottom: 0rem;
        }
        
        .dark .prayer-rich-text h3 {
          color: #E8E0D8;
        }
        
        .prayer-rich-text h4 {
          font-family: 'EB Garamond', Georgia, serif;
          font-style: italic;
          font-weight: 400;
          font-size: 1em;
          color: #4A4A4A;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
        }
        
        .prayer-rich-text strong {
          color: #6B9EA0 !important;
          font-weight: 700;
          margin-right: 0.5rem;
        }
        
        .prayer-rich-text small {
          color: #6A6A6A;
          font-size: 0.85em;
        }
        
        .dark .prayer-rich-text small {
          color: #B0B0B0;
        }
        
        .prayer-rich-text p {
          font-family: 'EB Garamond', Georgia, serif;
          font-size: 1.1em;
          line-height: 1.8;
          margin: 0;
          color: inherit;
        }

        .prayer-rich-text div[style*="margin-left"] {
          line-height: 1.8;
          margin-bottom: 0.5rem;
        }
        
        .prayer-rich-text a {
          color: #6B9EA0;
        }
        
        .prayer-rich-text a:hover {
          color: #4D8082;
        }
        
        .prayer-rich-text .linje {
          display: grid;
          column-gap: 0.2rem;
          grid-template-columns: 2.5rem 1fr auto;
          margin-bottom: 0;
        }
        
        
        .prayer-rich-text .markør {
          font-weight: bold;
          align-self: start;
          padding-top: 0.25rem;
        }
        

        
        .prayer-rich-text .tekst {
          /* Styling for veksellesning */
        }
        
        .prayer-rich-text .henvisning {
          margin: 0;
          text-align: right;
          white-space: nowrap;
          font-size: 0.9rem;
          align-self: end;
        }

        .prayer-rich-text .veksellesning {
          margin: 0; /* Gir kun et vanlig linjeskift (pga. block-element) */
          padding-left: 0rem; /* Flytter hele avsnittet inn */
          text-indent: 0rem;
        }

                .prayer-rich-text .veksellesning-gruppe {
          margin: 0;
          padding-left: ${showGroupMarkers ? '0rem' : '-0.5rem'};
          text-indent: ${showGroupMarkers ? '0rem' : '-2.5rem'};
        }

        .prayer-rich-text .strofe {
          margin-top: 1.5em;
          margin-bottom: 0; /* Gir "dobbelt" linjeskift i bunnen */
        }

        .prayer-rich-text .antifontekst {
          margin-top: 0.6em;    /* Gir "dobbelt" linjeskift over */
          margin-bottom: 1em; /* Gir "dobbelt" linjeskift under */
        }
        
         .prayer-rich-text .info {
          margin-top: 0;
          margin-bottom: 1.5em; /* Gir "dobbelt" linjeskift i bunnen */
          font-style: italic; 
          font-size: 0.8rem;
        }

        .prayer-rich-text .header-henvisning {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        /* Mobil: mindre skrift og smalere markør-kolonne for å unngå
           overdrevne linjeskift. Plassert sist så den overstyrer
           base-reglene over. */
        @media (max-width: 640px) {
          .prayer-rich-text p {
            font-size: 0.95em;
            line-height: 1.55;
          }
          .prayer-rich-text .linje {
            grid-template-columns: 1.6rem 1fr auto;
            column-gap: 0.15rem;
          }
          .prayer-rich-text .markør {
            padding-top: 0.15rem;
          }
          .prayer-rich-text .veksellesning-gruppe {
            text-indent: ${showGroupMarkers ? '0rem' : '-1.6rem'};
          }
          .prayer-rich-text .henvisning {
            font-size: 0.78rem;
          }
        }
      `}</style>

      {prayer.free_text_content && (
        <div
          className="prayer-rich-text prose prose-lg dark:prose-invert max-w-none text-[#1A1A1A] dark:text-gray-100"
          dangerouslySetInnerHTML={{ __html: prayer.free_text_content
            .replace(/ \*/g, ' *')
            .replace(/ †/g, ' †') }}
        />
      )}
    </div>
  );
}