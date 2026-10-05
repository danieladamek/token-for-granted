# Token for Granted

Routes to grant money for universities and non-profits, with the gates on each and where the opportunities appear.

Token for Granted is a static web app for a university researcher, a research office or a non-profit that wants grant money in the United States. A pathfinder of four questions leads into a catalogue of 45 routes (six entry routes; research project grants; fellowships, career and training awards; programme and service grants; capacity and infrastructure). Every route carries its programmes with each one's status and the date it was read, the gates in front of it, the standing it needs, the rules worth reading, help, what changed in 2025–26, a saved search into the opportunity feed, and its sources. Behind the catalogue sit 565 programmes, 159 funders (94 federal and congressionally created, 65 foundations and other private grantmakers as an editorial sample), 113 standing classes, 93 gates, 272 rules, 146 help records, a dated ledger of 524 changes, an opportunity search over a nightly harvest of the Grants.gov extract, a directory of every private foundation the IRS lists, live look-ups of who has won, and a commissioned guide with every claim cited.

**Live:** https://danieladamek.github.io/token-for-granted/

> **Not legal, tax, financial or compliance advice.** A commissioned guide written by an AI research builder from 2,563 public sources; not peer reviewed, not official, no affiliation with any university, non-profit, foundation or agency. Rules, deadlines and court orders change; every record shows its own as-of date (the guide was closed 2026-10-05) and links to its governing text. Nothing here is tailored to any institution.

## Quick start

On Daniel's machine the app opens by double-clicking **`App Shortcuts/▶ Open Token for Granted.command`** (in the team folder). It runs `npm ci` when `node_modules` is missing, `npm run build` when `src`, `public` or `index.html` is newer than the last build, and `npm run preview -- --port 4190 --strictPort`; the app is then at **http://localhost:4190/**.

By hand:

```bash
npm ci
npm run build:content   # validate the content pack, link terms, emit src/data/*.json (exits 1 on pack errors; see below)
npm run build           # tsc + vite build → dist/ (BASE_PATH=/token-for-granted/ for Pages)
npm run preview -- --port 4190 --strictPort
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build:content` | `scripts/build-content.ts`: validate + link + emit; writes `content-pack/BUILD-ERRORS.md` on errors |
| `npm run build` | type-check and build `dist/` (with `404.html` for deep links) |
| `npm run harvest` | `scripts/harvest/run-all.mjs`: the nightly harvest into `public/data/` (not committed) |
| `npm run harvest:fixture` | write the small offline fixture harvest into `public/data/` |
| `npm test` | Vitest: pack schemas (one deliberate error per rule), term matcher, section and citation parser, figure data, the pathfinder, `/find` filters, the changes sorter, harvest parsers, notepad |
| `npm run test:e2e` | Playwright against `dist/` on :4173 (`BX_PORT` overrides); build with the fixture harvest first |

A local build does not need the harvest: without `public/data/`, `/find` says so and links to Grants.gov's own search, and the programme pages say the build carries no harvest.

## The content pack

`content-pack/` is the only source of content, and the app never edits it (the content build writes only `content-pack/BUILD-ERRORS.md`, the list of pack errors). The standard files follow `docs/CONTENT-PACK.md` (topic mode, v0.10); the extension files (`routes`, `programs`, `funders`, `standing`, `gates`, `help`, `mechanics`, `changes`, `queries`, `pathfinder`) and what the standard files carry beyond the builder's schema follow `content-pack/EXTENSIONS.md` (draft v0.11).

Three scripts, run in this order from this folder, rebuild the pack (from `content-pack/README.md`):

1. `python3 source/t5/assemble_t5.py source/t5 content-pack source/review/review.md` — the glossary, the primers, the figures and `review.md`.
2. `python3 source/sweeps/consolidate.py source/sweeps content-pack` — the references and every record file, with `cited_in` and `used_by`.
3. `python3 source/t5/make_manifest_scope.py content-pack` — `manifest.yaml` and `scope.yaml`.

