import React from 'react';

/**
 * Veksler mellom Normal og Større tekst i bønnevisningen.
 * Symbol: liten «T» → stor «T» (ikke «A», som kan forveksles med
 * I/II-markøren). Når aktiv på telefon roteres skjermen til liggende,
 * indikert med en liten 90°-pil.
 *
 * @param {boolean} active - om større tekst er på
 * @param {Function} onToggle
 * @param {boolean} showRotateHint - vis 90°-pil (true på telefon)
 */
export default function TextSizeButton({ active, onToggle, showRotateHint = true }) {
  return (
    <button
      onClick={onToggle}
      className={`p-1.5 rounded transition-colors flex-shrink-0 flex items-center gap-0.5 ${
        active
          ? 'bg-[#4A6B65]/10 text-[#4A6B65] hover:bg-[#4A6B65]/20 dark:bg-[#BD7B59]/15 dark:text-[#BD7B59] dark:hover:bg-[#BD7B59]/25'
          : 'hover:bg-[#F4F0E9] dark:hover:bg-gray-800 text-[#B6B9B3]'
      }`}
      title={active ? 'Normal tekst' : 'Større tekst'}
      aria-pressed={active}
    >
      {/* liten T + stor T */}
      <span className="font-serif leading-none" style={{ fontSize: '0.7rem' }}>T</span>
      <span className="font-serif leading-none" style={{ fontSize: '1.05rem' }}>T</span>
      {showRotateHint && (
        // liten 90°-rotasjonspil
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-0.5"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <polyline points="3 3 3 8 8 8" />
        </svg>
      )}
    </button>
  );
}
