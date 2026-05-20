import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import PrayerLineBlock from './PrayerLineBlock';
import PrayerHeadingBlock from './PrayerHeadingBlock';
import EditorToolbar from './EditorToolbar';
import { htmlToBlocks, blocksToHtml, pasteTextToBlocks } from './prayerBlockUtils';
import PrayerContent from '../prayer/PrayerContent';

/**
 * Generates preview HTML with data-block-id on ALL block elements.
 * These IDs are NEVER saved to the database — only used for scroll sync.
 */
function blocksToPreviewHtml(blocks) {
  return blocks
    .map((block) => {
      if (block.type === 'heading') {
        const tag = block.level || 'h2';
        const ref = block.reference || '';
        return `<header class="header-henvisning" data-block-id="${block.id}"><${tag}>${block.text}</${tag}><h3 class="henvisning">${ref}</h3></header>`;
      }
      if (block.type === 'line') {
        const markerHtml = `<div class="markør">${block.marker || ''}</div>`;
        const baseClass = block.paragraphClass || 'strofe';
        const pClass = (baseClass === 'veksellesning' && ['I', 'II'].includes(block.marker))
          ? 'veksellesning-gruppe'
          : baseClass;
        const textContent = (block.text || '').replace(/\n/g, '<br>');
        const textHtml = `<div class="tekst">${textContent ? `<p class="${pClass}">${textContent}</p>` : ''}</div>`;
        const refHtml = block.reference ? `<h3 class="henvisning">${block.reference}</h3>` : '';
        return `<div class="linje" data-block-id="${block.id}">${markerHtml}${textHtml}${refHtml}</div>`;
      }
      return '';
    })
    .join('\n');
}

let blockCounter = 0;
const newId = (prefix) => `${prefix}-${++blockCounter}-${Date.now()}`;