Then `npm run build:content`. It fails loudly — non-zero exit and a list — on a schema violation, an unresolved `[n]`, an unknown term, primer, route, gate, programme, funder, standing, rule, help or change id, a programme status outside the eight, a missing data file, an ambiguous term variant, or any block of 25 words or more with no `[n]` and no `<!-- framing -->` marker (in `review.md`, a primer, a glossary definition or a record's prose). Errors go to `content-pack/BUILD-ERRORS.md` and appear on `/methods`; the app still builds from whatever validated. Never fix an uncited block by adding a citation, and never re-point an unknown id at a similar one: correct the pack. `src/data/*.json`, `public/provenance.json` and `public/figures/` are generated and committed, so a fresh clone builds without re-running the content build.

**Size.** `references.yaml` (4.9 MB) and `programs.yaml` (1.8 MB) never sit in the entry bundle: references are emitted in shards of 100 by number (full cards and slim cards), programmes in one shard per family, with a slim index of every record for lists and links; the ⌘K index is its own file, loaded on first use.

## The harvest

Two probe runs (`source/probe-2026-10-04.json`, `source/probe-2026-10-05.json`; `scripts/probe-sources.mjs`, `.github/workflows/probe-sources.yml`) settled what the sources allow: a browser cannot query Grants.gov, NIH RePORTER or ProPublica, so everything about open opportunities and foundations is harvested at night and served as files, and only USAspending and the NSF Awards API are called live, from `/funded`.

- `scripts/harvest/grants-extract.mjs` — the newest `GrantsDBExtract<YYYYMMDD>v2.zip` among the last four days (78 MB), downloaded, stream-unzipped (`yauzl`) and stream-parsed (`saxes`). The element names are read from the file itself and from the XSD it names, and written to `public/data/opportunities/schema-seen.json`. Kept: posted notices whose close date is empty or not earlier than yesterday, and every forecast — in both cases only while not yet archived, which is how the extract's count agrees with Grants.gov's own search (1,470 against 1,472 on 2026-10-05). Slim records, sharded by top-level agency (≤ 1.5 MB), an index by Assistance Listing prefix, and `index.json` with counts, the applicant-type, instrument and category labels from the `search2` facets, and the `search2` cross-check (a difference over 5 percent is reported on `/find`).
- `scripts/harvest/irs-bmf.mjs` — the IRS exempt-organisation master file, 50 states, DC and Puerto Rico. The FOUNDATION code labels are read word for word, at harvest time, from the IRS's information sheet linked from its EO BMF page (with `pdftotext`, installed in the workflow); rows whose code it labels a private foundation are kept (130,342 on 2026-10-05), sharded by state, with `top.json` (the 500 largest by assets).
- `scripts/harvest/irs-990-index.mjs` (optional) — the latest 990PF row per foundation in the year's e-file index; the filings themselves are not read.
- `scripts/harvest/federal-register.mjs`, `nsf-rss.mjs` (optional) — the "recently published" lists under `/find`.

Every harvester folds its result into `public/data/manifest.json`; a failed source exits non-zero but leaves the others' output in place, and the app names the stale feed. `.github/workflows/deploy.yml` runs the harvest on every push and daily at 09:43 UTC (after the day's extract is up); the output is built into the Pages deployment and never committed (`public/data/` is in `.gitignore`).

## Provenance

- The guide, the records, the glossary, the primers, the figures and the reference summaries were written by the Manuscript Interrogator (builder v0.10) from 2,563 public sources, each re-read against its live page on 2026-10-05 where the page allowed. The app renders them as written: it structures and links, it does not paraphrase or add facts. Gaps appear as amber `TODO(author)` markers, listed on `/methods`; the 35 synthesis sentences are marked in the reader and linked from `/methods`.
- The pathfinder implements `pathfinder.rule` exactly, from the counts in `pathfinder.yaml`, and shows the count behind each route in the rule's words. Nothing is scored otherwise, and nothing is labelled best or recommended.
- The kinds on `/gates` and `/standing` are derived from each record's own id and fields at build time; the rules are printed on the pages.
- No analytics, accounts or server. Pathfinder answers, notes and saved filters live in `localStorage`. What leaves the browser is stated where it happens: `/find` loads this site's own harvested files, and `/funded` queries `api.usaspending.gov` and `api.nsf.gov` when its buttons are pressed.
- The notepad is ported from FAR Out (itself from `ptsd-inflammation-critique`, APP-SPEC §3.1), with anchors extended to every record type here; with `notes_storage: browser` it saves to this browser only and says so.

## Sister site

[FAR Out](https://danieladamek.github.io/far-out/) — every route into federal work for a small business. Token for Granted is built on its code: the same stack, the same extension-file pattern, the same pathfinder-and-catalogue spine; none of its data, content or wording.

## Layout

```
content-pack/              the input (committed; the app never edits it)
scripts/build-content.ts   validate + link + emit (scripts/lib/: schemas, parser, linker, figures, records)
scripts/harvest/           the nightly harvest and the fixture generator
scripts/probe-sources.mjs  feed probe (exits non-zero when a required probe fails)
src/data/                  generated JSON (committed)
src/pages/                 one file per route
src/components/            reader, records, figures, notepad, find, ui
tests/unit, tests/e2e      Vitest, Playwright; tests/fixtures/minipack (a small pack) and harvest (cut from the real feeds)
.github/workflows/         deploy.yml (test → harvest → build → Pages), probe-sources.yml
```
