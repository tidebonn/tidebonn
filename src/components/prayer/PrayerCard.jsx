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
        className="cursor-pointer"
        style={{borderBottom: '0.5px solid #DECCB4', padding: '0.875rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
          {isCompleted && <CheckCircle style={{width: '1rem', height: '1rem', color: '#4A6B65', flexShrink: 0}} />}
          <div>
            <p style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '1rem', color: '#2C2C2A'}} className="dark:text-[#F4F0E9]">{prayer.title}</p>
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
      <div style={{border: '0.5px solid #DECCB4', backgroundColor: '#FFFFFF', overflow: 'hidden'}} className="dark:bg-[rgba(255,255,255,0.04)] dark:border-[rgba(244,240,233,0.1)]">
        {isNext && (
          <div style={{backgroundColor: '#4A6B65', padding: '0.375rem 1rem'}}>
            <p style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#F4F0E9'}}>Neste bønn</p>
          </div>
        )}

        <div style={{padding: '1.5rem'}}>
          <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem'}}>
            <div>
              <span style={{backgroundColor: '#CFD9D6', color: '#2C2C2A', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.55rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.25rem 0.5rem', display: 'inline-block', marginBottom: '0.75rem'}}>
                {timeInfo.name}
              </span>
              <h3 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '1.4rem', color: '#2C2C2A', lineHeight: 1.3}} className="dark:text-[#F4F0E9]">{prayer.title}</h3>
              <p style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '0.85rem', color: '#B6B9B3', marginTop: '0.25rem'}}>{timeInfo.desc}</p>
            </div>
            {isCompleted && (
              <CheckCircle style={{width: '1.25rem', height: '1.25rem', color: '#4A6B65', flexShrink: 0}} />
            )}
          </div>

          {prayer.opening && (
            <div style={{marginBottom: '1.25rem', padding: '0.875rem', backgroundColor: '#F4F0E9', borderLeft: '2px solid #DECCB4'}} className="dark:bg-[rgba(255,255,255,0.04)]">
              <p style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontStyle: 'italic', fontSize: '0.9rem', color: '#6A6A6A', lineHeight: 1.7}} className="dark:text-[rgba(244,240,233,0.5)] line-clamp-3">
                {prayer.opening.substring(0, 150)}...
              </p>
            </div>
          )}

          <button
            onClick={onClick}
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