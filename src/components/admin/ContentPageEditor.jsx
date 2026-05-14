import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Image as ImageIcon, Youtube, Heading2, Heading3, Eye, Edit3, Loader2, Save } from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';

// Helper: hent video-ID fra URL eller la den stå hvis det allerede er en 11-tegns ID.
function extractYouTubeId(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

export default function ContentPageEditor({ page, onChange, onSave, onCancel, saving }) {
  const [previewMode, setPreviewMode] = useState(false);
  const textareaRef = useRef(null);

  // Sett inn tekst på cursor-posisjon (eller på slutten hvis ingen markering)
  function insertAtCursor(snippet) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? page.content?.length ?? 0;
    const end = ta.selectionEnd ?? start;
    const before = (page.content || '').slice(0, start);
    const after = (page.content || '').slice(end);
    const newContent = `${before}${snippet}${after}`;
    onChange({ ...page, content: newContent });
    // Sett cursor etter innsatt tekst
    requestAnimationFrame(() => {
      ta.focus();
      const cursorPos = start + snippet.length;
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }

  function handleInsertImage() {
    const url = window.prompt('Bilde-URL (full lenke):');
    if (!url) return;
    const alt = window.prompt('Beskrivelse av bildet (for skjermlesere):', '') || '';
    insertAtCursor(`\n\n![${alt}](${url})\n\n`);
  }

  function handleInsertYouTube() {
    const input = window.prompt('YouTube-URL eller video-ID:');
    if (!input) return;
    const id = extractYouTubeId(input);
    if (!id) {
      window.alert('Fant ikke gyldig YouTube-ID i det du limte inn.');
      return;
    }
    insertAtCursor(`\n\n\`\`\`youtube\n${id}\n\`\`\`\n\n`);
  }

  function handleInsertHeading(level) {
    const prefix = '#'.repeat(level);
    insertAtCursor(`\n\n${prefix} Overskrift\n\n`);
  }

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-[120px,1fr] gap-3 sm:gap-4">
        <div>
          <Label>Slug</Label>
          <Input
            value={page.slug || ''}
            onChange={(e) => onChange({ ...page, slug: e.target.value })}
            placeholder="om-tidebonn"
            disabled={!!page.id}
            className="text-sm"
          />
        </div>
        <div>
          <Label>Tittel</Label>
          <Input
            value={page.title || ''}
            onChange={(e) => onChange({ ...page, title: e.target.value })}
            placeholder="Om tidebønn"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
        <button
          type="button"
          onClick={() => handleInsertHeading(2)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-[#DECCB4] hover:bg-[#F5F0EB] dark:hover:bg-[#1A1917] rounded"
          title="Sett inn stor overskrift"
        >
          <Heading2 className="w-3.5 h-3.5" /> H2
        </button>
        <button
          type="button"
          onClick={() => handleInsertHeading(3)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-[#DECCB4] hover:bg-[#F5F0EB] dark:hover:bg-[#1A1917] rounded"
          title="Sett inn mindre overskrift"
        >
          <Heading3 className="w-3.5 h-3.5" /> H3
        </button>
        <button
          type="button"
          onClick={handleInsertImage}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-[#DECCB4] hover:bg-[#F5F0EB] dark:hover:bg-[#1A1917] rounded"
          title="Sett inn bilde fra URL"
        >
          <ImageIcon className="w-3.5 h-3.5" /> Bilde
        </button>
        <button
          type="button"
          onClick={handleInsertYouTube}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-[#DECCB4] hover:bg-[#F5F0EB] dark:hover:bg-[#1A1917] rounded"
          title="Embed en YouTube-video"
        >
          <Youtube className="w-3.5 h-3.5" /> YouTube
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setPreviewMode((v) => !v)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-[#DECCB4] hover:bg-[#F5F0EB] dark:hover:bg-[#1A1917] rounded"
        >
          {previewMode ? <><Edit3 className="w-3.5 h-3.5" /> Rediger</> : <><Eye className="w-3.5 h-3.5" /> Forhåndsvis</>}
        </button>
      </div>

      {/* Editor eller forhåndsvisning */}
      <div>
        <Label>Innhold</Label>
        {previewMode ? (
          <div className="mt-1 border border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] p-4 min-h-[400px] bg-[#FAF8F3] dark:bg-[#1A1917]">
            <MarkdownRenderer content={page.content || ''} />
          </div>
        ) : (
          <Textarea
            ref={textareaRef}
            rows={20}
            value={page.content || ''}
            onChange={(e) => onChange({ ...page, content: e.target.value })}
            placeholder={`## Overskrift\n\nVanlig avsnitt med **fet tekst** eller [lenke](https://eksempel.no).\n\n- Punkt i liste\n- Et til\n\n![Bildebeskrivelse](https://eksempel.no/bilde.jpg)\n\n\`\`\`youtube\nkrSBDzysVO8\n\`\`\``}
            className="font-mono text-sm mt-1"
          />
        )}
        <p className="mt-2 text-xs text-[#6A6A6A] dark:text-gray-400">
          Markdown: <code>**fet**</code>, <code>*kursiv*</code>, <code>## H2</code>, <code>- liste</code>, <code>[lenke](url)</code>.
          Bilde og YouTube settes inn via knappene over.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
        <Button variant="outline" onClick={onCancel}>Avbryt</Button>
        <Button
          onClick={onSave}
          disabled={saving}
          className="bg-[#4A6B65] hover:bg-[#3a5550] text-[#F4F0E9]"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Lagre
        </Button>
      </div>
    </div>
  );
}
