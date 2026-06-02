import { useParams } from 'react-router-dom';
import MarkdownPage from '@/components/MarkdownPage';

// Generisk innholdsside som leser slug fra URL (/Side/:slug) og
// rendrer tilhørende rad i content_pages. Brukes for alle nye sider
// admin oppretter under Admin → Innhold uten å trenge ny rute-fil.
export default function DynamicContentPage() {
  const { slug } = useParams();
  return <MarkdownPage slug={slug} fallbackTitle="Side ikke funnet" />;
}
