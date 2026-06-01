import MarkdownPage from '@/components/MarkdownPage';

// Hentes fra content_pages via slug = 'hva-er-tidebonn'.
// Innholdet redigeres av admin under Admin → Innhold.
export default function HvaErTidebonn() {
  return <MarkdownPage slug="hva-er-tidebonn" fallbackTitle="Hva er tidebønn" />;
}
