import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Trash2, Plus } from 'lucide-react';

const MARKERS = ['', 'A', 'L', 'L+A', 'I', 'II'];
const MARKER_NONE = '__none__';
const P_CLASSES = [
  { value: 'strofe', label: 'Strofe' },
  { value: 'strofe-nomargin', label: 'Strofe (no-margin)' },
  { value: 'veksellesning', label: 'Veksellesning' },
  { value: 'antifontekst', label: 'Antifon' },
  { value: 'info', label: 'Info' },
];

// Strip most HTML but keep <br>, <b>, <i>, <u> tags
function stripToAllowedHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(b|strong)>/gi, '\x01b\x01') // temp markers
    .replace(/<\/?(i|em)>/gi, '\x01i\x01')
    .replace(/<\/?u>/gi, '\x01u\x01')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\x01b\x01/g, '<b>')
    .replace(/\x01i\x01/g, '<i>')
    .replace(/\x01u\x01/g, '<u>');
}

// Convert block.text (with <br>, <b>, <i>, <u>) to display HTML for contentEditable
function textToDisplay(text) {
  return (text || '').replace(/\n/g, '<br>');
}

// Convert contentEditable innerHTML back to clean storage text
function displayToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<(b|strong)>/gi, '\x01B\x01')
    .replace(/<\/(b|strong)>/gi, '\x01/B\x01')
    .replace(/<(i|em)>/gi, '\x01I\x01')
    .replace(/<\/(i|em)>/gi, '\x01/I\x01')
    .replace(/<u>/gi, '\x01U\x01')
    .replace(/<\/u>/gi, '\x01/U\x01')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\x01B\x01/g, '<b>')
    .replace(/\x01\/B\x01/g, '</b>')
    .replace(/\x01I\x01/g, '<i>')
    .replace(/\x01\/I\x01/g, '</i>')
    .replace(/\x01U\x01/g, '<u>')
    .replace(/\x01\/U\x01/g, '</u>');
}

export default function PrayerLineBlock({ block, onChange, onDelete, onAddLine, onAddHeading, dragHandleProps }) {
  const editorRef = useRef(null);
  const isFocusedRef = useRef(false);

  // Sync block.text -> contentEditable only when not focused (avoid cursor jump / format clobber)
  useEffect(() => {
    const el = editorRef.current;
    if (!el || isFocusedRef.current) return;
    const expected = textToDisplay(block.text);
    if (el.innerHTML !== expected) {
      el.innerHTML = expected;
    }
  }, [block.text]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange({ ...block, text: displayToText(editorRef.current.innerHTML) });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertHTML', false, '<br>');
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const plain = e.clipboardData.getData('text/plain');
    const html = e.clipboardData.getData('text/html');
    const cleaned = plain
      ? plain.replace(/\n/g, '<br>')
      : stripToAllowedHtml(html).replace(/\n/g, '<br>');
    document.execCommand('insertHTML', false, cleaned);
  };

  return (
    <div className="group rounded-lg border border-[#E8E0D8] dark:border-gray-700 bg-white dark:bg-[#222] hover:border-[#6B9EA0]/40 transition-colors">
      {/* Main row: drag | marker-select | divider | text | divider | reference | delete */}
      <div className="flex items-end gap-2 p-2">
        {/* Drag handle */}
        <div {...dragHandleProps} className="cursor-grab text-[#C8C0B8] hover:text-[#6B9EA0] flex-shrink-0">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Marker selector */}
        <div className="flex-shrink-0 w-20">
          <Select
            value={block.marker === '' || !block.marker ? MARKER_NONE : block.marker}
            onValueChange={(v) => onChange({ ...block, marker: v === MARKER_NONE ? '' : v })}
          >
            <SelectTrigger className="h-7 text-xs border-[#E8E0D8] dark:border-gray-700">
              <SelectValue placeholder="–" />
            </SelectTrigger>
            <SelectContent>
              {MARKERS.map((m) => (
                <SelectItem key={m || MARKER_NONE} value={m || MARKER_NONE} className="text-xs">
                  {m === '' ? '–' : m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Paragraph class selector */}
        <div className="flex-shrink-0 w-32">
          <Select
            value={(block.paragraphClass === 'veksellesning-gruppe') ? 'veksellesning' : (block.paragraphClass || 'strofe')}
            onValueChange={(v) => {
              const resolved = (v === 'veksellesning' && ['I', 'II'].includes(block.marker))
                ? 'veksellesning-gruppe'
                : v;
              onChange({ ...block, paragraphClass: resolved });
            }}
          >
            <SelectTrigger className="h-7 text-xs border-[#E8E0D8] dark:border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {P_CLASSES.map((c) => (
                <SelectItem key={c.value} value={c.value} className="text-xs">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-px bg-[#E8E0D8] dark:bg-gray-700 self-stretch flex-shrink-0" />

        {/* Text editor - grows */}
        <div className="flex-1 min-w-0">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onFocus={() => { isFocusedRef.current = true; }}
            onBlur={() => { isFocusedRef.current = false; }}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            data-placeholder="Tekstinnhold..."
            className="min-h-[2rem] text-sm p-1 rounded border border-[#E8E0D8] dark:border-gray-700 text-[#2C2C2A] dark:text-gray-100 focus:border-[#6B9EA0]/40 focus:outline-none leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
            style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '1rem' }}
          />
        </div>

        <div className="w-px bg-[#E8E0D8] dark:bg-gray-700 self-stretch flex-shrink-0" />

        {/* Reference - fixed width */}
        <div className="flex-shrink-0 w-36">
          <Input
            value={block.reference || ''}
            onChange={(e) => onChange({ ...block, reference: e.target.value })}
            placeholder="f.eks. Sal 23,1"
            className="text-xs h-7 border-[#E8E0D8] dark:border-gray-700 text-[#6A6A6A] dark:text-gray-300"
          />
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="text-[#C8C0B8] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Add after row */}
      <div className="flex gap-1 px-2 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onAddLine} className="flex items-center gap-1 text-xs text-[#9A9A9A] hover:text-[#6B9EA0] transition-colors">
          <Plus className="w-3 h-3" /> Linje her
        </button>
        <span className="text-[#D0C8C0]">|</span>
        <button type="button" onClick={onAddHeading} className="flex items-center gap-1 text-xs text-[#9A9A9A] hover:text-[#C8602A] transition-colors">
          <Plus className="w-3 h-3" /> Overskrift her
        </button>
      </div>
    </div>
  );
}