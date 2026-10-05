import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import pathfinderJson from '@/data/pathfinder.json';
import homeJson from '@/data/home.json';
import { AS_OF, asOfLong, CONCEPTS_LABEL, conceptsIndex, familyColour, FAMILIES, FAMILY_LABEL, manifest, provenance, recordedDate, SLUG, STATUS_WORD } from '@/lib/data';
import { countSentence, hasAnyAnswer, lastSentence, rankRoutes, type Answers } from '@/lib/pathfinder';
import type { Pathfinder } from '@/types';
// markdown (and the citation machinery) stays out of the entry chunk; the strip fills in when it arrives
const Prose = lazy(() => import('@/components/records/Prose'));

const pf = pathfinderJson as unknown as Pathfinder;
const home = homeJson as unknown as {
  routes: Record<string, { name: string; family: string; door: string; funder_kind: string }>;
  changes: { id: string; date: string; status: string; what: string }[];
  route_counts: Record<string, number>;
  programs: number;
};
export const ANSWERS_KEY = `${SLUG}:pathfinder-answers`;

function loadAnswers(): Answers {
  try { const raw = localStorage.getItem(ANSWERS_KEY); return raw ? (JSON.parse(raw) as Answers) : {}; } catch { return {}; }
}
const optionKey = (o: { tag?: string; value?: string }) => o.tag ?? o.value ?? '';

/**
 * `/` — the pathfinder (KICKOFF §4b). The pack's four questions as a short form; answers live in localStorage only;
 * routes are listed by `pathfinder.rule` exactly as written, each with the count behind it in the rule's words. No
 * other score, and nothing is labelled best, top or recommended.
 */
