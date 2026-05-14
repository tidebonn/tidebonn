// Ett-gangs-konvertering: marked + custom youtube-handler.
// Leser stdin (markdown), skriver HTML til stdout.
import { marked } from 'marked';
import { readFileSync } from 'node:fs';

// Custom renderer: code-block med språk "youtube" → ansvars-iframe
const renderer = new marked.Renderer();
const origCode = renderer.code.bind(renderer);
renderer.code = function (token) {
  const lang = (token.lang || '').toLowerCase();
  const text = (token.text || '').trim();
  if (lang === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(text)) {
    return `<div data-youtube-video><iframe src="https://www.youtube-nocookie.com/embed/${text}?rel=0" frameborder="0" allowfullscreen></iframe></div>\n`;
  }
  return origCode(token);
};

marked.use({ renderer, breaks: false, gfm: true });

const input = readFileSync(0, 'utf8');
process.stdout.write(marked.parse(input));
