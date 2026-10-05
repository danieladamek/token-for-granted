import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isoDaysAgo, nsfAwards, nsfAwardUrl, nsfSearchUrl, RECIPIENT_TYPES, recipientUrl, REPORTER_SEARCH, topRecipients, usaSearchUrl, type NsfAward, type Recipient } from '@/lib/funded';
import { money } from '@/lib/opps';

const STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA PR RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');

function UsaPanel() {
  const [params] = useSearchParams();
  const [aln, setAln] = useState(params.get('aln') ?? '');
  const [state, setState] = useState('');
  const [start, setStart] = useState(isoDaysAgo(365));
  const [end, setEnd] = useState(isoDaysAgo(0));
  const [type, setType] = useState<string>('higher_education');
  const [res, setRes] = useState<{ recipients: Recipient[]; count: number | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{2}\.\d{3}$/.test(aln.trim())) { setErr('An Assistance Listing number looks like 93.859.'); setRes(null); return; }
    setBusy(true); setErr(null); setRes(null);
    try { setRes(await topRecipients({ aln: aln.trim(), state, start, end, recipientType: type })); }
    catch (x) { setErr(`USAspending did not answer (${(x as Error).message || 'network error'}).`); }
    finally { setBusy(false); }
  };
  return (
    <section className="bx-card p-4 mt-4" aria-labelledby="usa-h" data-testid="usa-panel">
      <h2 id="usa-h" className="text-xl">USAspending: top recipients under an Assistance Listing</h2>
      <p className="text-xs bx-muted mt-1">Grants and other financial assistance (award types 02–05), summed by recipient over the window. Queried live from api.usaspending.gov when you press the button.</p>
      <form className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm" onSubmit={submit}>
        <label className="block"><span className="block text-xs bx-muted mb-1">Assistance Listing</span><input className="bx-input font-mono" value={aln} onChange={(e) => setAln(e.target.value)} placeholder="93.859" data-testid="usa-aln" /></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Recipient state (optional)</span><select className="bx-input" value={state} onChange={(e) => setState(e.target.value)}><option value="">Any</option>{STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">From</span><input className="bx-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">To</span><input className="bx-input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Recipient type</span><select className="bx-input" value={type} onChange={(e) => setType(e.target.value)} data-testid="usa-type">{RECIPIENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
        <div className="lg:col-span-5"><button type="submit" className="bx-btn-primary" disabled={busy} data-testid="usa-go">{busy ? 'Asking USAspending…' : 'Ask USAspending'}</button></div>
      </form>
      {err && <p className="mt-3 text-sm" role="alert" data-testid="usa-error">{err} {/^\d{2}\.\d{3}$/.test(aln.trim()) && <a className="underline" href={usaSearchUrl(aln.trim())} target="_blank" rel="noreferrer">USAspending’s own search ↗</a>}</p>}
      {res && (
        <div className="mt-3" data-testid="usa-results">
          <p className="text-sm">{res.count !== null ? <><strong>{res.count.toLocaleString()}</strong> awards in the window; </> : null}top {res.recipients.length} recipients by obligation:</p>
          {res.recipients.length === 0 ? <p className="text-sm bx-muted mt-1">USAspending returned no recipient for these filters.</p> : (
            <ol className="mt-2 grid gap-1 text-sm list-decimal pl-5">{res.recipients.map((r, i) => <li key={i} data-testid="usa-recipient">{r.recipient_id ? <a className="underline" href={recipientUrl(r.recipient_id)} target="_blank" rel="noreferrer">{r.name} ↗</a> : r.name} <span className="tabular-nums bx-muted">{money(Math.round(r.amount))}</span></li>)}</ol>
          )}
        </div>
      )}
    </section>
  );
}

function NsfPanel() {
  const [kw, setKw] = useState('');
  const [res, setRes] = useState<NsfAward[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!kw.trim()) return;
    setBusy(true); setErr(null); setRes(null);
    try { setRes(await nsfAwards(kw.trim())); } catch (x) { setErr(`The NSF Awards API did not answer (${(x as Error).message || 'network error'}).`); } finally { setBusy(false); }
  };
  return (
    <section className="bx-card p-4 mt-4" aria-labelledby="nsf-h" data-testid="nsf-panel">
      <h2 id="nsf-h" className="text-xl">NSF: awards by keyword or programme name</h2>
      <p className="text-xs bx-muted mt-1">Queried live from api.nsf.gov when you press the button.</p>
      <form className="mt-3 flex flex-wrap gap-2 text-sm" onSubmit={submit}>
        <label className="block min-w-[16rem] flex-1"><span className="block text-xs bx-muted mb-1">Keyword or programme name</span><input className="bx-input" value={kw} onChange={(e) => setKw(e.target.value)} data-testid="nsf-kw" /></label>
        <button type="submit" className="bx-btn-primary self-end" disabled={busy} data-testid="nsf-go">{busy ? 'Asking NSF…' : 'Ask NSF'}</button>
      </form>
      {err && <p className="mt-3 text-sm" role="alert" data-testid="nsf-error">{err} <a className="underline" href={nsfSearchUrl(kw)} target="_blank" rel="noreferrer">NSF’s own award search ↗</a></p>}
      {res && (res.length === 0 ? <p className="mt-3 text-sm bx-muted">No award matched.</p> : (
        <ul className="mt-3 grid gap-1.5 text-sm" data-testid="nsf-results">{res.map((a) => <li key={a.id}><a className="underline font-semibold" href={nsfAwardUrl(a.id)} target="_blank" rel="noreferrer">{a.title} ↗</a><span className="block text-xs bx-muted">{a.awardeeName}{a.fundsObligatedAmt ? ` · obligated $${Number(a.fundsObligatedAmt).toLocaleString('en-US')}` : ''}{a.startDate ? ` · ${a.startDate}` : ''}{a.expDate ? ` to ${a.expDate}` : ''}{a.fundProgramName ? ` · ${a.fundProgramName}` : ''}</span></li>)}</ul>
      ))}
    </section>
  );
}

