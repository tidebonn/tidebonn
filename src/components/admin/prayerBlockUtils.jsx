/**
 * Parse existing HTML (free_text_content) into an array of blocks.
 * Supports:
 *   <header class="header-henvisning"><h2>...</h2><h3 class="henvisning">...</h3></header>
 *   <h2>, <h3>, <h4> (bare headings)
 *   <div class="linje">...</div>
 */
export function htmlToBlocks(html) {
  if (!html) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = doc.getElementById('root');
  const blocks = [];
  let id = 0;

  const nextId = () => `block-${++id}-${Date.now()}`;

  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        blocks.push({ id: nextId(), type: 'line', marker: '', text, reference: '' });
      }
      return;
    }

    const el = node;
    const tag = el.tagName?.toLowerCase();

    // <header class="header-henvisning"> — canonical heading format
    if (tag === 'header') {
      const headingEl = el.querySelector('h2,h3,h4');
      const refEl = el.querySelector('.henvisning');
      blocks.push({
        id: nextId(),
        type: 'heading',
        level: headingEl?.tagName?.toLowerCase() || 'h2',
        text: headingEl?.textContent?.trim() || '',
        reference: refEl?.textContent?.trim() || '',
      });
      return;
    }

    // Legacy: <div class="header-henvisning">
    if (tag === 'div' && el.classList.contains('header-henvisning')) {
      const headingEl = el.querySelector('h2,h3,h4');
      const refEl = el.querySelector('.henvisning');
      blocks.push({
        id: nextId(),
        type: 'heading',
        level: headingEl?.tagName?.toLowerCase() || 'h2',
        text: headingEl?.textContent?.trim() || '',
        reference: refEl?.textContent?.trim() || '',
      });
      return;
    }

    // Bare heading tags
    if (['h2', 'h3', 'h4'].includes(tag)) {
      blocks.push({
        id: nextId(),
        type: 'heading',
        level: tag,
        text: el.textContent.trim(),
        reference: '',
      });
      return;
    }

    // <div class="linje">
    if (tag === 'div' && el.classList.contains('linje')) {
      const markerEl = el.querySelector('.markør');
      const textEl = el.querySelector('.tekst');
      const refEl = el.querySelector('.henvisning');
      const pEl = textEl?.querySelector('p');
      // Normalize: convert <br> tags (possibly followed by whitespace/newline) to \n
      // This ensures consistent storage format regardless of how the source HTML was generated
      const rawHtml = pEl?.innerHTML?.trim() || textEl?.innerHTML?.trim() || '';
      const normalizedText = rawHtml.replace(/<br\s*\/?>\s*/gi, '\n').trimEnd();
      blocks.push({
        id: nextId(),
        type: 'line',
        marker: markerEl?.textContent?.trim() || '',
        text: normalizedText,
        paragraphClass: pEl?.className || 'strofe',
        reference: refEl?.textContent?.trim() || '',
      });
      return;
    }

    // <br> — skip
    if (tag === 'br') return;

    // <p> or <span> — plain line
    if (tag === 'p' || tag === 'span') {
      blocks.push({
        id: nextId(),
        type: 'line',
        marker: '',
        text: el.innerHTML.trim(),
        reference: '',
      });
      return;
    }

    // Fallback
    const innerHtml = el.innerHTML?.trim();
    if (innerHtml) {
      blocks.push({ id: nextId(), type: 'line', marker: '', text: innerHtml, reference: '' });
    }
  });

  return blocks;
}

/**
 * Serialize an array of blocks back to HTML.
 * Headings are always wrapped in <header class="header-henvisning">
 * with <h3 class="henvisning"> for the reference (empty string if none).
 */
export function blocksToHtml(blocks) {
  return blocks
    .map((block) => {
      if (block.type === 'heading') {
        const tag = block.level || 'h2';
        const ref = block.reference || '';
        return `<header class="header-henvisning"><${tag}>${block.text}</${tag}><h3 class="henvisning">${ref}</h3></header>`;
      }

      if (block.type === 'line') {
        const markerHtml = `<div class="markør">${block.marker || ''}</div>`;
        const baseClass = block.paragraphClass || 'strofe';
        const pClass = (baseClass === 'veksellesning' && ['I', 'II'].includes(block.marker))
          ? 'veksellesning-gruppe'
          : baseClass === 'veksellesning-gruppe'
          ? 'veksellesning-gruppe'
          : baseClass;
        // Ensure \n in stored text becomes <br> in HTML output
        // Also strip space before asterisks and daggers to prevent line-break before them
        const textContent = (block.text || '').replace(/ \*/g, '*').replace(/ †/g, '†').replace(/\n/g, '<br>');
        const textHtml = `<div class="tekst">${textContent ? `<p class="${pClass}">${textContent}</p>` : ''}</div>`;
        const refHtml = block.reference
          ? `<h3 class="henvisning">${block.reference}</h3>`
          : '';
        return `<div class="linje">${markerHtml}${textHtml}${refHtml}</div>`;
      }

      return '';
    })
    .join('\n');
}

/**
 * Parse pasted plain text into line blocks (one block per non-empty line).
 */
export function pasteTextToBlocks(text) {
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line, i) => ({
      id: `pasted-${i}-${Date.now()}`,
      type: 'line',
      marker: '',
      text: line.trim(),
      reference: '',
    }));
}