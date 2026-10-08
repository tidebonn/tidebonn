import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PrayerContent from '@/components/prayer/PrayerContent';
import TextSizeButton from '@/components/prayer/TextSizeButton';
import { usePhoneViewport } from '@/hooks/usePhoneViewport';

// Felles bønnedialog for forsiden og Bønner-siden: merkelapp, tittel,
// I/II- og tekststørrelse-knapper, og bønneteksten (hentes ved åpning).
export default function PrayerDialog({ open, onOpenChange, prayer, badge, content, onRetryContent, prefs, scrollRef }) {
  const { isPhone, isPortrait } = usePhoneViewport();
  // Telefon i liggende = stor tekst-modus; headeren scroller da bort.
  const landscapePhone = isPhone && !isPortrait;
  const { showGroupMarkers, largeText, toggleGroupMarkers, toggleLargeText } = prefs;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-[#1A1917] border-[#D8D0C8] dark:border-gray-800">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <DialogHeader className={`text-left bg-white dark:bg-[#1A1917] ${landscapePhone ? 'pb-4' : 'sticky top-0 z-10 border-b border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] pb-4'}`}>
            <div>
              <Badge className="mb-2" style={{backgroundColor: '#CFD9D6', color: '#2C2C2A', border: 'none', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase'}}>
                {badge}
              </Badge>
              <div className="flex items-center gap-2">
                <DialogTitle
                  style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '1.5rem'}}
                  className="text-[#2C2C2A] dark:text-[#F4F0E9]"
                >
                  {prayer?.title}
                </DialogTitle>
                <button
                  onClick={toggleGroupMarkers}
                  className={`p-1.5 rounded transition-colors flex-shrink-0 text-xs font-medium ${
                    showGroupMarkers
                      ? 'bg-[#4A6B65]/10 text-[#4A6B65] hover:bg-[#4A6B65]/20 dark:bg-[#BD7B59]/15 dark:text-[#BD7B59] dark:hover:bg-[#BD7B59]/25'
                      : 'hover:bg-[#F4F0E9] dark:hover:bg-gray-800 text-[#B6B9B3]'
                  }`}
                  title={showGroupMarkers ? 'Skjul gruppemarkører' : 'Vis gruppemarkører'}
                >
                  I/II
                </button>
                <TextSizeButton isPhone={isPhone} active={largeText} onToggle={toggleLargeText} />
              </div>
            </div>
            <DialogDescription className="sr-only">
              Tekst og veiledning for bønnen. Bla nedover for å lese hele.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {content.loading && (
              <div className="space-y-3" aria-label="Henter bønneteksten">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}
            {content.error && !content.loading && prayer && (
              <div className="text-center py-6">
                <p className="text-sm text-[#6A6A6A] dark:text-gray-400 mb-3">Kunne ikke hente bønneteksten.</p>
                <Button variant="outline" size="sm" onClick={() => onRetryContent(prayer.id)} className="border-[#E8E0D8] dark:border-gray-700">
                  Prøv igjen
                </Button>
              </div>
            )}
            {prayer && content.data && content.id === prayer.id && (
              <PrayerContent
                prayer={{ ...prayer, free_text_content: content.data.free_text_content }}
                noInternalScroll
                showGroupMarkers={showGroupMarkers}
                largeText={!isPhone && largeText}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
