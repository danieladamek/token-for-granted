// Probe the public grant and foundation feeds Taken for Granted would use. Read-only; prints a JSON report.
// Three questions per source: can a GitHub runner reach it, how big is it, and (for live lookups) will a
// browser on the Pages origin be allowed to call it.
const UA = 'taken-for-granted-probe (github.com/danieladamek/taken-for-granted)';
const ORIGIN = 'https://danieladamek.github.io';
const out = { ranAt: new Date().toISOString() };
const info = new Set(); // informational probes: reported, never counted as failures

async function probe(name, url, init = {}, parse, opts = {}) {
  const t0 = Date.now();
  if (opts.informational) info.add(name);
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(45000), headers: { 'User-Agent': UA, Accept: 'application/json, text/csv, application/xml, */*', Origin: ORIGIN, ...(init.headers || {}) } });
    const text = init.method === 'HEAD' ? '' : await r.text();
    const rec = { status: r.status, ms: Date.now() - t0, bytes: text.length, contentType: r.headers.get('content-type'), allowOrigin: r.headers.get('access-control-allow-origin') };
    if (parse) Object.assign(rec, parse(text, r));
    out[name] = rec;
    return rec;
  } catch (e) { out[name] = { error: String(e), ms: Date.now() - t0 }; return out[name]; }
}
// What a browser sends before a JSON POST. Tells us whether a live in-page lookup is possible.
const preflight = (name, url) => probe(name, url, { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } }, (t, r) => ({ allowMethods: r.headers.get('access-control-allow-methods'), allowHeaders: r.headers.get('access-control-allow-headers') }), { informational: true });
const j = (t) => { try { return JSON.parse(t); } catch { return null; } };
const json = { 'Content-Type': 'application/json' };
const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '');

// ---- Grants.gov ---------------------------------------------------------------------------------------
// Daily XML extract (v2 includes forecasts). The file is named for the day it was generated; try the last four days.
const EXTRACT = (d) => `https://prod-grants-gov-chatbot.s3.amazonaws.com/extracts/GrantsDBExtract${ymd(d)}v2.zip`;
let extractUrl = null;
for (let back = 0; back < 4 && !extractUrl; back++) {
  const d = new Date(Date.now() - back * 86400000);
  const r = await probe('grants_extract_head', EXTRACT(d), { method: 'HEAD' }, (t, res) => ({ file: EXTRACT(d).split('/').pop(), contentLength: res.headers.get('content-length'), lastModified: res.headers.get('last-modified'), acceptRanges: res.headers.get('accept-ranges') }));
  if (r.status >= 200 && r.status < 300) extractUrl = EXTRACT(d);
}
if (extractUrl) await probe('grants_extract_range', extractUrl, { headers: { Range: 'bytes=0-1023' } }, (t, r) => ({ contentRange: r.headers.get('content-range'), zipMagic: t.slice(0, 2) === 'PK' }));

// Legacy search2 (no key): totals, then one count per applicant type this guide filters on.
const search2 = (name, body) => probe(name, 'https://api.grants.gov/v1/api/search2', { method: 'POST', headers: json, body: JSON.stringify({ keyword: '', oppStatuses: 'posted|forecasted', rows: 1, ...body }) }, (t) => { const d = j(t); return { hitCount: d?.data?.hitCount, errorcode: d?.errorcode, firstId: d?.data?.oppHits?.[0]?.id, firstNumber: d?.data?.oppHits?.[0]?.number }; });
const all = await search2('grants_search2_all', {});
await search2('grants_search2_public_higher_ed', { eligibilities: '06' });
await search2('grants_search2_private_higher_ed', { eligibilities: '20' });
await search2('grants_search2_nonprofit_501c3', { eligibilities: '12' });
await search2('grants_search2_nonprofit_other', { eligibilities: '13' });
await search2('grants_search2_nih', { agencies: 'HHS-NIH11' });

// fetchOpportunity: does one notice carry applicant types, award limits and a machine-readable close date?
if (all.firstId) await probe('grants_fetch_opportunity', 'https://api.grants.gov/v1/api/fetchOpportunity', { method: 'POST', headers: json, body: JSON.stringify({ opportunityId: Number(all.firstId) }) }, (t) => { const s = j(t)?.data?.synopsis ?? {}; return { synopsisKeys: Object.keys(s), applicantTypes: s.applicantTypes?.length, awardCeiling: s.awardCeiling, responseDate: s.responseDate, responseDateDesc: s.responseDateDesc }; });

// ---- Federal Register: funding-opportunity notices ------------------------------------------------------
await probe('federal_register_nofo', 'https://www.federalregister.gov/api/v1/documents.json?per_page=1&order=newest&conditions[term]=%22notice+of+funding+opportunity%22&conditions[type][]=NOTICE', {}, (t) => { const d = j(t); return { count: d?.count, newest: d?.results?.[0]?.publication_date }; });

// ---- NSF ------------------------------------------------------------------------------------------------
await probe('nsf_funding_rss', 'https://www.nsf.gov/rss/rss_www_funding_pgm_annc_inf.xml', {}, (t) => ({ items: (t.match(/<item[\s>]/g) || []).length, lastBuild: (t.match(/<lastBuildDate>([^<]+)/) || [])[1] }));
await probe('nsf_awards_https', 'https://api.nsf.gov/services/v1/awards.json?keyword=epscor&rpp=1', {}, (t) => { const d = j(t); return { awards: d?.response?.award?.length, keys: Object.keys(d?.response?.award?.[0] || {}) }; });

