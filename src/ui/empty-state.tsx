/**
 * An empty state says what will appear here and what to do, in facts rather
 * than sentences (design/README.md, principle 4).
 */
export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-body-strong text-text">{title}</p>
      {detail && <p className="mt-1 text-label text-text-muted">{detail}</p>}
    </div>
  );
}
