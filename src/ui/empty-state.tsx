/**
 * An empty state says what will appear here and what to do, in facts rather
 * than sentences (design/README.md).
 */
export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-body-strong text-text">{title}</p>
      {detail && <p className="mx-auto mt-1 max-w-[46ch] text-label text-text-muted">{detail}</p>}
    </div>
  );
}
