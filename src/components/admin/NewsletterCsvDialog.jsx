import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Bekreftelse etter nyhetsbrev-nedlasting — hindrer at adresser
// markeres som behandlet hvis de aldri faktisk legges inn.
export default function NewsletterCsvDialog({ pending, onClose, onConfirm }) {
  return (
    <Dialog open={!!pending} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md bg-white dark:bg-[#1A1917]">
        <DialogHeader>
          <DialogTitle className="text-[#2C2C2A] dark:text-[#F4F0E9]">Bekreft behandling</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-[#4A4A4A] dark:text-gray-300">
          <p>Fila er lastet ned med:</p>
          <ul className="list-disc list-outside pl-5 space-y-1">
            <li><strong>{pending?.addCount ?? 0}</strong> å legge til i maillista</li>
            <li><strong>{pending?.removeCount ?? 0}</strong> å melde av</li>
          </ul>
          <p>
            Når du har lagt adressene inn (og fjernet de avmeldte) i mailsystemet,
            trykk <strong>Marker som behandlet</strong>. Da dukker de ikke opp igjen
            neste gang.
          </p>
          <p className="text-[#6A6A6A] dark:text-gray-400">
            Trykk <strong>Ikke ennå</strong> hvis du ikke rakk det — da beholdes de
            som ventende og kommer med i neste nedlasting.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Ikke ennå
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-[#4A6B65] hover:bg-[#3a5550] dark:bg-[#BD7B59] dark:hover:bg-[#A56347] text-[#F4F0E9]"
          >
            Marker som behandlet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
