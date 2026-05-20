import React from 'react';
import { Heading2, AlignLeft, ClipboardPaste, Maximize2, Minimize2, Save, X, Search, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SPECIAL_CHARS = ['«', '»', '*', '†', '✢', '+', 'á', 'é', 'í', 'ó', 'ú', 'ý', 'ǽ', 'ǿ', 'ǻ'];

export default function EditorToolbar({ onAddLine, onAddHeading, onPaste, blockCount, onFormat, onInsertChar, fullscreen, onToggleFullscreen, onSave, onCancel, showPreview, onTogglePreview }) {
  return (
    <div className="bg-[#F5F0EB] border-b border-[#E8E0D8]">
      {/* Row 1: Formatting + block actions */}
      <div className="flex gap-1 p-2 flex-wrap items-center">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onFormat('bold'); }}
          className="h-7 w-7 flex items-center justify-center rounded border border-[#E8E0D8] bg-white hover:bg-[#E8E0D8] font-bold text-sm"
          title="Fet"
        >B</button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onFormat('italic'); }}
          className="h-7 w-7 flex items-center justify-center rounded border border-[#E8E0D8] bg-white hover:bg-[#E8E0D8] italic text-sm"
          title="Kursiv"
        >I</button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onFormat('underline'); }}
          className="h-7 w-7 flex items-center justify-center rounded border border-[#E8E0D8] bg-white hover:bg-[#E8E0D8] underline text-sm"
          title="Understreket"
        >U</button>

        <div className="w-px bg-[#E8E0D8] h-5 mx-1" />

        <Button type="button" variant="ghost" size="sm" onClick={onAddHeading} className="h-7 gap-1 text-xs">
          <Heading2 className="w-3.5 h-3.5" />
          + Overskrift
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onAddLine} className="h-7 gap-1 text-xs">
          <AlignLeft className="w-3.5 h-3.5" />
          + Linje
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onPaste} className="h-7 gap-1 text-xs">
          <ClipboardPaste className="w-3.5 h-3.5" />
          Lim inn
        </Button>

        <span className="ml-auto text-xs text-[#9A9A9A] self-center">{blockCount} blokker</span>
        <button
          type="button"
          onClick={onTogglePreview}
          className={`h-7 flex items-center gap-1 px-2 rounded border text-xs transition-colors ml-1 ${showPreview ? 'border-[#6B9EA0] bg-[#6B9EA0]/10 text-[#4D8082] dark:border-[#BD7B59] dark:bg-[#BD7B59]/10 dark:text-[#BD7B59]' : 'border-[#E8E0D8] bg-white hover:bg-[#E8E0D8] text-[#6A6A6A]'}`}
          title={showPreview ? 'Tilbake til editor' : 'Vis forhåndsvisning'}
        >
          {showPreview ? <PenLine className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{showPreview ? 'Rediger' : 'Forhåndsvis og lagre'}</span>
        </button>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="h-7 w-7 flex items-center justify-center rounded border border-[#E8E0D8] bg-white hover:bg-[#E8E0D8] ml-1"
          title={fullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm'}
        >
          {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Row 2: Special characters + Save/Cancel */}
      <div className="flex gap-1 px-2 pb-1 items-center flex-wrap">
        <span className="text-xs text-[#9A9A9A] mr-1">á†:</span>
        {SPECIAL_CHARS.map((char) => (
          <button
            key={char}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onInsertChar(char); }}
            className="w-7 h-7 flex items-center justify-center rounded border border-[#E8E0D8] bg-white hover:bg-[#F5F0EB] hover:border-[#6B9EA0] text-sm transition-colors"
            title={char}
          >
            {char}
          </button>
        ))}
        {!fullscreen && (
          <div className="ml-auto flex gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="h-7 flex items-center gap-1 px-2 rounded border border-[#E8E0D8] bg-white hover:bg-[#F5F0EB] text-[#C8602A] text-xs transition-colors"
              title="Avbryt"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Avbryt</span>
            </button>
            <button
              type="button"
              onClick={onSave}
              className="h-7 flex items-center gap-1 px-2 rounded border border-[#6B9EA0] bg-[#6B9EA0] hover:bg-[#4D8082] dark:bg-[#BD7B59] dark:border-[#BD7B59] dark:hover:bg-[#A56347] text-white text-xs transition-colors"
              title="Lagre og avslutt"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lagre og avslutt</span>
            </button>
          </div>
        )}
      </div>

      {/* Row 3: Column headers — mirrors block layout: drag(16) gap(8) marker(80) divider gap(8) text(flex) gap(8) divider gap(8) ref(160) gap(8) delete(16) */}
      <div className="flex items-center gap-2 px-2 pb-1.5 text-xs text-[#9A9A9A]">
        <span className="w-4 flex-shrink-0" />
        <span className="w-20 flex-shrink-0 text-center">Markør</span>
        <span className="w-px flex-shrink-0" />
        <span className="flex-1 text-center">Tekst</span>
        <span className="w-px flex-shrink-0" />
        <span className="w-36 flex-shrink-0 text-center">Henvisning</span>
        <span className="w-4 flex-shrink-0" />
      </div>
    </div>
  );
}