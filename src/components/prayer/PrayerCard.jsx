import React from 'react';
import { ChevronRight, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const timeLabels = {
  matutin: { name: 'Matutin', desc: 'Natt/tidlig morgen' },
  laudes: { name: 'Laudes', desc: 'Morgenbønn' },
  prim: { name: 'Prim', desc: 'Første time' },
  ters: { name: 'Ters', desc: 'Tredje time' },
  sekst: { name: 'Sekst', desc: 'Middagsbønn' },
  non: { name: 'Non', desc: 'Niende time' },
  vesper: { name: 'Vesper', desc: 'Aftensang' },
  kompletorium: { name: 'Kompletorium', desc: 'Nattbønn' },
};

export default function PrayerCard({ prayer, isNext, isCompleted, onClick, compact }) {
  const timeInfo = timeLabels[prayer.time_of_day] || {};

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="cursor-pointer border-b-[#DECCB4] dark:border-b-[rgba(244,240,233,0.1)]"
        style={{borderBottomWidth: '0.5px', borderBottomStyle: 'solid', padding: '0.875rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
          {isCompleted && <CheckCircle style={{width: '1rem', height: '1rem', color: '#4A6B65', flexShrink: 0}} />}
          <div>
            <p style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '1rem'}} className="text-[#2C2C2A] dark:text-[#F4F0E9]">{prayer.title}</p>
            <p style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.55rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B6B9B3', marginTop: '0.125rem'}}>Dag {prayer.day}</p>
          </div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          <span style={{backgroundColor: '#CFD9D6', color: '#2C2C2A', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.55rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.25rem 0.5rem'}}>
            {timeInfo.name}
          </span>
          <ChevronRight style={{width: '1rem', height: '1rem', color: '#B6B9B3'}} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div style={{borderWidth: '0.5px', borderStyle: 'solid', overflow: 'hidden'}} className="bg-white border-[#DECCB4] dark:bg-[rgba(255,255,255,0.04)] dark:border-[rgba(244,240,233,0.1)]">
        {isNext && (
          <div style={{padding: '0.375rem 1rem'}} className="bg-[#4A6B65] dark:bg-[#BD7B59]">
            <p style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#F4F0E9'}}>Neste bønn</p>
          </div>
        )}

        <div style={{padding: '1.5rem'}}>
          <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem'}}>
            <div>
              <span style={{backgroundColor: '#CFD9D6', color: '#2C2C2A', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.55rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.25rem 0.5rem', display: 'inline-block', marginBottom: '0.75rem'}}>
                {timeInfo.name}
              </span>
              <h3 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '1.4rem', lineHeight: 1.3}} className="text-[#2C2C2A] dark:text-[#F4F0E9]">{prayer.title}</h3>
              <p style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '0.85rem', marginTop: '0.25rem'}} className="text-[#B6B9B3] dark:text-[rgba(244,240,233,0.5)]">{timeInfo.desc}</p>
            </div>
            {isCompleted && (
              <CheckCircle style={{width: '1.25rem', height: '1.25rem', color: '#4A6B65', flexShrink: 0}} />
            )}
          </div>

          {prayer.opening && (
            <div style={{marginBottom: '1.25rem', padding: '0.875rem', borderLeftWidth: '2px', borderLeftStyle: 'solid'}} className="bg-[#F4F0E9] border-[#DECCB4] dark:bg-[rgba(255,255,255,0.04)] dark:border-[rgba(244,240,233,0.1)]">
              <p style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontStyle: 'italic', fontSize: '0.9rem', lineHeight: 1.7}} className="text-[#6A6A6A] dark:text-[rgba(244,240,233,0.5)] line-clamp-3">
                {prayer.opening.substring(0, 150)}...
              </p>
            </div>
          )}

          <button
            onClick={onClick}
            className="dark:!bg-[#BD7B59]"
            style={{width: '100%', padding: '0.75rem 1rem', backgroundColor: '#4A6B65', color: '#F4F0E9', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}
          >
            Be hele bønnen
            <ChevronRight style={{width: '1rem', height: '1rem'}} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}