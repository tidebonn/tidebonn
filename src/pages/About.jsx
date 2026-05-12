import MarkdownPage from '@/components/MarkdownPage';

// Hentes fra content_pages via slug = 'om-appen'.
// Innholdet redigeres av admin under Admin → Innhold.
export default function About() {
  return <MarkdownPage slug="om-appen" fallbackTitle="Om appen" />;
}
