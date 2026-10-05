import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import buildErrorsJson from '@/data/build-errors.json';
import synthesisJson from '@/data/synthesis.json';
import type { BuildError, SynthesisPassage, TodoItem } from '@/types';
import { AS_OF, asOfLong, assetUrl, CONCEPTS_LABEL, getTerm, manifest, provenance, scrollToId, sectionTitle } from '@/lib/data';
import { loadQueries, loadScope, loadTodo, useAsync } from '@/lib/heavy';
import { recordsIndexById } from '@/lib/records';
import Prose from '@/components/records/Prose';
import FieldView from '@/components/records/FieldView';

const buildErrors = buildErrorsJson as BuildError[];
const synthesis = synthesisJson as SynthesisPassage[];

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="bx-card p-3"><p className="text-[11px] font-semibold tracking-[0.15em] bx-muted">{label}</p><p className="text-base font-display mt-0.5">{value}</p></div>;
}
function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="text-2xl mt-10 text-ink dark:text-night-ink scroll-mt-24">{children}</h2>;
}
const list = (o: Record<string, number> | undefined | null) => Object.entries(o ?? {}).map(([k, v]) => `${k} ${v.toLocaleString()}`).join(' · ');
const TODO_KIND: Record<string, string> = { gap: 'Gaps', conflict: 'Conflicts between sources', unverified: 'Unverified', recheck: 'Recheck' };
const TODO_PAGE = 60;
const keyLink = (k: string) => { const m = recordsIndexById.get(k.replace(/^records-[^/]+\.yaml\//, '')); return m ? <Link className="underline" to={m.to}>{k}</Link> : <code className="font-mono text-xs">{k}</code>; };

function TodoKind({ kind, items, open }: { kind: string; items: TodoItem[]; open: boolean }) {
  const [n, setN] = useState(TODO_PAGE);
  const [q, setQ] = useState('');
  const shown = q ? items.filter((t) => `${t.id} ${t.where} ${t.what}`.toLowerCase().includes(q.toLowerCase())) : items;
  return (
    <details className="mt-2 text-sm" data-testid={`todo-${kind}`} open={open}>
      <summary className="cursor-pointer"><span className="bx-todo">TODO(author) · {TODO_KIND[kind] ?? kind}: {items.length}</span></summary>
      <input className="bx-input max-w-xs mt-2" placeholder="Filter…" value={q} onChange={(e) => { setQ(e.target.value); setN(TODO_PAGE); }} aria-label={`Filter ${TODO_KIND[kind] ?? kind}`} />
      <ul className="mt-2 grid gap-1.5">{shown.slice(0, n).map((t) => <li key={t.id} id={`todo-${t.id}`} className="scroll-mt-24"><code className="font-mono text-xs">{t.id}</code> <span className="bx-muted">({keyLink(t.where)})</span> — <Prose md={t.what} className="inline [&_p]:inline" /></li>)}</ul>
      {shown.length > n && <button type="button" className="bx-btn mt-2" onClick={() => setN((x) => x + TODO_PAGE * 3)}>Show more ({shown.length - n} left)</button>}
    </details>
  );
}

/** `/methods` — the app's honesty (APP-SPEC §2, topic mode): provenance, scope, interview, every query, corpus, gaps. */
export default function Methods() {
  const scope = useAsync(loadScope);
  const todo = useAsync(loadTodo);
  const queries = useAsync(loadQueries) ?? [];
  const [params] = useSearchParams();
  const todoTarget = params.get('todo');
  const [qf, setQf] = useState('');
  const [slice, setSlice] = useState('');
  const [qn, setQn] = useState(100);
  const P = provenance;
  const slices = useMemo(() => [...new Set(queries.map((q) => q.slice))].sort(), [queries]);
  const bySlice = useMemo(() => slices.map((s) => { const qs = queries.filter((q) => q.slice === s); return { s, n: qs.length, hits: qs.reduce((a, q) => a + (q.hits_n ?? 0), 0), zero: qs.filter((q) => q.hits_n === 0).length }; }), [slices, queries]);
  const shownQ = useMemo(() => { const n = qf.trim().toLowerCase(); return queries.map((q, i) => ({ ...q, i })).filter((q) => (!slice || q.slice === slice) && (!n || `${q.text} ${q.engine}`.toLowerCase().includes(n))); }, [qf, slice, queries]);
  const todoByKind = useMemo(() => (todo ?? []).reduce<Record<string, TodoItem[]>>((a, t) => { (a[t.kind] ??= []).push(t); return a; }, {}), [todo]);
  const todoKindOf = todoTarget ? (todo ?? []).find((t) => t.id === todoTarget)?.kind : undefined;
  useEffect(() => { if (todo && todoTarget) scrollToId(`todo-${todoTarget}`); }, [todo, todoTarget]);
  const cell = 'border-b border-[color:var(--bx-line)] px-2 py-1 align-top';
  const S = scope as (typeof scope & { topic_note?: string; still_open?: unknown; carried_from_far_out?: unknown; search_strategy: { passes?: unknown } }) | undefined;
  const cp = (scope?.corpus_profile ?? {}) as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 bx-prose text-ink dark:text-night-ink">
      <h1 className="text-3xl sm:text-4xl text-ink dark:text-night-ink">Methods &amp; provenance</h1>
      <p className="mt-2 flex flex-wrap items-center gap-2">
        <span className="bx-chip border border-[color:var(--bx-line)] bx-muted">COMMISSIONED GUIDE — NOT PEER REVIEWED · NOT ADVICE</span>
        <span className="bx-asof">Current as of {AS_OF}</span>
      </p>
      <p className="mt-3 text-[17px] leading-8 font-semibold">This is a scope-bounded commissioned review, not a systematic review.</p>
      <p className="mt-2">
        Token for Granted was written by an AI research builder ({manifest.builder.name} v{manifest.builder.version}, {manifest.builder.date}) from a scoped sweep of public sources, and this app was built
        from that content pack by Claude Code. Nothing here is official, peer reviewed or advice. What it offers instead is traceability: every claim carries a citation to a source whose read level and recheck
        are shown, every inference is marked as one, and the scope, the interview and every search query are published below. It is current as of {asOfLong()}; grant rules changed a great deal in 2025 and 2026,
        and every record shows its own as-of date.
      </p>
      <nav aria-label="On this page" className="mt-3 text-sm flex flex-wrap gap-x-3 gap-y-1">
        {[['counts', 'Provenance counts'], ['errors', 'Build errors'], ['todo', 'TODO(author)'], ['synthesis', 'Synthesis'], ['scope', 'Scope'], ['interview', 'Interview and rulings'], ['open', 'Still open'], ['queries', 'Every query'], ['corpus', 'Corpus profile'], ['recheck', 'Recheck'], ['gaps', 'Known gaps'], ['voice', 'Second person'], ['terms', 'Term linking'], ['build', 'How the app was built']].map(([id, l]) => <a key={id} className="underline" href={`#${id}`}>{l}</a>)}
      </nav>

      <H2 id="counts">Provenance counts</H2>
      <div className="mt-3 grid gap-2 sm:grid-cols-3" data-testid="provenance-counts">
        <Stat label="GUIDE" value={`${P.words.toLocaleString()} words · ${P.sections} sections`} />
        <Stat label="BLOCKS (CITED / FRAMING / SYNTHESIS)" value={`${P.blocks.total} (${P.blocks.cited} / ${P.blocks.framing} / ${P.blocks.synthesis})`} />
        <Stat label="SYNTHESIS SENTENCES" value={P.synthesis_passages} />
        <Stat label="UNCITED BLOCKS" value={<span data-testid="uncited-count">{P.blocks.uncited} in the guide · {P.concept_uncited} in {CONCEPTS_LABEL.toLowerCase()} · {P.glossary_uncited} in the glossary · {P.record_prose.uncited} in records</span>} />
        <Stat label="GLOSSARY TERMS LINKED" value={`${P.terms.linked} of ${P.terms.occurring} occurring (${P.terms.linked_pct_of_occurring}%)`} />
        <Stat label="TERMS REACHABLE" value={`${P.terms.reachable_anywhere} of ${P.terms.total} (guide, records or ${CONCEPTS_LABEL.toLowerCase()})`} />
        <Stat label="REFERENCES BY TIER" value={`${P.references.total.toLocaleString()} · ${list(P.references.by_tier)}`} />
        <Stat label="BY ROLE HERE" value={list(P.references.by_role_here)} />
        <Stat label="BY SOURCE KIND · READ" value={`${list(P.references.by_source_kind)} · ${list(P.references.by_read)}`} />
        <Stat label="CITED / NEVER CITED" value={`${P.references.cited.toLocaleString()} / ${P.references.never_cited}`} />
        <Stat label="RECHECK: CLEARED / FLAGGED / REFUSED" value={`${P.references.recheck_cleared.toLocaleString()} / ${P.references.flagged} / ${P.references.fetch_blocked.length}`} />
        <Stat label="KEY FACTS BY CHECK CODE" value={list(P.references.fact_codes)} />
        <Stat label="FIGURES" value={`${P.figures.total} (${list(P.figures.by_synthesis)})`} />
        <Stat label="RECORD PROSE ITEMS (CITED)" value={`${P.record_prose.items.toLocaleString()} (${P.record_prose.cited.toLocaleString()})`} />
        <Stat label="TODO(AUTHOR)" value={`${P.todo.count} · ${list(P.todo.by_kind)}`} />
      </div>
      <p className="mt-3 text-sm" data-testid="records-by-file"><span className="font-semibold">Records by file: </span>{list(P.records)}.</p>
      <p className="mt-1 text-sm" data-testid="programs-by-status"><span className="font-semibold">Programmes by status: </span>{list(P.records_detail.programs_by_status)}; by family {list(P.records_detail.programs_by_family)}; by side {list(P.records_detail.programs_by_side)}.</p>
      <p className="mt-1 text-sm"><span className="font-semibold">Changes by status: </span>{list(P.records_detail.changes_by_status)}; by how precisely dated: {list(P.records_detail.changes_by_date_precision)}.</p>
      <p className="mt-1 text-sm">The full record is <a className="underline" href={assetUrl('provenance.json')}>provenance.json</a>. {P.references.unverified_but_cited.length > 0 && <span className="bx-todo">{P.references.unverified_but_cited.length} cited references are verified: false — {P.references.unverified_but_cited.map((n) => `[${n}]`).join(' ')}</span>}</p>

      <H2 id="errors">Build errors ({buildErrors.length})</H2>
      {buildErrors.length === 0 ? <p className="mt-2">The content build found no errors.</p> : (
        <>
          <p className="mt-2">The content build checks every id and every citation in the pack, and applies the citation-coverage gate to the guide, the {CONCEPTS_LABEL.toLowerCase()}, the glossary definitions and the record prose. These are errors in the pack, recorded rather than repaired: uncited prose is never given a citation, and an unknown id is never re-pointed at a similar one. The app was built from everything else.</p>
          <ul className="mt-2 grid gap-1 text-sm" data-testid="build-errors">{buildErrors.map((e, i) => <li key={i}><span className="bx-todo mr-1">error</span><code className="font-mono text-xs">{e.where}</code> — {e.message}</li>)}</ul>
        </>
      )}

      <H2 id="todo">TODO(author) — the open items ({P.todo.count})</H2>
      <p className="mt-2">Every gap, unverified fact, conflict between sources and recheck item the pack records, by kind. They are shown, never filled.</p>
      {!todo && <p className="bx-muted" role="status">Loading…</p>}
      {Object.entries(todoByKind).map(([k, items]) => <TodoKind key={k} kind={k} items={items} open={todoKindOf === k} />)}

      <H2 id="synthesis">Every synthesis sentence ({synthesis.length})</H2>
      <p className="mt-2">A <em>synthesis</em> sentence states a conclusion the cited sources do not individually state. Each is marked in the guide with a quiet dashed underline and the word synthesis. Here is every one, linked.</p>
      <ol className="mt-3 grid gap-2 text-sm" data-testid="synthesis-list">
        {synthesis.map((s) => <li key={s.id}><Link className="underline font-semibold" to={`/read#${s.id}`} data-testid={`synthesis-link-${s.id}`}>{sectionTitle(s.section)}</Link> — {s.excerpt}{s.excerpt.length >= 220 ? '…' : ''}</li>)}
      </ol>

      {S && (
        <>
          <H2 id="scope">Scope</H2>
          <p className="mt-2"><span className="font-semibold">Topic: </span>{S.topic}</p>
          {S.topic_note && <p className="mt-1 text-sm">{S.topic_note}</p>}
          <p className="mt-1"><span className="font-semibold">Question: </span>{S.question}</p>
          <p className="mt-1 text-sm">Purpose {S.purpose} · level {S.level} · stance {S.stance} · depth {S.depth} · current from {S.time_window.current_from}{S.time_window.seminal ? `; seminal: ${S.time_window.seminal}` : ''}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm" data-testid="scope-in-out">
            <div className="bx-card p-3"><p className="font-semibold">In</p><ul className="list-disc pl-5 mt-1 grid gap-1">{S.boundary.in.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            <div className="bx-card p-3"><p className="font-semibold">Out</p><ul className="list-disc pl-5 mt-1 grid gap-1">{S.boundary.out.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          </div>
          {S.boundary.rationale && <p className="mt-2 text-sm"><span className="font-semibold">Why: </span>{S.boundary.rationale}</p>}
          {S.excluded.length > 0 && <><p className="mt-3 font-semibold text-sm">Left out on purpose</p><ul className="list-disc pl-5 text-sm grid gap-1">{S.excluded.map((x, i) => <li key={i}>{x.what} — {x.why}</li>)}</ul></>}
          {S.anchors.length > 0 && <><p className="mt-3 font-semibold text-sm">Anchors</p><ul className="list-disc pl-5 text-sm grid gap-1" data-testid="anchors">{S.anchors.map((x, i) => <li key={i}>{x.citation} — {x.why}</li>)}</ul></>}
          {S.carried_from_far_out !== undefined && <><p className="mt-3 font-semibold text-sm">Carried over from the sister guide, FAR Out</p><div className="text-sm"><FieldView value={S.carried_from_far_out} /></div></>}

          <H2 id="interview">The interview and the rulings, as recorded ({S.interview.length})</H2>
          {S.assumed && <p className="mt-2"><span className="bx-todo">Some answers were assumed</span></p>}
          <dl className="mt-3 grid gap-3 text-sm" data-testid="interview">{S.interview.map((x, i) => <div key={i} className="bx-card p-3"><dt className="font-semibold">{x.q}</dt><dd className="mt-1">“{x.answer}”{x.asked ? <span className="bx-muted"> ({x.asked})</span> : null}</dd></div>)}</dl>

          <H2 id="open">Still open</H2>
          <div className="mt-2 text-sm" data-testid="still-open"><FieldView value={S.still_open} /></div>
        </>
      )}

      <H2 id="queries">Every query ({queries.length})</H2>
      <p className="mt-2">Every search the sweep ran, with the hits each returned as the sweep noted them — including the ones that found nothing ({P.queries.zero_hit}). {S && <>Run on {String(S.search_strategy.run_on)}; sources {S.search_strategy.sources.join(', ')}.</>}</p>
      {S?.search_strategy.passes !== undefined && <div className="mt-2 text-sm"><p className="font-semibold">Passes</p><FieldView value={S.search_strategy.passes} /></div>}
      {S && (
        <div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm">
          <div className="bx-card p-3"><p className="font-semibold">Snowball</p><ul className="list-disc pl-5">{S.search_strategy.snowball.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          <div className="bx-card p-3"><p className="font-semibold">Inclusion</p><ul className="list-disc pl-5">{S.search_strategy.inclusion.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          <div className="bx-card p-3"><p className="font-semibold">Exclusion</p><ul className="list-disc pl-5">{S.search_strategy.exclusion.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        </div>
      )}
      <div className="overflow-x-auto mt-3"><table className="w-full text-sm" data-testid="queries-by-slice">
        <caption className="text-left text-xs bx-muted">Hits by slice</caption>
        <thead><tr><th className={`${cell} text-left`}>Slice</th><th className={`${cell} text-right`}>Queries</th><th className={`${cell} text-right`}>Hits (as numbers)</th><th className={`${cell} text-right`}>Zero-hit</th></tr></thead>
        <tbody>{bySlice.map((r) => <tr key={r.s}><td className={cell}><button type="button" className="underline" onClick={() => setSlice(r.s)}>{r.s}</button></td><td className={`${cell} text-right tabular-nums`}>{r.n}</td><td className={`${cell} text-right tabular-nums`}>{r.hits.toLocaleString()}</td><td className={`${cell} text-right tabular-nums`}>{r.zero}</td></tr>)}</tbody>
      </table></div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <label className="sr-only" htmlFor="qf">Filter queries</label>
        <input id="qf" className="bx-input max-w-xs" placeholder="Filter queries…" value={qf} onChange={(e) => setQf(e.target.value)} />
        <select className="bx-input max-w-[12rem]" value={slice} onChange={(e) => setSlice(e.target.value)} aria-label="Slice"><option value="">All slices</option>{slices.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <span className="bx-muted self-center" role="status">{shownQ.length} shown</span>
      </div>
      <div className="overflow-x-auto mt-2 max-h-[36rem] overflow-y-auto"><table className="w-full text-xs" data-testid="queries-table">
        <thead className="sticky top-0 bg-paper dark:bg-night"><tr><th className={`${cell} text-left`}>#</th><th className={`${cell} text-left`}>Query</th><th className={`${cell} text-left`}>Slice</th><th className={`${cell} text-left`}>Engine</th><th className={`${cell} text-right`}>Hits</th><th className={`${cell} text-left`}>Date</th></tr></thead>
        <tbody>{shownQ.slice(0, qn).map((q) => <tr key={q.i}><td className={`${cell} tabular-nums`}>{q.i + 1}</td><td className={cell}>{q.text}{q.invalid && <span className="bx-todo ml-1">recorded with its fields out of place — a build error</span>}</td><td className={cell}>{q.slice}</td><td className={cell}>{q.engine}</td><td className={`${cell} text-right tabular-nums`}>{String(q.hits)}</td><td className={cell}>{q.date}</td></tr>)}</tbody>
      </table></div>
      {shownQ.length > qn && <button type="button" className="bx-btn mt-2" onClick={() => setQn((n) => n + 300)}>Show more ({shownQ.length - qn} left)</button>}

      {S && (
        <>
          <H2 id="corpus">Corpus profile</H2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
            <Stat label="BY TIER" value={list(S.corpus_profile.by_tier)} />
            <Stat label="BY SOURCE KIND" value={list(S.corpus_profile.by_source_kind as Record<string, number> | undefined)} />
            <Stat label="YEAR RANGE" value={(S.corpus_profile.year_range ?? []).join('–')} />
            <Stat label="UNDATED" value={String(cp.undated ?? '—')} />
          </div>
          {typeof cp.tier_note === 'string' && <p className="mt-2 text-sm"><span className="font-semibold">Tiers: </span>{cp.tier_note}</p>}
          <p className="mt-2 text-sm"><span className="font-semibold">Concentration: </span>{S.corpus_profile.concentration}</p>
          <p className="mt-1 text-sm"><span className="font-semibold">Dissent represented: </span>{S.corpus_profile.dissent_represented ? 'yes' : 'no'}. {S.corpus_profile.dissent_note}</p>
          {cp.records !== undefined && <div className="mt-2 text-sm"><p className="font-semibold">Records</p><FieldView value={cp.records} /></div>}
          {cp.main_text !== undefined && <div className="mt-2 text-sm"><p className="font-semibold">Main text</p><FieldView value={cp.main_text} /></div>}

          <H2 id="recheck">Recheck summary</H2>
          <div className="mt-2 text-sm"><FieldView value={cp.recheck} /></div>
          <p className="mt-1 text-sm">In this build: {P.references.rechecked.toLocaleString()} references carry a recheck date; {P.references.recheck_cleared.toLocaleString()} are cleared and {P.references.flagged} flagged ({P.references.flagged_cited} of them cited); {P.references.fetch_blocked.length} pages refused ({P.references.fetch_blocked.map((n) => `[${n}]`).join(' ')}); {P.references.partial_reads.toLocaleString()} were re-read in part; {P.references.quotes_dropped} quotations were not found word for word and removed; {P.references.by_hand} facts were settled by a re-read by hand. Each key fact on a reference card carries its code in words.</p>

          <H2 id="gaps">Known gaps ({S.search_strategy.known_gaps.length})</H2>
          <ul className="list-disc pl-5 mt-2 text-sm grid gap-1" data-testid="known-gaps">{S.search_strategy.known_gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
        </>
      )}

      <H2 id="voice">Records with a second-person sentence</H2>
      <p className="mt-2 text-sm">The guide does not tell a reader what to do about their own application. Pack text that addresses the reader in the second person is a pack error: it is rendered as written and listed here for the author. The consolidation report lists {P.voice.consolidation_report.length} records known to carry one; this build’s own scan found {P.voice.count} sentences.</p>
      <ul className="mt-2 grid gap-1 text-sm" data-testid="voice-report">{P.voice.consolidation_report.map((k) => <li key={k}>{keyLink(k)}</li>)}</ul>
      <details className="mt-2 text-sm"><summary className="cursor-pointer bx-muted">The sentences this build found ({P.voice.count})</summary>
        <ul className="mt-2 grid gap-1" data-testid="voice-list">{P.voice.items.map((v, i) => <li key={i}>{keyLink(v.where.split('/').slice(0, 2).join('/'))} — “{v.excerpt}”</li>)}</ul>
      </details>

      <H2 id="terms">Term linking</H2>
      <p className="mt-2 text-sm">
        Glossary terms are matched whole-word and case-insensitively, longest match first (so “negotiated indirect cost rate” is never linked as “indirect cost”, nor “SAM.gov” as “SAM”); a variant written in capitals matches only in capitals.
        The first occurrence in each guide section, {CONCEPT_WORD_SAFE} and record is linked. {P.terms.linked} of the {P.terms.occurring} terms that occur in the guide text are linked ({P.terms.linked_pct_of_occurring}%);
        {' '}{P.terms.linked_in_records} terms are linked from records. Terms that occur in the guide but are never linked because every occurrence sits inside a longer term:{' '}
        {P.terms.occurring_not_linked.map((t) => getTerm(t)?.term ?? t).join(', ') || 'none'}. Terms that do not occur in the guide text ({P.terms.unmatched.length}; they occur in records and {CONCEPTS_LABEL.toLowerCase()}): {P.terms.unmatched.map((t) => getTerm(t)?.term ?? t).join(', ')}.
      </p>

      <H2 id="build">How the app was built</H2>
      <ul className="list-disc pl-5 mt-2 text-sm grid gap-1">
        <li><strong>Written by the guide’s builder</strong> ({manifest.builder.name} v{manifest.builder.version}): the guide, every record, the glossary, the {CONCEPTS_LABEL.toLowerCase()}, the figures and their data, the reference summaries, the pathfinder questions and its rule. It is the only source of content in this app.</li>
        <li><strong>Done by this build</strong>: parsing and validation, the citation-coverage gate, term linking, citation fold-outs, the pathfinder exactly as its rule states it, the grouping of gates and standing (derived from each record’s own fields, with the rules printed on those pages), the figure components, the notepad port, the opportunity search and foundation directory over the nightly harvest, the live look-ups on /funded, and this record.</li>
        <li><strong>The harvested data</strong> on /find (the Grants.gov daily extract, the IRS exempt-organisation master file, the Federal Register and NSF’s funding feed) is collected each night when the site is deployed and is never committed. /funded queries USAspending and the NSF Awards API live from the browser.</li>
        <li>No analytics, no accounts, no server. Pathfinder answers, notes and saved filters live in this browser’s localStorage only.</li>
      </ul>
    </div>
  );
}
const CONCEPT_WORD_SAFE = 'primer';
