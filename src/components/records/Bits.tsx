import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { PendingChange, RecordType, ReferenceMeta } from '@/types';
import { AS_OF, familyColour, FAMILY_LABEL, STATUS_LABEL, STATUS_WORD, recordedDate } from '@/lib/data';
import { recordMeta } from '@/lib/records';
import { loadReference, loadRefMeta } from '@/lib/heavy';
import type { Reference } from '@/types';
import ReferenceCard from '@/components/reader/ReferenceCard';
import NoteButton from '@/components/notepad/NoteButton';
import Prose from './Prose';
import FieldView, { humanise } from './FieldView';
import type { Anchor } from '@/lib/notepad';

export const BlockLabel = ({ children, id }: { children: ReactNode; id?: string }) => <h2 id={id} className="text-[11px] font-semibold tracking-[0.15em] bx-muted font-body uppercase mt-6 mb-1.5">{children}</h2>;

export function FamilyChip({ family }: { family?: string | null }) {
  if (!family) return null;
  return (
    <Link to={`/routes?family=${family}`} className="bx-chip border border-[color:var(--bx-line)] hover:underline" data-testid="family-chip">
      <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: familyColour(family) }} />
      {FAMILY_LABEL[family as keyof typeof FAMILY_LABEL] ?? family}
    </Link>
  );
}

/** Every record page shows its own as_of; a record that carries none says so and gives the sweep's date. */
export const AsOf = ({ date }: { date?: string | null }) => date
  ? <span className="bx-asof" data-testid="record-asof">as of {date}</span>
  : <span className="bx-asof" data-testid="record-asof" title="This record carries no as_of of its own">as of — not recorded on the record (sweep closed {AS_OF})</span>;

/** A programme status and the date it was read, always together (KICKOFF §1). Never "open now". */
export function StatusChip({ status, date }: { status: string; date: string }) {
  return (
    <span className="bx-chip border border-[color:var(--bx-line)]" data-testid="status-chip" data-status={status}>
      <span className="font-semibold">{STATUS_LABEL[status] ?? status}</span>
      <span className="bx-muted font-normal">· read {date}</span>
    </span>
  );
}

/** A change-record status as a labelled chip with its date (KICKOFF §1 "law in motion"). */
export function ChangeChip({ status, date }: { status: string; date?: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1" data-testid="change-chip">
      <span className="bx-status font-semibold">{STATUS_WORD[status] ?? status}</span>
      {date !== undefined && <span className="bx-chip bg-paper-2 dark:bg-night-2 tabular-nums">{recordedDate(date)}</span>}
    </span>
  );
}

