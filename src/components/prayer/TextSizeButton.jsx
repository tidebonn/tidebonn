import React from 'react';
import { toast } from 'sonner';

/**
 * Styrer tekststørrelse i bønnevisningen.
 *
 * - Store skjermer (iPad/PC/Mac): knappen veksler mellom normal og
 *   større tekst (persisteres av forelder).
 * - Telefon: størrelsen styres av skjermretningen (stående = normal,
 *   liggende = stor, via CSS i PrayerContent). Knappen toggler derfor
 *   ingenting — den viser bare en liten info: «Snu skjermen for større
 *   tekst», og en 90°-pil som hint.
 *
 * Symbol: liten «T» → stor «T» (ikke «A», som kan forveksles med
 * I/II-markøren).
 *
 * @param {boolean} isPhone - telefon (liten skjerm)
 * @param {boolean} active - om større tekst er på (kun relevant på desktop)
 * @param {Function} onToggle - veksle større tekst (kun desktop)
 */
export default function TextSizeButton({ isPhone, active, onToggle }) {
  const handleClick = () => {
    if (isPhone) {
      toast('Snu skjermen for større tekst', {
        description: 'På telefon vises bønnen større når du holder den liggende.',
        duration: 3500,
      });
    } else {
      onToggle();
    }
  };

  const showActive = !isPhone && active;

  return (
    <button
      onClick={handleClick}
      className={`p-1.5 rounded transition-colors flex-shrink-0 flex items-center gap-0.5 ${
        showActive
          ? 'bg-[#4A6B65]/10 text-[#4A6B65] hover:bg-[#4A6B65]/20 dark:bg-[#BD7B59]/15 dark:text-[#BD7B59] dark:hover:bg-[#BD7B59]/25'
          : 'hover:bg-[#F4F0E9] dark:hover:bg-gray-800 text-[#B6B9B3]'
      }`}
      title={isPhone ? 'Snu skjermen for større tekst' : (active ? 'Normal tekst' : 'Større tekst')}
      aria-pressed={showActive}
    >
      {/* liten T + stor T */}
      <span className="font-serif leading-none" style={{ fontSize: '0.7rem' }}>T</span>
      <span className="font-serif leading-none" style={{ fontSize: '1.05rem' }}>T</span>
      {isPhone && (
        // liten 90°-rotasjonspil (hint om å snu skjermen)
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