// ---- NIH RePORTER -----------------------------------------------------------------------------------------
const REPORTER = 'https://api.reporter.nih.gov/v2/projects/search';
await probe('nih_reporter', REPORTER, { method: 'POST', headers: json, body: JSON.stringify({ criteria: { fiscal_years: [2026], activity_codes: ['R15'] }, limit: 1, offset: 0 }) }, (t) => { const d = j(t); return { total: d?.meta?.total, keys: Object.keys(d?.results?.[0] || {}).slice(0, 40) }; });
await preflight('nih_reporter_preflight', REPORTER);

// ---- USAspending: who wins a programme, by recipient type ---------------------------------------------------
const end = new Date(); const start = new Date(end.getTime() - 365 * 86400000);
const iso = (d) => d.toISOString().slice(0, 10);
const assistance = (recipientType) => ({ filters: { award_type_codes: ['02', '03', '04', '05'], time_period: [{ start_date: iso(start), end_date: iso(end) }], program_numbers: ['47.083'], recipient_type_names: [recipientType] }, limit: 5, page: 1 });
const RECIP = 'https://api.usaspending.gov/api/v2/search/spending_by_category/recipient/';
await probe('usaspending_recipients_higher_ed', RECIP, { method: 'POST', headers: json, body: JSON.stringify(assistance('higher_education')) }, (t) => { const d = j(t); return { results: d?.results?.length, first: d?.results?.[0]?.name, detail: d?.detail }; });
await probe('usaspending_recipients_nonprofit', RECIP, { method: 'POST', headers: json, body: JSON.stringify(assistance('nonprofit')) }, (t) => { const d = j(t); return { results: d?.results?.length, first: d?.results?.[0]?.name, detail: d?.detail }; });
await probe('usaspending_assistance_listings', 'https://api.usaspending.gov/api/v2/references/assistance_listing/', {}, (t) => { const d = j(t); const rows = Array.isArray(d) ? d : d?.results; return { rows: rows?.length, keys: Object.keys(rows?.[0] || {}) }; });
await preflight('usaspending_preflight', RECIP);

// ---- Foundations --------------------------------------------------------------------------------------------
// ProPublica Nonprofit Explorer: live lookup only (terms forbid redistribution); is the browser allowed in?
await probe('propublica_search', 'https://projects.propublica.org/nonprofits/api/v2/search.json?q=community+foundation', {}, (t) => { const d = j(t); return { total: d?.total_results, keys: Object.keys(d?.organizations?.[0] || {}) }; });
// IRS 990 e-file index for the current year: size, and whether the header names a return-type column (990PF).
const IRS_INDEX = `https://apps.irs.gov/pub/epostcard/990/xml/${end.getUTCFullYear()}/index_${end.getUTCFullYear()}.csv`;
await probe('irs_990_index_head', IRS_INDEX, { method: 'HEAD' }, (t, r) => ({ contentLength: r.headers.get('content-length'), lastModified: r.headers.get('last-modified') }));
await probe('irs_990_index_range', IRS_INDEX, { headers: { Range: 'bytes=0-4095' } }, (t, r) => ({ contentRange: r.headers.get('content-range'), header: t.split('\n')[0].slice(0, 300), sampleHas990PF: /990PF/.test(t) }));
// IRS exempt-organisation master file, one state file: size and header.
await probe('irs_eo_bmf_range', 'https://www.irs.gov/pub/irs-soi/eo_al.csv', { headers: { Range: 'bytes=0-2047' } }, (t, r) => ({ contentRange: r.headers.get('content-range'), header: t.split('\n')[0].slice(0, 300) }));
// GivingTuesday 990 Data Lake: is the public bucket listable without credentials?
await probe('givingtuesday_bucket', 'https://gt990datalake-rawdata.s3.amazonaws.com/?list-type=2&max-keys=5&delimiter=/', {}, (t) => ({ prefixes: (t.match(/<Prefix>([^<]+)<\/Prefix>/g) || []).slice(0, 10) }), { informational: true });

// A probe passes on any 2xx (206 included, for ranged GETs); anything else, or a network error, fails the run.
const passed = (v) => v && !v.error && typeof v.status === 'number' && v.status >= 200 && v.status < 300;
const names = Object.keys(out).filter((k) => k !== 'ranAt');
const failedProbes = names.filter((k) => !info.has(k) && !passed(out[k]));
out.failed = failedProbes;
out.informational = [...info];
const report = JSON.stringify(out, null, 2);
console.log(report);
const fs = await import('node:fs/promises');
await fs.writeFile('probe-results.json', report);
if (process.env.GITHUB_STEP_SUMMARY) {
  const note = (v) => v.error ?? v.hitCount ?? v.count ?? v.total ?? v.items ?? v.results ?? v.rows ?? v.awards ?? v.contentLength ?? v.contentRange ?? '';
  const rows = names.map((k) => { const v = out[k]; return `| ${k} | ${passed(v) ? 'ok' : info.has(k) ? 'info' : '**FAIL**'} | ${v.status ?? 'ERR'} | ${v.ms} | ${note(v)} | ${v.allowOrigin ?? ''} |`; }).join('\n');
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `## Source probe ${out.ranAt}\n\n| source | result | status | ms | note | allow-origin |\n|---|---|---|---|---|---|\n${rows}\n\n${failedProbes.length ? `**Failed:** ${failedProbes.join(', ')}` : 'All harvest and live sources returned 2xx.'}\n`);
}
if (failedProbes.length) {
  console.error(`probe failures: ${failedProbes.join(', ')}`);
  process.exitCode = 1;
}
