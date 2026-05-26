import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Custom splash som vises kun når appen kjører som installert PWA
 * (standalone-modus). En kort kors-animasjon (stroke draws fra topp
 * til bunn) før appen fader inn. Varer ca 1.6 sek totalt.
 *
 * iOS og Android viser også sin egen statiske splash basert på
 * manifest (bakgrunnsfarge + ikon) — denne komponenten legger seg
 * ÷PÅ toppen av det, og fader naturlig over til app-innholdet.
 */
export default function PwaSplash() {
  const [show, setShow] = useState(() => {
    // Kun i standalone (installert PWA)
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  });

  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => setShow(false), 1600);
    return () => clearTimeout(timer);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center pointer-events-none"
          style={{ backgroundColor: '#F4F0E9' }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <svg width="80" height="180" viewBox="0 0 32 72" style={{ color: '#4A6B65' }}>
            {/* Sirkel i topp — fade in */}
            <motion.circle
              cx="16" cy="6" r="4"
              fill="none" stroke="currentColor" strokeWidth="0.7"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            />
            <motion.circle
              cx="16" cy="6" r="1.5"
              fill="none" stroke="currentColor" strokeWidth="0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            />

            {/* Horisontal arm — tegnes fra venstre til høyre */}
            <motion.line
              x1="2" y1="22" x2="30" y2="22"
              stroke="currentColor" strokeWidth="1" strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
            />
            <motion.circle
              cx="2" cy="22" r="2"
              fill="none" stroke="currentColor" strokeWidth="0.6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.25 }}
            />
            <motion.circle
              cx="30" cy="22" r="2"
              fill="none" stroke="currentColor" strokeWidth="0.6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.25 }}
            />

            {/* Vertikal akse — tegnes fra topp til bunn */}
            <motion.line
              x1="16" y1="1" x2="16" y2="72"
              stroke="currentColor" strokeWidth="1" strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.1, duration: 0.9, ease: 'easeOut' }}
            />
          </svg>

          <motion.p
            className="mt-6"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 500,
              fontSize: '0.7rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#4A6B65',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.4 }}
          >
            Tidebønn
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
