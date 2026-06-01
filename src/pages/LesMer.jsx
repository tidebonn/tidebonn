import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

// Landingsside for «Les mer»-seksjonen. Lenker videre til de fire
// innholdssidene som hver hentes fra content_pages (redigeres i Admin).
const sections = [
  {
    title: 'Hva er tidebønn',
    blurb: 'En kort innføring i tidebønnens historie, struktur og betydning.',
    page: 'HvaErTidebonn',
  },
  {
    title: 'Hvordan be tidebønn',
    blurb: 'Praktisk veiledning til å bruke appen som ditt bønnerom.',
    page: 'HvordanTidebonn',
  },
  {
    title: 'Om appen',
    blurb: 'Bakgrunnen for Tidebønn-appen og hvem som står bak.',
    page: 'About',
  },
  {
    title: 'Om Areopagos',
    blurb: 'Om misjonsstiftelsen som har utviklet appen.',
    page: 'OmAreopagos',
  },
];

export default function LesMer() {
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
          Les mer
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sections.map((s) => (
            <Link
              key={s.page}
              to={createPageUrl(s.page)}
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
                    marginBottom: '0.4rem',
                  }}
                >
                  {s.title}
                </h2>
                <ArrowRight
                  className="text-[#B6B9B3] group-hover:text-[#4A6B65] dark:group-hover:text-[#BD7B59] transition-colors flex-shrink-0 mt-1"
                  size={18}
                  strokeWidth={1.5}
                />
              </div>
              <p
                className="text-[#6A6A6A] dark:text-[rgba(244,240,233,0.6)]"
                style={{
                  fontFamily: "'Spectral', Georgia, serif",
                  fontSize: '0.95rem',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {s.blurb}
              </p>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
