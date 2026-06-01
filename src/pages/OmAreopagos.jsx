import MarkdownPage from '@/components/MarkdownPage';

// Hentes fra content_pages via slug = 'om-areopagos'.
// Innholdet redigeres av admin under Admin → Innhold.
export default function OmAreopagos() {
  return <MarkdownPage slug="om-areopagos" fallbackTitle="Om Areopagos" />;
}
