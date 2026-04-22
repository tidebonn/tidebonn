const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { Heart, Info, FileText, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export default function About() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const pages = await db.entities.ContentPage.filter({ slug: 'om-appen' });
      if (pages.length > 0) {
        setContent(pages[0]);
      }
    } catch (error) {
      console.log('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const defaultContent = `
### Om Areopagos

Areopagos er en frivillig, kristelig organisasjon og misjonsorganisasjon som arbeider for dialog, formidling av kristen tro, og for å møte mennesker der de står – både i møte med andre religioner, livssyn og trosretninger.

Organisasjonen arbeider med ulike trospraksis, inkludert tidebønn, som en vei til fordypning i kristen spiritualitet. Areopagos holder regelmessige tidebønnsamlinger i Trefoldighetskirken i Oslo, og ønsker å være en inspirasjonshub for mindre grupper som vil praktisere tidebønn.

**Areopagos arbeider ut fra følgende visjon:**
* Å gjøre tidebønn tilgjengelig for moderne mennesker
* Å løfte fram en liturgisk og kontemplativ bønnepraksis som har røtter i 1600 år av kristen tradisjon
* Å inspirere fellesskap og enkeltpersoner til å etablere faste tidebønner i sitt daglige liv
* Å møte søk etter stillhet og meningsfullhet med en bønnetradisjon som bærer og transformerer

Les mer på [areopagos.no](https://areopagos.no)

### Bakgrunn for appen

Tidebønn-appen er utviklet for å gjøre tidebønn tilgjengelig og praktisk for alle – enten du vil be alene eller i fellesskap. Appen inneholder bønnene fra «Tidebønner gjennom året» (Luther forlag, 2021), en bok som har vokst frem gjennom 20 år av daglig bruk ved Ekumeniska Kommuniteten i Bjärka-Säby i Sverige.

#### Hvordan bruke appen

Velg bønneserie: Appen inneholder ulike bønneserier som du kan velge mellom, avhengig av dine preferanser og tid.

Følg dine bønner: Appen veileder deg gjennom hver bønn, dag for dag. Du kan markere når du har bedt en bønn, og følge din progresjon gjennom serien.

Anpass: Du kan justere tema (lyst/mørkt), velge hvor mange bønner per dag som passer deg, og velge om du vil følge dagens dato eller din egen progresjon.

#### Bønneseriene

Alle bønneseriene bygger på en 4-ukers syklus med daglige bønner. I løpet av disse fire ukene blir alle Bibelens 150 salmer bedt, slik at du får ta del i Salmenes helhet over tid.

Hver bønneserie inneholder fire daglige bønner:
* **Morgenbønn (Laudes)** – For dagen som begynner
* **Bønn i løpet av dagen** – På dagtid
* **Kveldsbønn (Vesper)** – Ved solnedgang
* **Bønn før natten (Kompletorium)** – Før du legger deg

Antifonene i appen er basert på nytestamentlige tekster, slik at hver salme leses i lys av evangeliet.

#### Funksjoner

Personlig progresjon: Appen husker hvor du er i bønneserien, og viser din daglige progresjon.

Veksellesning: Teksten markeres tydelig slik at du kan se hvem som leser hvilket vers – ideelt for å be sammen med andre.

Visuelle hjelpemidler: Spesialtegn som † (for korsets tegn), * (for pustepause) og L/A (for leder/alle) veileder deg gjennom bønnen.

Tema og innstillinger: Valg av lystheme eller mørketheme, og mulighet til å tilpasse bønnens lengde til din tid.
  `;

  const specialChars = [
    { symbol: 'I', description: 'Tekst som leses av Gruppe I i veksellesning' },
    { symbol: 'II', description: 'Tekst som leses av Gruppe II i veksellesning' },
    { symbol: 'L', description: 'Tekst som leses av Leder' },
    { symbol: 'A', description: 'Tekst som leses av Alle sammen' },
    { symbol: '*', description: 'Deler versene – gjør en pause her, som ikke må være for kort' },
    { symbol: '†', description: 'Deler lange setninger – gjør en kortere her' },
    { symbol: '+', description: 'Her er det mulig å korse seg' },
  ];

  const versionHistory = [
    { version: '1.0.0', date: '2026', changes: 'Første versjon lansert' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#6B9EA0] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <h1 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '2rem', paddingBottom: '0.75rem', marginBottom: '2rem'}} className="text-[#2C2C2A] dark:text-[#F4F0E9] border-b border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
          {content?.title || 'Om appen'}
        </h1>

        {/* Main Content */}
        <div className="max-w-none mb-12">
          <ReactMarkdown
            components={{
              h3: ({node, ...props}) => <h3 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '1.5rem', paddingBottom: '0.5rem', marginTop: '2rem', marginBottom: '1rem'}} className="text-[#2C2C2A] dark:text-[#F4F0E9] border-b border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]" {...props} />,
              h4: ({node, ...props}) => <h4 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 400, fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.75rem'}} className="text-[#2C2C2A] dark:text-[#F4F0E9]" {...props} />,
              p: ({node, ...props}) => <p style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, lineHeight: 1.85, marginBottom: '1rem'}} className="text-[#4A4A4A] dark:text-[#E8E0D8]" {...props} />,
              ul: ({node, ...props}) => <ul style={{marginBottom: '1rem', paddingLeft: '1.25rem', listStyle: 'none'}} {...props} />,
              li: ({node, ...props}) => <li style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, lineHeight: 1.85, paddingLeft: '0.75rem', marginBottom: '0.5rem'}} className="text-[#4A4A4A] dark:text-[#E8E0D8] border-l-2 border-[#DECCB4] dark:border-[rgba(244,240,233,0.25)]" {...props} />,
              strong: ({node, ...props}) => <strong style={{fontWeight: 600}} className="text-[#2C2C2A] dark:text-[#F4F0E9]" {...props} />,
              a: ({node, ...props}) => <a style={{color: '#BD7B59'}} className="hover:underline" {...props} />,
            }}
          >
            {content?.content || defaultContent}
          </ReactMarkdown>
        </div>

        {/* Special Characters */}
        <div className="mb-8 bg-white dark:bg-[rgba(255,255,255,0.04)] p-6 border border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
          <h2 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '1.3rem', paddingBottom: '0.5rem', marginBottom: '1rem'}} className="text-[#2C2C2A] dark:text-[#F4F0E9] flex items-center gap-2 border-b border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
            <Info className="w-5 h-5" style={{color: '#BD7B59'}} />
            Spesialtegn i teksten
          </h2>
          <div>
            {specialChars.map((item, index) => (
              <div
                key={index}
                className={`flex items-start gap-4 py-3 ${index < specialChars.length - 1 ? 'border-b border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]' : ''}`}
              >
                <span className="dark:bg-[#3A4A48] dark:text-[#E8E0D8]" style={{flexShrink: 0, width: '2.5rem', height: '2.5rem', backgroundColor: '#CFD9D6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, color: '#2C2C2A', fontSize: '0.8rem'}}>
                  {item.symbol}
                </span>
                <p style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, lineHeight: 1.7, paddingTop: '0.375rem'}} className="text-[#4A4A4A] dark:text-[#E8E0D8]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Version History */}
        <div className="mb-8 bg-white dark:bg-[rgba(255,255,255,0.04)] p-6 border border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
          <h2 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '1.3rem', paddingBottom: '0.5rem', marginBottom: '1rem'}} className="text-[#2C2C2A] dark:text-[#F4F0E9] flex items-center gap-2 border-b border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
            <FileText className="w-5 h-5" style={{color: '#BD7B59'}} />
            Versjonslogg
          </h2>
          <div>
            {versionHistory.map((item, index) => (
              <div
                key={index}
                className={`flex items-start gap-4 py-3 ${index < versionHistory.length - 1 ? 'border-b border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]' : ''}`}
              >
                <span style={{flexShrink: 0, padding: '0.25rem 0.625rem', backgroundColor: '#B6B9B3', color: '#F4F0E9', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.65rem', letterSpacing: '0.08em'}}>
                  v{item.version}
                </span>
                <div>
                  <p style={{fontSize: '0.8rem', color: '#B6B9B3', fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.04em'}}>{item.date}</p>
                  <p style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, color: '#4A4A4A'}} className="dark:text-[rgba(244,240,233,0.75)]">{item.changes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </motion.div>
    </div>
  );
}