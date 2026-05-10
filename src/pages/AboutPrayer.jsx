import db from '@/api/client';

import React, { useState, useEffect } from 'react';

import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

const YouTubeEmbed = ({ videoId }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="mb-8 overflow-hidden bg-black/10 dark:bg-black/30"
  >
    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
      <iframe
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  </motion.div>
);

export default function AboutPrayer() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const pages = await db.entities.ContentPage.filter({ slug: 'om-tidebonn' });
      if (pages.length > 0) {
        setContent(pages[0].content);
      }
    } catch (error) {
      console.log('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const defaultContent = `
Tidebønn er en eldgammel og dypt forankret bønnetradisjon som strekker seg langt tilbake i tid. Den tilbyr et rammeverk for bønn som ikke er avhengig av egen formuleringsevne, men som bærer oss gjennom dager, uker og år. Som Peter Halldorf, forfatteren av forordet til «Tidebønner gjennom året», sier:

> «Her er det ikke lenger jeg som bærer bønnene; det er bønnene som bærer meg. Bønnen blir en hvileplass. Ikke en slagmark.»
> 
> — Peter Halldorf

## Hva er tidebønn?

Tidebønnen er et bønnerituale som følger faste tidspunkter gjennom dagen, med røtter i jødisk tradisjon og praktisert i kirken siden de første århundrene. Den bygger på salmer fra Bibelen, faste bønner, lesninger og andre tekster.

Den gir:
* **En hvile i lånte ord** – Du trenger ikke finne egne ord, men hviler i etablerte bønner bedt i århundrer
* **Bredere perspektiver** – Bønnen blir mindre navlebeskuende og åpner for alle sider ved livet
* **Tidløshet** – Uendret praksis siden de første århundrene, bedt over hele verden
* **Ro og stillhet** – Hjelper deg å sentrere sinnet, stilne tankene og løfte blikket

## Historie og røtter

Tidebønnens røtter går dypere enn kirken selv. Den samme praksis som Daniel fulgte når han ba tre ganger om dagen (Dan 6,14), praktiserte de første apostlene. Salmene var Jesu egen bønnebok, og han hentet bønneordene sine direkte fra Salmenes bok.

I Apostlenes gjerninger ser vi at apostlene dro opp til templet for å be ved de faste bønnetidene. Paulus oppfordret kristne til å "be uavbrutt" – en oppfordring som gradvis ble konkretisert gjennom utviklingen av faste bønnetider.

**Utviklingen av bønnetidene:**
* **200-tallet:** Morgenbønn (Laudes) og kveldsbønn (Vesper) kommer til
* **300-tallet:** Kompletorium (nattbønn) legges til
* **500-tallet:** Benedikt av Nursia etablerer full tidebønn-struktur i klosterreglene
* **I dag:** Bønner som har pågått siden 1600 år – og skal fortsette

I østkirken har tidebønnene alltid hatt sin naturlige plass i menigheten, ikke bare i klostervesen.

## Salmene – Jesu bønnebok

Salmenes bok er kjernen i tidebønnene. Jesus refererte til salmene som handlende om ham selv (Luk 24,44), og de første kristne forstod dem som profetier om Kristus. Hver salme lar oss høre enten ord til Kristus, ord om Kristus, eller Kristi egne ord.

Salmene rommer et bredt spekter av menneskelige erfaringer:
* **Glede og takksigelse**
* **Sorg, sinne og dødsangst**
* **Håp og tro**
* **Spørsmål og tvil**

De er usentimental og ofte ufiltrert – de viser mennesket både sterk i tro og fortvilt i nød. Det er denne ærlige menneskeligheten som gjør dem kraftige å be med.

## Hvordan be tidebønn

Tidebønn kan bes på mange måter. Det finnes ingen "riktig" måte:

* **Alene** – Lesing fra boken eller appen, stille eller høyt
* **I små fellesskap** – Med familie eller vennner
* **I større samlinger** – I kirker med sang og veksellesning

Du bestemmer selv hvor mange ganger per dag eller uke som passer deg. Det viktigste er at bønn bærer deg, ikke at du bærer bønn.

**Tips:**
* Start med én bønn per dag eller uke
* Du kan forkorte bønnen ved å velge færre salmer
* Husk at alt er lov – det trenger ikke være perfekt

## Hvor leser jeg mer?

Se "Om appen" for informasjon om bønneboken «Tidebønner gjennom året» og hvordan Areopagos arbeider med denne tradisjonen.
  `;

  return (
    <div className="min-h-screen bg-[#F4F0E9] dark:bg-[#2C2C2A] py-12">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <h1 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '2rem', paddingBottom: '0.75rem', marginBottom: '2rem'}} className="text-[#2C2C2A] dark:text-[#F4F0E9] border-b border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
            Om tidebønn
          </h1>

          {/* Main Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B9EA0]"></div>
            </div>
          ) : (
            <div className="max-w-none mb-12">
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h1 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '1.75rem', paddingBottom: '0.5rem', marginTop: '2rem', marginBottom: '1.5rem'}} className="text-[#2C2C2A] dark:text-[#F4F0E9] border-b border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]" {...props} />,
                  h2: ({node, ...props}) => <h2 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '1.5rem', paddingBottom: '0.5rem', marginTop: '2.5rem', marginBottom: '1.25rem'}} className="text-[#2C2C2A] dark:text-[#F4F0E9] border-b border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]" {...props} />,
                  h3: ({node, ...props}) => <h3 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 400, fontSize: '1.15rem', marginTop: '1.5rem', marginBottom: '0.75rem'}} className="text-[#2C2C2A] dark:text-[#F4F0E9]" {...props} />,
                  p: ({node, ...props}) => <p style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, lineHeight: 1.85, marginBottom: '1rem'}} className="text-[#4A4A4A] dark:text-[#E8E0D8]" {...props} />,
                  ul: ({node, ...props}) => <ul style={{marginBottom: '1rem', paddingLeft: '1.25rem', listStyle: 'none'}} {...props} />,
                  li: ({node, ...props}) => <li style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, lineHeight: 1.85, paddingLeft: '0.75rem', marginBottom: '0.5rem'}} className="text-[#4A4A4A] dark:text-[#E8E0D8] border-l-2 border-[#DECCB4] dark:border-[rgba(244,240,233,0.25)]" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote style={{borderLeft: '3px solid #BD7B59', paddingLeft: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', margin: '1.5rem 0', fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontStyle: 'italic'}} className="text-[#6A6A6A] bg-white dark:bg-[rgba(255,255,255,0.07)] dark:text-[#D8D0C8]" {...props} />,
                  strong: ({node, ...props}) => <strong style={{fontWeight: 600}} className="text-[#2C2C2A] dark:text-[#F4F0E9]" {...props} />,
                }}
              >
                {content || defaultContent}
              </ReactMarkdown>
            </div>
          )}

          {/* Videos Section */}
          <div className="bg-white dark:bg-[rgba(255,255,255,0.04)] p-8 border border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
            <h2 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '1.5rem', paddingBottom: '0.5rem', marginBottom: '2rem'}} className="text-[#2C2C2A] dark:text-[#F4F0E9] border-b border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
              Se videoer fra Areopagos
            </h2>
            
            <div className="space-y-12">
              <div>
                <h3 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 400, fontSize: '1.1rem', color: '#BD7B59', marginBottom: '1rem'}}>Hva er tidebønn?</h3>
                <YouTubeEmbed videoId="krSBDzysVO8" />
              </div>
              
              <div>
                <h3 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 400, fontSize: '1.1rem', color: '#BD7B59', marginBottom: '1rem'}}>Hvordan synges tidebønn?</h3>
                <YouTubeEmbed videoId="nuBayicg0Ac" />
              </div>
              
              <div>
                <h3 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 400, fontSize: '1.1rem', color: '#BD7B59', marginBottom: '1rem'}}>Jo synger gjennom salmodiene</h3>
                <YouTubeEmbed videoId="SRBmjQwPyho" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}