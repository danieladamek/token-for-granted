/** The glossary’s own `domain` (law | process | cost | role | organisation | programme | standing | status | notation): text, not colour. */
export default function KindChip({ kind }: { kind: string }) {
  return <span className="bx-chip border border-[color:var(--bx-line)] bx-muted">{kind}</span>;
}
