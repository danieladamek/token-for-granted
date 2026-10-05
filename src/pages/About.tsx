import { Link } from 'react-router-dom';
import pathfinderJson from '@/data/pathfinder.json';
import { AS_OF, asOfLong, CONCEPTS_LABEL, manifest, provenance, REPO_URL, SISTER } from '@/lib/data';
import type { Pathfinder } from '@/types';

const pf = pathfinderJson as unknown as Pathfinder;

/** `/about` — the disclaimer in full, what the site is and is not, the editorial sample, who built it, the as-of date, the repo, the sister site. */
export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 bx-prose text-ink dark:text-night-ink">
      <h1 className="text-3xl sm:text-4xl text-ink dark:text-night-ink">About Token for Granted</h1>
      <p className="mt-2 flex flex-wrap items-center gap-2"><span className="bx-chip border border-[color:var(--bx-line)] bx-muted">COMMISSIONED GUIDE — NOT PEER REVIEWED · NOT ADVICE</span><span className="bx-asof" data-testid="about-asof">Current as of {AS_OF}</span></p>

      <section className="bx-card p-4 mt-4 border-l-4 border-l-amber-500" aria-labelledby="disc-h" data-testid="disclaimer-full">
        <h2 id="disc-h" className="text-xl text-ink dark:text-night-ink">Disclaimer</h2>
        <p className="mt-1 font-semibold">{manifest.disclaimer}</p>
        <p className="mt-2">{manifest.venue}</p>
      </section>

      <h2 className="text-2xl mt-8 text-ink dark:text-night-ink">What it is</h2>
      <p className="mt-2">{manifest.plain_abstract}</p>
      <p className="mt-2">It is written for {manifest.audience}. The question behind it: {manifest.question}</p>

      <h2 className="text-2xl mt-8 text-ink dark:text-night-ink">What it is not</h2>
      <ul className="list-disc pl-5 mt-2 grid gap-1">
        <li>Not peer reviewed, not official, and not legal, tax, financial or compliance advice. No agency, university, non-profit or foundation has reviewed or endorsed it.</li>
        <li>Not tailored to any institution. The pathfinder lists routes by the count its rule describes, from the tags on the programme records; it recommends nothing.</li>
        <li>Not current beyond its date. It was closed on {asOfLong()}; every record shows its own as-of date, every programme status the date it was read, and every record links to its governing text.</li>
        <li>Not a copy of anyone’s figures: all {provenance.figures.total} figures are the builder’s own — {provenance.figures.by_synthesis.data ?? 0} synthesised from data across cited sources and {provenance.figures.by_synthesis.conceptual ?? 0} conceptual diagrams. No published figure image is reproduced.</li>
      </ul>

      <h2 className="text-2xl mt-8 text-ink dark:text-night-ink">The foundations are a sample</h2>
      <p className="mt-2" data-testid="about-foundations-note">{pf.display.foundations_note}</p>

      <h2 className="text-2xl mt-8 text-ink dark:text-night-ink">Who built it</h2>
      <p className="mt-2">
        The guide and its records were written by an AI research builder, the {manifest.builder.name} (version {manifest.builder.version}, {manifest.builder.date}), from {provenance.references.total.toLocaleString()} public
        sources, each re-read against its live page before publication where the page allowed. The app — the reader, the catalogue, the {CONCEPTS_LABEL.toLowerCase()}, the figures and the search — was built from that content by Claude Code.
        Listed author: {manifest.authors.join(', ')}.
      </p>
      <p className="mt-2"><span className="font-semibold">Text and figures: </span>{manifest.permissions.text}. {manifest.permissions.figures}.</p>

      <h2 className="text-2xl mt-8 text-ink dark:text-night-ink">What leaves the browser</h2>
      <p className="mt-2"><Link className="underline" to="/find">/find</Link> loads this site’s own nightly copy of the public Grants.gov extract and the IRS exempt-organisation master file. <Link className="underline" to="/funded">/funded</Link> sends the chosen Assistance Listing, dates, state and recipient type to the USAspending API, or a keyword to the NSF Awards API, when its button is pressed. Nothing else is sent anywhere — no analytics, no accounts. Pathfinder answers, notes and saved filters stay in this browser.</p>

      <h2 className="text-2xl mt-8 text-ink dark:text-night-ink">The sister site</h2>
      <p className="mt-2"><a className="underline" href={SISTER.url} target="_blank" rel="noreferrer">{SISTER.name}</a> is the same kind of guide for small businesses doing federal contract work: every route into federal work, the gates on each, and where the opportunities appear.</p>

      <h2 className="text-2xl mt-8 text-ink dark:text-night-ink">Reporting an error</h2>
      <p className="mt-2">Every record links to its governing text and its sources; where a record and its source disagree, the source governs. Errors can be reported as an issue on the repository: <a className="underline" href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">{REPO_URL}/issues</a>. The source and the content pack are at <a className="underline" href={REPO_URL} target="_blank" rel="noreferrer">{REPO_URL}</a>. How it was built and what it does not cover is on <Link className="underline" to="/methods">Methods</Link>.</p>
    </div>
  );
}
