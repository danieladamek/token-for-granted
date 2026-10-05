import { Link } from 'react-router-dom';
import type { Reference } from '@/types';
import { recordsIndexById } from '@/lib/records';
import { CONCEPT_WORD, FACT_WORD, getConcept, getFigure, getTerm, ROLE_WORD, sectionTitle, TIER_NOTE } from '@/lib/data';
import Todo from '@/components/ui/Todo';
import NoteButton from '@/components/notepad/NoteButton';
import Prose from '@/components/records/Prose';

const READ: Record<string, string> = { full: 'read in full', partial: 'read in part', 'not-fetched': 'not fetched' };
const Label = ({ children }: { children: React.ReactNode }) => <span className="block text-[11px] font-semibold tracking-[0.15em] bx-muted">{children}</span>;

/** What the recheck did with the page (KICKOFF §1): re-read, re-read in part, or could not be re-read. */
export function recheckResult(r: Pick<Reference, 'recheck_result' | 'rechecked'>): string {
  const rr = r.recheck_result;
  if (!rr) return r.rechecked ? 'page re-read' : 'not re-read';
  if (rr.fetch === 'blocked') return `could not be re-read${rr.reason ? ` (${rr.reason})` : ''}`;
  return rr.partial ? 'page re-read in part' : 'page re-read';
}

/** A `used_by` key ("programs/nih-r01", "glossary/payline", "concepts/…", "todo/…") as a link where it resolves. */
function UsedBy({ k }: { k: string }) {
  const [file, ...rest] = k.split('/');
  const id = rest.join('/');
  const m = recordsIndexById.get(k);
  if (m) return <Link className="underline mr-2" to={m.to}>{m.title.length > 60 ? `${m.title.slice(0, 58)}…` : m.title}</Link>;
  if (file === 'glossary') return <Link className="underline mr-2" to={`/glossary#${id}`}>glossary: {getTerm(id)?.term ?? id}</Link>;
  if (file === 'concepts') return <Link className="underline mr-2" to={`/concepts/${id}`}>{CONCEPT_WORD}: {getConcept(id)?.title ?? id}</Link>;
  if (file === 'figures') return <Link className="underline mr-2" to={`/figures/${id}`}>{getFigure(id)?.label ?? id}</Link>;
  if (file === 'todo') return <Link className="underline mr-2" to={`/methods?todo=${encodeURIComponent(id)}#todo`}>open item {id}</Link>;
  return <span className="mr-2">{k}</span>;
}

/**
 * The reference card used everywhere — reader fold-outs, record pages, /references. Everything on it comes from the
 * pack and renders as written: tier and tier_note, why_it_mattered on the seminal, role_here, source_kind, how much was
 * read, the recheck (each key fact with its code in words, the date, what happened to the page, and a quiet flag while
 * an item is unconfirmed), and what in the guide cites it (used_by).
 */
