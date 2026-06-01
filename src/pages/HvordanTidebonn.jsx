import MarkdownPage from '@/components/MarkdownPage';

// Hentes fra content_pages via slug = 'hvordan-tidebonn'.
// Innholdet redigeres av admin under Admin → Innhold.
export default function HvordanTidebonn() {
  return <MarkdownPage slug="hvordan-tidebonn" fallbackTitle="Hvordan be tidebønn" />;
}
