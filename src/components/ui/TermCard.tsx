import { Link } from 'react-router-dom';
import type { TermShort } from '@/types';
import { CONCEPT_WORD, getConcept } from '@/lib/data';
import KindChip from './KindChip';

/** The short popover body for a glossary term (short definition + full entry + primer link). */
export default function TermCard({ term, onNavigate }: { term: TermShort; onNavigate?: () => void }) {
  const concept = getConcept(term.concept);
  return (
    <div>
      <p className="font-display text-base font-semibold leading-snug">{term.term} <KindChip kind={term.domain} />{term.own_label && <OwnLabel />}</p>
      <p className="mt-1 leading-6">{term.short}</p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <Link className="underline font-semibold" to={`/glossary#${term.id}`} onClick={onNavigate}>Full entry →</Link>
        {concept && <Link className="underline" to={`/concepts/${concept.id}`} onClick={onNavigate}>Read the {CONCEPT_WORD} → {concept.title.split(':')[0]}</Link>}
      </p>
    </div>
  );
}

/** A quiet chip for a label of this guide's own (`own_label: true`): not a legal or official term. */
export const OwnLabel = () => <span className="bx-chip border border-dashed border-[color:var(--bx-line)] bx-muted ml-1" title="A label this guide uses for its own records; it is not a legal or official term">this guide’s own label</span>;