/** `pending_changes[]`: a labelled block, each with its status chip and date. */
export function PendingChanges({ items, title = 'Pending changes' }: { items: PendingChange[]; title?: string }) {
  if (!items?.length) return null;
  const sorted = [...items].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return (
    <section aria-label={title} data-testid="pending-changes">
      <BlockLabel>{title}</BlockLabel>
      <ul className="grid gap-2">
        {sorted.map((p, i) => (
          <li key={i} className="bx-card p-2.5 text-sm">
            <p className="text-xs"><ChangeChip status={p.status} date={p.date} /></p>
            <Prose md={p.text} className="mt-1" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** `conflicts[]` — "Where sources differ". Both readings are shown; none is picked. */
export function Conflicts({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <section aria-label="Where sources differ" data-testid="conflicts">
      <BlockLabel>Where sources differ</BlockLabel>
      <ul className="grid gap-1.5 border-l-2 border-amber-500 pl-3">
        {items.map((c, i) => <li key={i}><Prose md={c} /></li>)}
      </ul>
    </section>
  );
}

/** `variants[]` — other wordings of the same record met in another sweep slice, under a closed disclosure. */
export function Variants({ items }: { items: Record<string, unknown>[] }) {
  if (!items?.length) return null;
  return (
    <details className="mt-6 bx-card p-3 text-sm" data-testid="variants">
      <summary className="cursor-pointer font-semibold">Also recorded ({items.length} other wording{items.length === 1 ? '' : 's'} from another part of the sweep)</summary>
      <ul className="mt-2 grid gap-3">
        {items.map((v, i) => (
          <li key={i} className="border-l-2 border-[color:var(--bx-line)] pl-3">
            {typeof v.sweep === 'string' && <p className="text-xs bx-muted">recorded in {v.sweep}</p>}
            <dl className="grid gap-1.5 mt-1">
              {Object.entries(v).filter(([k]) => k !== 'sweep').map(([k, x]) => (
                <div key={k}><dt className="text-xs font-semibold bx-muted">{k === 'sources' ? 'Sources' : humanise(k)}</dt><dd>{k === 'sources' && Array.isArray(x) ? <SourcesInline ns={x as number[]} /> : <FieldView value={x} name={k} />}</dd></div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function OfficialLink({ url, label = 'Official page' }: { url?: string | null; label?: string }) {
  if (!url) return null;
  return <p className="text-sm"><span className="font-semibold">{label}: </span><a className="underline break-all" href={url} target="_blank" rel="noreferrer">{url} ↗</a></p>;
}

function useRefMeta(ns: number[]): Map<number, ReferenceMeta> | undefined {
  const [m, setM] = useState<Map<number, ReferenceMeta>>();
  const key = ns.join(',');
  useEffect(() => { let live = true; void loadRefMeta(ns).then((x) => { if (live) setM(x); }); return () => { live = false; }; }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return m;
}

function SourceRow({ n, meta }: { n: number; meta?: ReferenceMeta }) {
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState<Reference | null | undefined>();
  const toggle = () => { const o = !open; setOpen(o); if (o && ref === undefined) loadReference(n).then(setRef); };
  return (
    <li className="text-sm">
      <button type="button" className="text-left w-full hover:bg-paper-2 dark:hover:bg-night-2 rounded px-1 py-0.5" aria-expanded={open} onClick={toggle}>
        <span className="font-semibold">[{n}]</span> {meta ? meta.citation : <span className="bx-todo">reference not in the pack</span>}
        {meta && <span className="ml-1 text-xs bx-muted">· {meta.tier} · {meta.source_kind}{meta.recheck ? ' · flagged by the recheck' : ' · rechecked'}</span>}
      </button>
      {open && <div className="bx-foldout">{ref ? <ReferenceCard r={ref} compact /> : ref === null ? <span className="bx-todo">reference [{n}] not in the pack</span> : <span role="status" className="bx-muted">Loading…</span>}</div>}
    </li>
  );
}

/** `sources[]` as reference cards behind a disclosure each. */
export function Sources({ ns }: { ns: number[] }) {
  const meta = useRefMeta(ns ?? []);
  if (!ns?.length) return null;
  return (
    <section aria-label="Sources" data-testid="sources">
      <BlockLabel>Sources ({ns.length})</BlockLabel>
      {meta ? <ul className="grid gap-0.5">{ns.map((n) => <SourceRow key={n} n={n} meta={meta.get(n)} />)}</ul> : <p className="text-sm bx-muted" role="status">Loading {ns.length} sources…</p>}
    </section>
  );
}
const SourcesInline = ({ ns }: { ns: number[] }) => <span className="text-xs">{ns.map((n) => <Link key={n} className="underline mr-1.5" to={`/references#ref-${n}`}>[{n}]</Link>)}</span>;

/** Links to records by bare id. Unknown ids are shown, amber, not hidden. */
export function RecordLinks({ type, ids }: { type: RecordType; ids: string[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const m = recordMeta(type, id);
        return m ? <Link key={id} className="bx-chip border border-[color:var(--bx-line)] hover:underline" to={m.to}>{m.title}</Link>
          : <span key={id} className="bx-todo" title="This id is not in the pack — listed on /methods as a build error">{id} (unknown {type.replace(/s$/, '')})</span>;
      })}
    </span>
  );
}

/** Header for every record page/card: title, chips, notepad anchor. */
export function RecordHeader({ title, anchor, children, level = 1 }: { title: string; anchor: Anchor; children?: ReactNode; level?: 1 | 2 | 3 }) {
  const H = (`h${level}`) as 'h1' | 'h2' | 'h3';
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <H className={level === 1 ? 'text-3xl sm:text-4xl leading-tight' : level === 2 ? 'text-xl sm:text-2xl' : 'text-lg'}>{title}</H>
        <NoteButton anchor={anchor} label={title} />
      </div>
      {children && <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">{children}</p>}
    </div>
  );
}

export const ListOf = ({ items, ordered = false }: { items: string[]; ordered?: boolean }) => {
  if (!items?.length) return null;
  const L = ordered ? 'ol' : 'ul';
  return <L className={`${ordered ? 'list-decimal' : 'list-disc'} pl-5 grid gap-1`}>{items.map((s, i) => <li key={i}><Prose md={s} /></li>)}</L>;
};

/** A labelled field; lists of strings as bullet lists, everything else through the generic renderer. Empty → nothing. */
export function Field({ label, value, name, ordered }: { label: string; value: unknown; name?: string; ordered?: boolean }) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return null;
  return (
    <div>
      <BlockLabel>{label}</BlockLabel>
      {Array.isArray(value) && value.every((x) => typeof x === 'string') ? <ListOf items={value as string[]} ordered={ordered} /> : <FieldView value={value} name={name} />}
    </div>
  );
}
