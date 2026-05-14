// Renderer for innholdssider lagret som HTML (fra TipTap-editor).
// Bruker dangerouslySetInnerHTML — kun admins/eiere kan skrive
// innholdet via authenticerte Edge Functions, så vi stoler på det.
// Visuell styling ligger i CSS-klassen .content-body (src/index.css).
export default function ContentRenderer({ content }) {
  if (!content) return null;
  return (
    <div
      className="content-body"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
