import React, { useEffect, useState } from 'react';
import { Download, Share, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Tilbyr installasjon av app som PWA.
 *
 * - Android/Chrome/Edge: native install-prompt via beforeinstallprompt
 * - iOS Safari: ingen API; viser instruks om "Del → Legg til hjem-skjerm"
 * - Allerede installert (standalone-modus): skjuler hele seksjonen
 */
export default function InstallAppSection() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    // Sjekk om allerede installert som PWA (standalone-modus)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalled(standalone);

    // Detekter iOS (ingen beforeinstallprompt-API)
    const ua = window.navigator.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    setIsIos(ios);

    // Fang opp install-prompt fra Chrome/Edge/Android
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Etter installasjon — skjul knappen
    const installed = () => setIsInstalled(true);
    window.addEventListener('appinstalled', installed);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) return null;

  return (
    <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#2C2C2A] dark:text-[#F4F0E9]">
          <Smartphone className="w-5 h-5 text-[#4A6B65] dark:text-[#BD7B59]" />
          Installer app
        </CardTitle>
        <CardDescription>
          Få Tidebønn som egen app på telefonen eller datamaskinen. Den
          virker også uten internett etter første gangs bruk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Android / Chrome / Edge: native prompt */}
        {deferredPrompt && (
          <Button
            onClick={triggerInstall}
            className="bg-[#4A6B65] hover:bg-[#3a5550] dark:bg-[#BD7B59] dark:hover:bg-[#A56347] text-[#F4F0E9]"
          >
            <Download className="w-4 h-4 mr-2" />
            Installer app
          </Button>
        )}

        {/* iOS Safari: vis instruks */}
        {isIos && (
          <>
            <Button
              variant="outline"
              onClick={() => setShowIosHelp((v) => !v)}
              className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.2)]"
            >
              <Share className="w-4 h-4 mr-2" />
              Slik installerer du på iPhone/iPad
            </Button>
            {showIosHelp && (
              <ol className="list-decimal list-outside pl-5 space-y-1 text-sm text-[#4A4A4A] dark:text-gray-300 mt-2">
                <li>Trykk på <strong>Del-knappen</strong> nederst i Safari (firkant med pil opp).</li>
                <li>Bla nedover i menyen til <strong>«Legg til på Hjem-skjerm»</strong>.</li>
                <li>Trykk <strong>Legg til</strong>. Tidebønn-ikonet vises nå på hjem-skjermen.</li>
              </ol>
            )}
          </>
        )}

        {/* Hverken Android-prompt eller iOS — generell hjelp */}
        {!deferredPrompt && !isIos && (
          <p className="text-sm text-[#6A6A6A] dark:text-gray-400">
            Bruker du Chrome eller Edge, finner du <em>«Installer
            Tidebønn»</em> i nettleserens meny (tre prikker øverst til
            høyre).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
