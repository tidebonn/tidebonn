import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Bold, Italic, Underline as UnderlineIcon, Heading2, Heading3,
  List, ListOrdered, Quote, Link as LinkIcon, Image as ImageIcon,
  Youtube as YoutubeIcon, Loader2, Save, Undo2, Redo2, Eraser,
} from 'lucide-react';

// Helper: hent video-ID fra URL eller bruk direkte hvis 11-tegns ID
function extractYouTubeId(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

// Liten toolbar-knapp
function TBtn({ active, onClick, title, disabled, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`inline-flex items-center justify-center w-8 h-8 rounded border transition-colors ${
        active
          ? 'bg-[#4A6B65] text-[#F4F0E9] border-[#4A6B65] dark:bg-[#BD7B59] dark:border-[#BD7B59]'
          : 'bg-transparent text-[#4A4A4A] border-[#DECCB4] hover:bg-[#F5F0EB]'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

export default function ContentPageEditor({ page, onChange, onSave, onCancel, saving }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Image.configure({
        HTMLAttributes: { class: 'content-image' },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        width: 640,
        height: 360,
        HTMLAttributes: { class: 'content-youtube' },
      }),
    ],
    content: page.content || '',
    onUpdate: ({ editor }) => {
      onChange({ ...page, content: editor.getHTML() });
    },
    editorProps: {
      attributes: {
        class: 'content-body prose-editor min-h-[400px] focus:outline-none',
      },
    },
  });

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes('link').href;
    const url = window.prompt('Lenke (URL):', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const setImage = () => {
    const url = window.prompt('Bilde-URL (full lenke):');
    if (!url) return;
    const alt = window.prompt('Beskrivelse av bildet (for skjermlesere):', '') || '';
    editor.chain().focus().setImage({ src: url, alt }).run();
  };

  const setYouTube = () => {
    const input = window.prompt('YouTube-URL eller video-ID:');
    if (!input) return;
    const id = extractYouTubeId(input);
    if (!id) {
      window.alert('Fant ikke gyldig YouTube-ID i det du limte inn.');
      return;
    }
    editor.commands.setYoutubeVideo({ src: `https://www.youtube.com/watch?v=${id}` });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 py-4 gap-4">
      <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-[120px,1fr] gap-3 sm:gap-4">
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
        <div className="sm:col-span-2">
          <Label>Undertittel</Label>
          <Input
            value={page.subtitle || ''}
            onChange={(e) => onChange({ ...page, subtitle: e.target.value })}
            placeholder="Kort beskrivelse som vises på «Info»-landingen"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-1 pb-2 border-b border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
        <TBtn title="Fet (Cmd+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Kursiv (Cmd+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Understrek (Cmd+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-3.5 h-3.5" />
        </TBtn>
        <div className="w-px h-6 bg-[#DECCB4] mx-1" />
        <TBtn title="Stor overskrift" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Mindre overskrift" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="w-3.5 h-3.5" />
        </TBtn>
        <div className="w-px h-6 bg-[#DECCB4] mx-1" />
        <TBtn title="Punktliste" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Nummerert liste" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Sitat" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="w-3.5 h-3.5" />
        </TBtn>
        <div className="w-px h-6 bg-[#DECCB4] mx-1" />
        <TBtn title="Lenke" active={editor.isActive('link')} onClick={setLink}>
          <LinkIcon className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Bilde" onClick={setImage}>
          <ImageIcon className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="YouTube" onClick={setYouTube}>
          <YoutubeIcon className="w-3.5 h-3.5" />
        </TBtn>
        <div className="w-px h-6 bg-[#DECCB4] mx-1" />
        <TBtn title="Fjern formatering" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          <Eraser className="w-3.5 h-3.5" />
        </TBtn>
        <div className="flex-1" />
        <TBtn title="Angre (Cmd+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Gjør om" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="w-3.5 h-3.5" />
        </TBtn>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      <div className="flex-shrink-0 flex justify-end gap-2 pt-3 border-t border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
        <Button variant="outline" onClick={onCancel}>Avbryt</Button>
        <Button
          onClick={onSave}
          disabled={saving}
          className="bg-[#4A6B65] hover:bg-[#3a5550] dark:bg-[#BD7B59] dark:hover:bg-[#A56347] text-[#F4F0E9]"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Lagre
        </Button>
      </div>
    </div>
  );
}
