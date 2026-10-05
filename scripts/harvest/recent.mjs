#!/usr/bin/env node
// Two small, non-fatal feeds shown as "recently published" lists under /find (KICKOFF §4c): the newest 200 Federal
// Register notices matching "notice of funding opportunity", and the NSF funding RSS items.
//
// Usage: node scripts/harvest/recent.mjs [outDir=public/data] [federal-register|nsf-rss ...] [--fr-file f.json] [--rss-file f.xml]
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fetchOk, mergeManifest, parseRss, writeJson } from './lib.mjs';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const outDir = resolve(args[0] && !args[0].startsWith('--') && !['federal-register', 'nsf-rss'].includes(args[0]) ? args[0] : 'public/data');
const which = ['federal-register', 'nsf-rss'].filter((w) => args.includes(w));
const run = which.length ? which : ['federal-register', 'nsf-rss'];
const at = process.env.HARVEST_AT ?? new Date().toISOString();
const FR = 'https://www.federalregister.gov/api/v1/documents.json?per_page=200&order=newest&conditions[term]=%22notice+of+funding+opportunity%22&conditions[type][]=NOTICE&fields[]=title&fields[]=agencies&fields[]=publication_date&fields[]=html_url';
const RSS = 'https://www.nsf.gov/rss/rss_www_funding_pgm_annc_inf.xml';

async function federalRegister() {
  const d = flag('--fr-file') ? JSON.parse(await readFile(resolve(flag('--fr-file')), 'utf8')) : await (await fetchOk(FR, {}, 60000)).json();
  const items = (d.results ?? []).map((r) => ({ title: r.title, url: r.html_url, date: r.publication_date, agencies: (r.agencies ?? []).map((a) => a.name ?? a.raw_name).filter(Boolean) }));
  await writeJson(join(outDir, 'notices', 'federal-register.json'), { harvestedAt: at, source: 'the Federal Register API (documents matching “notice of funding opportunity”, type notice, newest first)', url: FR, items });
  return items.length;
}
async function nsfRss() {
  const xml = flag('--rss-file') ? await readFile(resolve(flag('--rss-file')), 'utf8') : await (await fetchOk(RSS, {}, 60000)).text();
  const items = parseRss(xml);
  await writeJson(join(outDir, 'notices', 'nsf-rss.json'), { harvestedAt: at, source: 'NSF’s “Program Announcements and Information” RSS feed', url: RSS, items });
  return items.length;
}

let failed = false;
for (const name of run) {
  try {
    const n = name === 'federal-register' ? await federalRegister() : await nsfRss();
    await mergeManifest(join(outDir, 'manifest.json'), name, { ok: true, count: n, url: name === 'federal-register' ? FR : RSS }, at);
    console.log(`[${name}] ${n} items`);
  } catch (e) {
    failed = true;
    console.error(`[${name}] FAILED (non-fatal): ${e.message}`);
    await mergeManifest(join(outDir, 'manifest.json'), name, { ok: false, status: e.status ?? null, message: e.message }, at).catch(() => {});
  }
}
if (failed) process.exitCode = 1;
