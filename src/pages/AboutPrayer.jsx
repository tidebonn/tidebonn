import MarkdownPage from '@/components/MarkdownPage';

// Beholdes for bakoverkompatibilitet (gamle bokmerker /AboutPrayer).
// Innholdet ligger nå under slug = 'hva-er-tidebonn' (samme rad,
// renamet i migration 005). Den «nye» ruten er /HvaErTidebonn,
// nådd via /LesMer-landingssiden.
export default function AboutPrayer() {
  return <MarkdownPage slug="hva-er-tidebonn" fallbackTitle="Hva er tidebønn" />;
}
