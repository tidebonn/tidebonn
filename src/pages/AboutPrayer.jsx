import MarkdownPage from '@/components/MarkdownPage';

// Hentes fra content_pages via slug = 'om-tidebonn'.
// Innholdet redigeres av admin under Admin → Innhold.
export default function AboutPrayer() {
  return <MarkdownPage slug="om-tidebonn" fallbackTitle="Om tidebønn" />;
}