export default function Home() {
  const [answers, setAnswers] = useState<Answers>(loadAnswers);
  useEffect(() => {
    try {
      if (hasAnyAnswer(answers)) localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
      else localStorage.removeItem(ANSWERS_KEY);
    } catch { /* storage blocked: answers live for this visit only */ }
  }, [answers]);
  const listed = useMemo(() => rankRoutes(pf, answers), [answers]);
  const any = hasAnyAnswer(answers);
  const familyReady = answers.who !== undefined && answers.purpose !== undefined;
  const set = (field: string, v: string) => setAnswers((a) => ({ ...a, [field]: v }));
  const clear = () => { try { localStorage.removeItem(ANSWERS_KEY); } catch { /* ignore */ } setAnswers({}); };
  const four = pf.routes.length ? '/figures/four-doors' : '/figures';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="flex flex-wrap items-center gap-2">
        <span className="bx-chip border border-[color:var(--bx-line)] bx-muted">COMMISSIONED GUIDE — NOT PEER REVIEWED · NOT ADVICE</span>
        <span className="bx-asof" data-testid="home-asof">Current as of {AS_OF}</span>
      </p>
      <h1 className="text-3xl sm:text-5xl leading-tight mt-3">Token for Granted</h1>
      <p className="mt-2 text-lg font-display leading-snug">{manifest.title.replace(/^Token for Granted:\s*/, '').replace(/^./, (c) => c.toUpperCase())}</p>
      <p className="bx-prose mt-3 max-w-3xl">{manifest.question}</p>

      <section className="bx-card p-4 sm:p-5 mt-6" aria-labelledby="pf-h" data-testid="pathfinder">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="pf-h" className="text-2xl">Four questions</h2>
          <button type="button" className="bx-btn" onClick={clear} disabled={!any} data-testid="clear-answers">Clear my answers</button>
        </div>
        <p className="text-xs bx-muted mt-1">The answers stay in this browser; nothing is sent anywhere.</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {pf.questions.map((q) => (
            <fieldset key={q.id} className="min-w-0" data-testid={`q-${q.id}`}>
              <legend className="font-semibold text-sm">{q.prompt}</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {q.options.map((o) => {
                  const v = optionKey(o);
                  const checked = (answers as Record<string, string | undefined>)[q.field] === v;
                  const id = `opt-${q.id}-${v}`;
                  return (
                    <label key={id} htmlFor={id} className={`bx-btn cursor-pointer !py-1 text-left ${checked ? 'bx-btn-on' : ''}`}>
                      <input id={id} className="sr-only" type="radio" name={q.id} checked={checked} onChange={() => set(q.field, v)} data-testid={id} />
                      {o.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="mt-6" aria-labelledby="res-h" aria-live="polite">
        <h2 id="res-h" className="text-2xl">Routes these answers lead to</h2>
        <p className="text-sm mt-1 border-l-2 border-[color:var(--bx-line)] pl-3" data-testid="pf-rule">
          <span className="font-semibold">How routes are listed, in the guide’s words: </span>{pf.rule}
        </p>
        <p className="text-sm mt-2 font-semibold" data-testid="pf-last">{lastSentence(pf.rule)}</p>
        {any && answers.funder_kind === undefined && familyReady && <p className="text-xs bx-muted mt-1">No answer yet to “{pf.questions.find((q) => q.field === 'funder_kind')?.prompt}”: both kinds of funder are counted, as for Either.</p>}
        {any && !familyReady && <p className="text-xs bx-muted mt-1">Family routes are counted once the first two questions are answered; entry routes are listed from any answer.</p>}
        {!any && <p className="mt-3 bx-muted">Answer the questions above and the routes appear here with the count behind each. Or start from a family below, or <Link className="underline" to="/routes">all {Object.values(home.route_counts).reduce((a, b) => a + b, 0)} routes</Link>.</p>}
        {any && listed.length === 0 && <p className="mt-3 bx-muted" data-testid="no-match">No route is listed for these answers. Every route is on <Link className="underline" to="/routes">Routes</Link>.</p>}
        {listed.length > 0 && (
          <ol className="mt-4 grid gap-2" data-testid="pf-results">
            {listed.map((r) => (
              <li key={r.id} className="bx-card p-3 border-l-4" style={{ borderLeftColor: familyColour(r.family) }} data-testid={`pf-route-${r.id}`} data-family={r.family}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link className="font-semibold underline" to={`/routes/${r.id}`}>{home.routes[r.id]?.name ?? r.id}</Link>
                  <span className="text-xs bx-muted">{FAMILY_LABEL[r.family as keyof typeof FAMILY_LABEL] ?? r.family}</span>
                </div>
                <p className="mt-1 text-sm" data-testid="pf-count">{countSentence(r, answers)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-10" aria-labelledby="fam-h">
        <h2 id="fam-h" className="text-2xl">The routes by family</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FAMILIES.map((f) => (
            <Link key={f} to={`/routes?family=${f}`} className="bx-card p-4 hover:bg-paper-2 dark:hover:bg-night-2 border-l-4" style={{ borderLeftColor: familyColour(f) }} data-testid={`family-card-${f}`}>
              <span className="font-display text-lg font-semibold">{FAMILY_LABEL[f]}</span>
              <span className="block text-sm bx-muted mt-1">{home.route_counts[f] ?? 0} routes →</span>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-sm"><Link className="underline" to={four}>Figure 1 draws the same idea as a picture: four systems behind the word “grant”, and the door into each →</Link></p>
      </section>

      <section className="mt-10" aria-labelledby="chg-h" data-testid="changes-strip">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="chg-h" className="text-2xl">What changed</h2>
          <Link className="underline text-sm" to="/changes">The dated ledger →</Link>
        </div>
        <ul className="mt-3 grid gap-2">
          {home.changes.map((c) => (
            <li key={c.id} className="bx-card p-3 text-sm">
              <p className="flex flex-wrap gap-1.5 text-xs"><span className="bx-chip bg-paper-2 dark:bg-night-2 tabular-nums">{recordedDate(c.date)}</span><span className="bx-status">{STATUS_WORD[c.status] ?? c.status}</span></p>
              <Suspense fallback={<p className="mt-1 bx-muted">…</p>}><Prose md={c.what} className="mt-1" /></Suspense>
              <Link className="underline text-xs" to={`/changes#${c.id}`}>In the ledger →</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]" aria-labelledby="guide-h">
        <div>
          <h2 id="guide-h" className="text-2xl">The guide behind the catalogue</h2>
          <p className="bx-prose mt-2">{manifest.plain_abstract}</p>
          <p className="mt-3 text-sm bx-muted">
            {provenance.words.toLocaleString()} words in {provenance.sections} sections, about {manifest.reading_minutes} minutes of reading;
            {' '}{home.programs} programmes and {provenance.references.total.toLocaleString()} public sources. Current as of {asOfLong()}.
          </p>
          <p className="mt-3 flex flex-wrap gap-2"><Link className="bx-btn-primary" to="/read">Start reading</Link><Link className="bx-btn" to="/find">Search open and forecast notices</Link><Link className="bx-btn" to="/methods">How this was built</Link></p>
        </div>
        <div>
          <h3 className="text-lg">{CONCEPTS_LABEL} to read first</h3>
          <ul className="mt-2 grid gap-1.5 text-sm">{conceptsIndex.map((c) => <li key={c.id}><Link className="underline" to={`/concepts/${c.id}`}>{c.title}</Link></li>)}</ul>
        </div>
      </section>
    </div>
  );
}