export default function PrayerEditor({ value, onChange, onFullscreenChange, onSave, onSaveQuiet, onCancel, prayer }) {
  const [blocks, setBlocks] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [focusedBlockIndex, setFocusedBlockIndex] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [previewHtml, setPreviewHtml] = useState('');
  const previewRef = useRef(null);
  const editorRef = useRef(null);
  // Stores the block-id of the topmost visible block for two-way scroll sync
  const topBlockIdRef = useRef(null);
  // Tracks editor scroll ratio (0–1) as a fallback when no block-id is matched
  const editorScrollRatioRef = useRef(0);

  const toggleFullscreen = (val) => {
    // Capture current position before layout changes
    if (!showPreview && editorRef.current) {
      topBlockIdRef.current = getTopVisibleEditorBlockId(editorRef.current);
      const el = editorRef.current;
      editorScrollRatioRef.current = el.scrollHeight > el.clientHeight
        ? el.scrollTop / (el.scrollHeight - el.clientHeight)
        : 0;
    } else if (showPreview && previewRef.current) {
      topBlockIdRef.current = getTopVisibleBlockId(previewRef.current);
      const el = previewRef.current;
      editorScrollRatioRef.current = el.scrollHeight > el.clientHeight
        ? el.scrollTop / (el.scrollHeight - el.clientHeight)
        : 0;
    }

    const next = val !== undefined ? val : (f => !f);
    setFullscreen(next);
    if (onFullscreenChange) onFullscreenChange(typeof next === 'function' ? next(fullscreen) : next);

    // Restore scroll after layout settles — use multiple rAF to let full layout reflow happen
    const restore = () => {
      if (!showPreview && editorRef.current) {
        if (topBlockIdRef.current) {
          const targetEl = editorRef.current.querySelector(`[data-editor-block-id="${topBlockIdRef.current}"]`);
          if (targetEl) { scrollContainerToEl(editorRef.current, targetEl); return; }
        }
        // Fallback: restore by ratio
        const el = editorRef.current;
        el.scrollTop = editorScrollRatioRef.current * (el.scrollHeight - el.clientHeight);
      } else if (showPreview && previewRef.current) {
        if (topBlockIdRef.current) {
          const targetEl = previewRef.current.querySelector(`[data-block-id="${topBlockIdRef.current}"]`);
          if (targetEl) { scrollContainerToEl(previewRef.current, targetEl); return; }
        }
        const el = previewRef.current;
        el.scrollTop = editorScrollRatioRef.current * (el.scrollHeight - el.clientHeight);
      }
    };

    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(restore)));
  };

  // Parse existing HTML into blocks on first load or when value changes externally
  useEffect(() => {
    const parsed = htmlToBlocks(value);
    const initialBlocks = parsed.length > 0 ? parsed : [];
    setBlocks(initialBlocks);
    setPreviewHtml(blocksToPreviewHtml(initialBlocks));
  }, []); // Only on mount; we control onChange ourselves after that

  const emitChange = useCallback((newBlocks) => {
    const html = blocksToHtml(newBlocks);
    onChange(html);
    // Update preview HTML (with block-id markers for scroll sync)
    setPreviewHtml(blocksToPreviewHtml(newBlocks));
  }, [onChange]);

  // Find the topmost fully visible block-id in a scrollable container using [data-block-id]
  // Falls back to the first partially visible block if no fully visible block is found
  const getTopVisibleBlockId = (container) => {
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top;
    const containerBottom = containerRect.bottom;
    const allBlocks = container.querySelectorAll('[data-block-id]');
    let firstPartialId = null;
    for (const el of allBlocks) {
      const rect = el.getBoundingClientRect();
      if (rect.top >= containerTop && rect.bottom <= containerBottom) {
        return el.getAttribute('data-block-id');
      }
      if (rect.bottom > containerTop && firstPartialId === null) {
        firstPartialId = el.getAttribute('data-block-id');
      }
    }
    return firstPartialId;
  };

  // Find the topmost fully visible block-id in the editor using [data-editor-block-id]
  // Falls back to the first partially visible block if no fully visible block is found
  const getTopVisibleEditorBlockId = (container) => {
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top;
    const containerBottom = containerRect.bottom;
    const allBlocks = container.querySelectorAll('[data-editor-block-id]');
    let firstPartialId = null;
    for (const el of allBlocks) {
      const rect = el.getBoundingClientRect();
      if (rect.top >= containerTop && rect.bottom <= containerBottom) {
        return el.getAttribute('data-editor-block-id');
      }
      if (rect.bottom > containerTop && firstPartialId === null) {
        firstPartialId = el.getAttribute('data-editor-block-id');
      }
    }
    return firstPartialId;
  };

  const scrollContainerToEl = (container, el) => {
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    container.scrollTop += elRect.top - containerRect.top;
  };

  const handleTogglePreview = () => {
    if (!showPreview) {
      // Opening preview: save quietly, capture editor's top-visible block + scroll ratio
      if (onSaveQuiet) onSaveQuiet();
      if (editorRef.current) {
        topBlockIdRef.current = getTopVisibleEditorBlockId(editorRef.current);
        const el = editorRef.current;
        editorScrollRatioRef.current = el.scrollHeight > el.clientHeight
          ? el.scrollTop / (el.scrollHeight - el.clientHeight)
          : 0;
      }
      const html = blocksToPreviewHtml(blocks);
      setPreviewHtml(html);
      setShowPreview(true);
      // After preview renders, scroll it to match editor position
      const restorePreview = () => {
        if (!previewRef.current) return;
        if (topBlockIdRef.current) {
          const targetEl = previewRef.current.querySelector(`[data-block-id="${topBlockIdRef.current}"]`);
          if (targetEl) { scrollContainerToEl(previewRef.current, targetEl); return; }
        }
        const el = previewRef.current;
        el.scrollTop = editorScrollRatioRef.current * (el.scrollHeight - el.clientHeight);
      };
      requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(restorePreview)));
    } else {
      // Closing preview: just close, no save
      if (previewRef.current) {
        topBlockIdRef.current = getTopVisibleBlockId(previewRef.current);
        const el = previewRef.current;
        editorScrollRatioRef.current = el.scrollHeight > el.clientHeight
          ? el.scrollTop / (el.scrollHeight - el.clientHeight)
          : 0;
      }
      setShowPreview(false);
      // After editor renders, scroll it to match preview position
      const restoreEditor = () => {
        if (!editorRef.current) return;
        if (topBlockIdRef.current) {
          const targetEl = editorRef.current.querySelector(`[data-editor-block-id="${topBlockIdRef.current}"]`);
          if (targetEl) { scrollContainerToEl(editorRef.current, targetEl); return; }
        }
        const el = editorRef.current;
        el.scrollTop = editorScrollRatioRef.current * (el.scrollHeight - el.clientHeight);
      };
      requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(restoreEditor)));
    }
  };

  // Track the topmost visible block in the preview pane (for live scroll updates)
  const handlePreviewScroll = () => {
    if (!previewRef.current) return;
    const id = getTopVisibleBlockId(previewRef.current);
    if (id) topBlockIdRef.current = id;
  };

  const updateBlock = (index, updated) => {
    const newBlocks = blocks.map((b, i) => (i === index ? updated : b));
    setBlocks(newBlocks);
    emitChange(newBlocks);
  };

  const deleteBlock = (index) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);
    emitChange(newBlocks);
  };

  const addLineBlock = (afterIndex = null) => {
    const newBlock = { id: newId('line'), type: 'line', marker: '', text: '', paragraphClass: 'strofe', reference: '' };
    const insertAt = afterIndex !== null ? afterIndex + 1 : blocks.length;
    const newBlocks = [...blocks.slice(0, insertAt), newBlock, ...blocks.slice(insertAt)];
    setBlocks(newBlocks);
    emitChange(newBlocks);
  };

  const addHeadingBlock = (afterIndex = null) => {
    const newBlock = { id: newId('heading'), type: 'heading', level: 'h2', text: '', reference: '' };
    const insertAt = afterIndex !== null ? afterIndex + 1 : blocks.length;
    const newBlocks = [...blocks.slice(0, insertAt), newBlock, ...blocks.slice(insertAt)];
    setBlocks(newBlocks);
    emitChange(newBlocks);
  };

  const handleFormat = (cmd) => {
    document.execCommand(cmd, false, null);
  };

  const handleInsertChar = (char) => {
    document.execCommand('insertText', false, char);
  };

  const handlePaste = () => {
    navigator.clipboard.readText().then((text) => {
      if (!text.trim()) return;
      const newPastedBlocks = pasteTextToBlocks(text);
      const newBlocks = [...blocks, ...newPastedBlocks];
      setBlocks(newBlocks);
      emitChange(newBlocks);
    }).catch(() => {
      // Fallback: do nothing, user can paste manually
    });
  };

  // Drag and drop reordering
  const handleDragStart = (index) => setDragIndex(index);
  const handleDragOver = (e, index) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDrop = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(dragIndex, 1);
    newBlocks.splice(index, 0, moved);
    setBlocks(newBlocks);
    emitChange(newBlocks);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  return (
    <div className={fullscreen
      ? 'fixed inset-0 z-50 flex flex-col bg-white border-0'
      : 'border border-[#E8E0D8] rounded-lg overflow-hidden'
    }>
      <EditorToolbar
        onAddLine={addLineBlock}
        onAddHeading={addHeadingBlock}
        onPaste={handlePaste}
        blockCount={blocks.length}
        onFormat={handleFormat}
        onInsertChar={handleInsertChar}
        fullscreen={fullscreen}
        onToggleFullscreen={() => toggleFullscreen(f => !f)}
        onSave={onSave}
        onCancel={onCancel}
        showPreview={showPreview}
        onTogglePreview={handleTogglePreview}
      />

      {/* Main area: editor OR full-width preview */}
      <div className={`flex overflow-hidden bg-[#FAFAF8] ${fullscreen ? 'flex-1' : 'min-h-[300px] max-h-[600px]'}`}>

        {/* Block list — hidden when preview is active */}
        {!showPreview && (
          <div ref={editorRef} className="w-full overflow-y-auto p-3 space-y-2">
            {blocks.length === 0 && (
              <div className="text-center py-12 text-[#9A9A9A] text-sm">
                Ingen innhold ennå. Klikk «+ Overskrift» eller «+ Linje» for å starte.
              </div>
            )}
            {blocks.map((block, index) => {
              const isDragOver = dragOverIndex === index && dragIndex !== index;
              const dragHandleProps = {
                draggable: true,
                onDragStart: () => handleDragStart(index),
              };

              return (
                <div
                  key={block.id}
                  data-editor-block-id={block.id}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all ${isDragOver ? 'border-t-2 border-[#6B9EA0]' : ''} ${dragIndex === index ? 'opacity-40' : ''}`}
                >
                  {block.type === 'heading' ? (
                    <PrayerHeadingBlock
                      block={block}
                      onChange={(updated) => updateBlock(index, updated)}
                      onDelete={() => deleteBlock(index)}
                      onAddLine={() => addLineBlock(index)}
                      onAddHeading={() => addHeadingBlock(index)}
                      dragHandleProps={dragHandleProps}
                    />
                  ) : (
                    <PrayerLineBlock
                      block={block}
                      onChange={(updated) => updateBlock(index, updated)}
                      onDelete={() => deleteBlock(index)}
                      onAddLine={() => addLineBlock(index)}
                      onAddHeading={() => addHeadingBlock(index)}
                      dragHandleProps={dragHandleProps}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Full-width preview pane */}
        {showPreview && (
          <div
            ref={previewRef}
            onScroll={handlePreviewScroll}
            className="w-full overflow-y-auto p-4 bg-[#F5F0EB]"
          >
            <p className="text-xs text-[#9A9A9A] mb-3 font-medium uppercase tracking-wider">Forhåndsvisning</p>
            <PrayerContent
              prayer={{ ...(prayer || {}), free_text_content: previewHtml, content_type: 'freetext' }}
              readingMode="alone"
              onScrollComplete={() => {}}
              noInternalScroll
              showGroupMarkers={true}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-2 bg-[#F5F0EB] border-t border-[#E8E0D8]">
        {fullscreen ? (
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-7 gap-1 text-xs text-[#C8602A] border-[#E8E0D8]">
              Avbryt
            </Button>
            <Button type="button" size="sm" onClick={onSave} className="h-7 gap-1 text-xs bg-[#6B9EA0] hover:bg-[#4D8082] dark:bg-[#BD7B59] dark:hover:bg-[#A56347] text-white border-0">
              Lagre og avslutt
            </Button>
          </div>
        ) : (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={addLineBlock} className="h-7 gap-1 text-xs text-[#6A6A6A]">
              <Plus className="w-3 h-3" />
              Legg til linje
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={addHeadingBlock} className="h-7 gap-1 text-xs text-[#6A6A6A]">
              <Plus className="w-3 h-3" />
              Legg til overskrift
            </Button>
          </>
        )}
      </div>
    </div>
  );
}