export default function ReferenceCard({ r, compact = false }: { r: Reference; compact?: boolean }) {
  const refused = r.recheck_result?.fetch === 'blocked';
  const usedBy = r.used_by ?? [];
  return (
    <div data-testid={`ref-card-${r.n}`} className="grid gap-2.5 min-w-0 [overflow-wrap:anywhere]">
      <p className="text-sm"><span className="font-semibold">[{r.n}]</span> {r.citation}</p>

      <p className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="bx-tier" title={TIER_NOTE[r.tier]}>{r.tier}</span>
        <span className="bx-chip border border-[color:var(--bx-line)] bx-muted" title={r.source_kind === 'secondary' ? 'A secondary source never carries a fact alone in this guide' : 'A primary source'}>{r.source_kind}</span>
        <span className="bx-chip bg-paper-2 dark:bg-night-2">{READ[r.read] ?? r.read}</span>
        <span className="bx-chip bg-paper-2 dark:bg-night-2">{r.year}</span>
        <span className="bx-chip bg-paper-2 dark:bg-night-2" title={r.role_note}>{ROLE_WORD[r.role_here] ?? r.role_here}</span>
        {r.recheck && <span className="bx-chip border border-dashed border-[color:var(--bx-line)] bx-muted" data-testid="recheck-flag" title="Flagged while any key fact is not confirmed or the page refused the second reading">flagged by the recheck</span>}
        {!r.verified && <span className="bx-todo">not verified — summary from metadata only</span>}
      </p>
      <p className="text-xs bx-muted">
        {r.publisher} · published {r.published} · accessed {r.accessed}
        {' · '}<a className="underline" href={r.url} target="_blank" rel="noreferrer">open the source ↗</a>
      </p>
      {r.date_note && !compact && <p className="text-xs bx-muted">Date note: {r.date_note}</p>}
      {r.tier_note && <p className="text-xs bx-muted" data-testid="tier-note">Tier note: {r.tier_note}</p>}

      <div className="text-sm">
        <Label>WHAT THE SOURCE SAYS</Label>
        {r.summary.trim() ? <div className={`mt-1 ${compact ? 'leading-6' : 'bx-prose'}`}><Prose md={r.summary} /></div> : <p className="mt-1"><Todo>summary pending — not in the content pack</Todo></p>}
      </div>
      {r.why_it_mattered && <p className="text-sm" data-testid="why-it-mattered"><span className="font-semibold">Why it mattered: </span>{r.why_it_mattered}</p>}
      {r.role_note && !compact && <p className="text-xs bx-muted">Role: {r.role_note}</p>}

      <div className="text-sm border-l-2 border-[color:var(--bx-line)] pl-3" data-testid="recheck">
        <Label>THE RECHECK</Label>
        <p className="mt-1 text-xs">{r.rechecked ? `Re-read ${r.rechecked}` : 'Not re-read'} · {recheckResult(r)}{r.recheck_result?.quotes_dropped ? ` · ${r.recheck_result.quotes_dropped} quotation${r.recheck_result.quotes_dropped === 1 ? '' : 's'} not found word for word and removed` : ''}{r.recheck_result?.by_hand ? ` · ${r.recheck_result.by_hand} fact${r.recheck_result.by_hand === 1 ? '' : 's'} settled by a re-read by hand` : ''}</p>
        {r.key_facts.length > 0 && (
          <ul className="mt-1.5 grid gap-1" data-testid="key-facts">
            {r.key_facts.slice(0, compact ? 6 : undefined).map((k, i) => {
              const code = r.fact_check?.[i] ?? '-';
              return (
                <li key={i} className="text-sm" data-testid="key-fact" data-code={code}>
                  <span className={`bx-chip mr-1 ${code === 'C' ? 'border border-[color:var(--bx-line)]' : code === 'S' ? 'border border-dashed border-[color:var(--bx-line)]' : 'bx-todo'}`} title={`Check code ${code}`}>{code} · {FACT_WORD[code] ?? code}</span>
                  {k}
                </li>
              );
            })}
            {compact && r.key_facts.length > 6 && <li className="text-xs bx-muted">… {r.key_facts.length - 6} more on the full card</li>}
          </ul>
        )}
      </div>

      {r.quotes.length > 0 && (
        <details className="text-sm" open={!compact && r.quotes.length <= 2}>
          <summary className="cursor-pointer bx-muted">{r.quotes.length} quotation{r.quotes.length === 1 ? '' : 's'} (≤ 25 words, as on the page){refused ? ' — from the first reading; the page refused the second' : ''}</summary>
          {refused && <p className="mt-1 text-xs bx-muted">These quotations come from the first reading: the page could not be re-read, so none was confirmed word for word.</p>}
          <ul className="mt-1 grid gap-1">{r.quotes.map((q, i) => <li key={i} className="border-l-2 border-[color:var(--bx-line)] pl-2">“{q.replace(/^["“]|["”]$/g, '')}”</li>)}</ul>
        </details>
      )}

      <p className="text-xs bx-muted">
        {r.cited_sections.length > 0 && <>Cited in the guide: {r.cited_sections.map((s) => <Link key={s} className="underline mr-2" to={`/read#${s}`}>{sectionTitle(s)}</Link>)}</>}
        {usedBy.length > 0 && <span data-testid="used-by">{r.cited_sections.length > 0 && ' · '}Used by {usedBy.length}: {usedBy.slice(0, compact ? 5 : 40).map((k) => <UsedBy key={k} k={k} />)}{usedBy.length > (compact ? 5 : 40) && '…'}</span>}
        {r.cited_sections.length === 0 && usedBy.length === 0 && <>Cited nowhere in this build.</>}
      </p>

      <div className="flex flex-wrap items-center gap-2 no-print">
        <NoteButton anchor={{ type: 'ref', id: String(r.n) }} label={`reference ${r.n}`} />
        {compact && <Link className="underline text-xs font-semibold" to={`/references#ref-${r.n}`}>Open in references →</Link>}
      </div>
    </div>
  );
}