/** `/funded` — who has won: live USAspending and NSF queries, and links for NIH and foundations (KICKOFF §4b). */
export default function Funded() {
  const [params] = useSearchParams();
  const label = params.get('label');
  const code = params.get('code') ?? '';
  const [term, setTerm] = useState(code);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Who has won</h1>
      <p className="bx-card p-3 mt-3 text-sm border-l-4 border-l-[color:var(--bx-accent)]" data-testid="funded-notice">
        These are live queries. When a button is pressed, this page sends the Assistance Listing, dates, state and recipient type to <strong>api.usaspending.gov</strong>, or the keyword to <strong>api.nsf.gov</strong>, and shows what comes back; answers are kept for this tab only. Nothing else is sent anywhere. The results are those agencies’ own data, shown as that data.
      </p>
      {label && <p className="mt-3 text-sm">Opened from <strong>{label}</strong>.</p>}
      <UsaPanel />
      <NsfPanel />
      <section className="bx-card p-4 mt-4" aria-labelledby="nih-h" data-testid="nih-panel">
        <h2 id="nih-h" className="text-xl">NIH: a link to RePORTER</h2>
        <p className="text-sm mt-1">NIH RePORTER refuses the check a browser makes before a page can query it, so this page cannot ask it directly, and RePORTER names each search by an id its own server makes, so no link can carry the code either. The link opens RePORTER’s Advanced Search, where the activity code or opportunity number is entered.</p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm items-end">
          <label className="block"><span className="block text-xs bx-muted mb-1">Activity code or opportunity number</span><input className="bx-input font-mono" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="R15 or PAR-25-134" data-testid="nih-term" /></label>
          <a className="bx-btn" href={REPORTER_SEARCH} target="_blank" rel="noreferrer" data-testid="nih-link">Open RePORTER’s Advanced Search ↗</a>
          {term && <span className="text-sm" data-testid="nih-code">to search for <code className="font-mono">{term}</code></span>}
        </div>
      </section>
      <section className="bx-card p-4 mt-4" aria-labelledby="fdn-h">
        <h2 id="fdn-h" className="text-xl">Foundations</h2>
        <p className="text-sm mt-1">A foundation’s grants are in its own grants database, where it has one, and in its Form 990-PF filings. Each <Link className="underline" to="/funders#foundations">foundation page</Link> links to both; the <Link className="underline" to="/find?tab=foundations">foundation directory</Link> links every private foundation the IRS lists to its ProPublica profile. ProPublica is not called from this site.</p>
      </section>
    </div>
  );
}
