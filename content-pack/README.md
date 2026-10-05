# Token for Granted — content pack

State on 2026-10-05: **the pack is complete and validates** (`python3 tools/validate_pack.py apps/token-for-granted/content-pack`: 0 errors). All six sweep families are in (research project grants; fellowships, career and training, called "people"; programme and service grants; capacity and infrastructure; rules and gates; foundations), every source from the sweeps has been through the recheck pass, every programme has a status, and the routes, the pathfinder, the main text, the glossary, the primers, the figures, the manifest and the scope are written.

| File | Count | Note |
|---|---|---|
| `manifest.yaml` | | topic mode, delivery `pages`, notes in the browser, `concept_self_checks: false`, the extension files, and what the opportunity search may draw on |
| `scope.yaml` | | what was asked and ruled, what is in and out, the 615 queries, the corpus profile, the known gaps |
| `references.yaml` | 2563 | 2463 primary, 100 secondary; 380 read in full, 2180 in part, 3 not fetched; 2541 in use (`used_by`: a record, a glossary entry or a primer; `cited_in`: the 1,212 that a section of the main text or a figure cites). Tiers: 16 seminal (each with `why_it_mattered`), 67 classic, 2019 current, 461 background. Roles (`role_here`) are assigned by rule. Rechecked 2026-10-05: 2397 cleared (`recheck: false`), 166 still flagged: 12 pages that refused, 90 with an item the second reading did not confirm, and 64 from the status pass (51 pages read once on 2026-10-05, after the recheck, and 13 earlier pages to which that pass added a fact). 2653 quotes. Numbers 1–726 are research, 727–1106 people, 1107–1512 programme-service, 1513–1798 capacity, 1799–2118 rules, 2119–2512 foundations, 2513–2563 the status pass; they do not move. |
| `review.md` | 12 sections | the guide's main text: an abstract and eleven sections, about 10,250 words of prose (12,100 counting citation numbers), 416 references cited, 35 sentences marked as synthesis, ten figure markers. Written by hand and by section writers from the pack's records; `source/t5/assemble_t5.py` places the figure markers |
| `glossary.yaml` | 209 | terms a newcomer trips on, each with a popover text and a cited definition written from the pack's records; `domain` sorts them (organisation 54, process 39, law 38, standing 25, notation 17, cost 14, programme 9, role 8, status 5); six are labels of the guide's own (`own_label: true`) |
| `concepts/` | 11 | the primers. No self-check questions |
| `figures.yaml`, `figures/` | 10 | eight data figures (a CSV each, every row with its record and its references) and two diagrams (nodes and edges); one drawing script each |
| `routes.yaml` | 45 | 6 entry routes, then research 13, people 9, programme-service 10, capacity 7; every programme is on at least one |
| `pathfinder.yaml` | | four questions, the ranking rule, the display rules, and for each route the counts the ranking uses |
| `programs.yaml` | 565 | 524 federal and 41 foundation programmes; by family: research 145, people 154, programme-service 141, capacity 125 |
| `funders.yaml` | 159 | 94 federal and congressionally created funders, 65 foundations and other private grantmakers |
| `standing.yaml` | 113 | jurisdiction lists, institution designations, non-profit tax standing, the kinds of foundation |
| `gates.yaml` | 93 | |
| `help.yaml` | 146 | |
| `mechanics.yaml` | 272 | |
| `changes.yaml` | 524 | dated ledger, 2025–26 |
| `todo.yaml` | 902 | gap 342, recheck 330, unverified 106, conflict 124; the 104 with ids starting `tr-` come from the recheck. Each entry also carries the builder's `where`, `what` and `owner` |
| `queries.yaml` | 615 | every search run, by slice |
| `EXTENSIONS.md` | | the schema, draft v0.11 |
| `consolidation-report.json` | | counts and integrity checks from the last consolidation |

## The recheck (2026-10-05)

Each of the 2,512 sources was fetched again and its stored quotes and facts put to the page, one source at a time (`source/recheck/PROTOCOL.md`; verdicts in `source/recheck/verdicts-*.jsonl`).

| | Count | Share |
|---|---|---|
| Pages re-read | 2,500 of 2,512 | 99.5% |
| Pages that refused (nine eCFR sections, two acf.gov pages, one pcori.org page) | 12 | |
| Quotes found word for word | 2,618 of 2,707 put to a page | 96.7% |
| Quotes not word for word, removed from the pack | 89 | |
| Facts confirmed in full | 9,289 of 9,973 put to a page | 93.1% |
| Facts confirmed in part, nothing contradicted | 559 | 5.6% |
| Facts not found on the page as re-read | 120 | 1.2% |
| Facts the page contradicts, still open | 5 | |
| Facts corrected after a second reading by hand | 14 | |

Three limits on what this shows. The second reading went through the same summarising fetch layer as the first, so it is a second opinion and not a reading of raw pages. For 1,077 sources the fetch returned only part of the page (long PDFs, rules, paged lists), and the verdict covers the part returned. And the fetch layer's "contradicted" verdicts were often wrong: of 38, 14 were differences of label or wording, 4 were misreadings shown by a re-read by hand, 1 was a page date the fetch layer gave differently each time, 14 were real and are corrected, and 5 are still open. Eight confirmed facts drawn at random and re-asked by hand without stating the stored value all held.

The 14 corrections are listed with their evidence in `source/recheck/corrections-applied.json`. They include: a HUD technical-assistance forecast that grew to 60 awards and $115,640,000; two SAMHSA listings whose figure sits under Award Minimum, not the ceiling; 2 CFR 200.308, where the agency "should", not "must", answer a revision request within 30 days; and the DOE conflict-of-interest rule's fifteen days, not fifteen business days.

Each reference now carries `rechecked`, `recheck_result`, `fact_check` (one code per key fact: C confirmed, S in part, N not found, X contradicted, - not re-read) and `recheck` (true while an item is unconfirmed).

## Foundations

65 funder records. How each takes requests, in its own words: open-call-only 23, invitation-only 23, letter-of-inquiry 10, accepted 6, not-stated 3. The 41 foundation programmes with their own competition: closed 24, open 12, forecast 3, unconfirmed 2.

The selection is editorial: the largest national grantmakers that fund universities or non-profits, spread across kinds and fields, with examples of community and corporate foundations. It is a sample, and the site must say so.

## The main text (`review.md`)

Eleven sections and an abstract: why the word "grant" covers several systems; how grant money moves; the rules underneath; the research funders; money that follows a person; funding a programme or a service; foundations; standing and capacity; the gates; what changed in 2025–26; and how to read the material. The outline was shown to the author on 2026-10-05 before any prose was written.

Sections 2 to 10 were drafted by nine writers, each from a file of the pack records its section rests on (`source/review/input-N.yaml`) under one brief (`source/review/REVIEW-BRIEF.md`), and checked by `source/review/check_section.py`: every paragraph of 25 words or more cited, every cited number present in the section's input, no advice, no second person. The editor read every section in full, made seven edits (among them replacing a statement the status pass had overtaken, and taking the pack's own bookkeeping out of the prose), and wrote the abstract and sections 1 and 11. `source/review/section-N.md` are the drafts and `source/review/edited/` the text as assembled.

Twenty-four of the 416 references the text cites are still flagged by the recheck, among them the eCFR pages for 2 CFR 200.1, 200.204 and 200.414, which refused every re-reading. Three rules the text leans on were re-read by hand on 2026-10-05 in GovInfo's 2025 edition of title 2 and held: negotiated rates must be accepted and the de minimis rate is up to 15 percent (200.414), the single audit threshold is $1,000,000 (200.501), and 200.340 lists four grounds for termination and does not contain the words "for convenience".

On 2026-10-05, while the figures were being built, one sentence in section 1 and one in section 6 were found to say more than their sources: they had SAMHSA, HRSA and the Education Department each stating that they take no application from a non-profit, where the three pages name only who receives the grant. Both now say what the pages say, and quote the two federal pages that do put it in words (HUD on the Community Development Block Grant, FEMA on the Nonprofit Security Grant Program). The same wording was corrected in two routes.

## Glossary, primers and figures (2026-10-05)

All three were written from the pack and nothing else, through a lookup tool over the record files (`source/t5/packtool.py`) and under briefs that forbid the web and memory (`source/t5/COMMON.md` and the three briefs beside it). A checker (`source/t5/check_t5.py`) refuses a citation that no named basis record carries, and reports every number, date and quotation it cannot find in the basis records or the cited references; each such report was fixed or read and kept. `source/t5/basis.yaml` lists the records behind every glossary entry and primer.

**Glossary.** 211 terms were planned in six slices (`source/t5/terms-plan.yaml`). Two were dropped because the pack holds no reference that describes them (USAspending.gov and NIH RePORTER, which the site's search uses and will describe on its own page). Two kind labels on the funder records (independent and family foundation) have no definition in the pages read, so their entries say they are the guide's own labels. 79 terms do not occur in the main text; they occur in the records, where the site also links them.

**Primers.** Eleven: grants, cooperative agreements and contracts; reading a funding notice; who applies; registrations; the Uniform Guidance; indirect costs (the only one with a formula); review and decision; formula money and pass-through; foundations; standing; law in motion. Each has a "What it is", a picture described in words, and "How this guide uses it". They carry no self-check questions: the author asked for that on 2026-10-05, and the builder now treats the questions as something to add (`manifest.concept_self_checks`, default `false`). The editor read all eleven in full.

**Figures.** Figure 1, four systems behind the word "grant" (diagram). Figure 2, who reads an application and who decides at NIH, NSF and SAMHSA (diagram). Figure 3, federal indirect cost rules and the 2025 caps with the status of each (26 rows). Figure 4, stipends as each notice states them (58 rows from 46 programmes). Figure 5, formula and pass-through programmes and the body a non-profit applies to (44 rows). Figure 6, how the 65 foundations take requests, by kind. Figure 7, what 27 foundations say they pay toward indirect costs (50 rows). Figure 8, which states and territories are on each of six agencies' EPSCoR or IDeA lists (40 rows). Figure 9, how long registrations take as the official pages state it (40 rows from 17 gates). Figure 10, the 477 dated change records by status. Figures 6 and 10 are counted straight from the records by `source/t5/make_figures.py`; the others were extracted row by row by a writer and checked. Every data row names the record it came from. A count, and a figure restated as a plain number for sorting, are the only things computed. `figures/scripts/` holds one matplotlib script per figure that draws it from its data file.

**After the first build (2026-10-05).** The app's content build found seven errors in the pack that the validator had passed, and both are fixed at the source. Six entries of `queries.yaml` had their fields shifted, a date sitting under `hits`, because six lines of one sweep note leave the engine out; `consolidate.py` now places each field by what it is. The glossary entry `status-label` was 144 words with no citation; it now ends with a dated, cited example of how one label was reached. The validator has since been given both checks (CONTENT-PACK v0.10.2). `scope.yaml`'s anchors now carry `refs`, the reference numbers each anchor stands for, so that the app can mark them on reference cards.

## Routes and the pathfinder

A route is one entry pattern: a kind of reader going after a kind of money through a kind of door. Each gathers the programmes, funders, eligibility classes, gates, rules, help and dated changes that belong to it, and says in plain words what it is, who it is for, how it works and what changed in 2025–26. The 45 were written from the records of this pack and nothing else: a checker (`source/routes/check_routes.py`) refuses any cited number that no record linked to the route cites.

Three rulings by the author on 2026-10-05 shape them. A route page lists the programmes a reader can act on (open, forecast, closed for this cycle but continuing, or paid by formula through a state), and search reaches the rest. For formula money the guide names the body a non-profit applies to and stops there. The 65 foundations are a labelled sample.

The pathfinder asks who is asking, what the money is for, where the applicant stands and which kind of funder. It ranks family routes by how many of their programmes carry both of the first two answers in their own records, and shows that count. It recommends nothing.

## Programme status

All 565 programmes carry a status: open 177, closed 171, no-current-notice 82, forecast 40, formula 32, unconfirmed 26, expired 25, not-competed 12. People, programme-service and capacity are as read on 2026-10-04; the 131 federal research records were read on 2026-10-05 and carry `status_as_of`, `status_note` and, where a page gave one, `next_date`.


- People: open 57, closed 41, unconfirmed 19, expired 14, no-current-notice 14, forecast 6, not-competed 3.
- Programme-service: closed 60, formula 24, open 19, no-current-notice 18, forecast 17, unconfirmed 1, not-competed 1, expired 1.
- Capacity: closed 35, open 34, no-current-notice 26, forecast 8, formula 8, not-competed 7, expired 4, unconfirmed 3.
- Research: open 67, closed 35, no-current-notice 24, forecast 9, expired 6, unconfirmed 3, not-competed 1. Sixteen of the federal records carry `status_change`, a sentence on what the page showed on 2026-10-05 that the record's `cycle` of the day before did not: among them forecasts for the NIOSH R01 and R21 and for three NIDILRR competitions, an open FDA natural-history notice, and the retirement of ARPA-E's own notice site.

## Slices swept

| Slice | Covers |
|---|---|
| research-A … F | NIH · NSF · DOE, DoD, NASA · NIFA, NOAA, EPA, NIST, USGS, DOT, DHS · AHRQ, CDC, FDA, HRSA, ACL, VA, PCORI, DOJ · IES, NEH, NEA, IMLS, NHPRC |
| people-A … E | NIH and AHRQ · NSF · science agencies · humanities, education, health workforce, justice · gap-filling pass |
| service-A … D | health agencies · human services, justice, housing, labour, veterans · education, national service, culture, community development · gap-filling pass |
| capacity-A … D | research capacity · designated institutions · non-profit capacity and capital, earmarks · gap-filling pass |
| rules-A … D | the Uniform Guidance and the rules underneath · registrations and systems · compliance and non-profit standing · gap-filling pass |
| foundations-A | 26 private funders of research, scholarship and researchers, with their best-known competitions |
| foundations-B | 25 national funders of non-profit programmes, services, arts and community work |
| foundations-C | the kinds of foundation; the tax rules that shape giving; how to read a Form 990-PF; finding foundations without paying; community and corporate foundations and federal-agency foundations as examples |
| foundations-D | gap-filling pass: what the public filing data carries; own-document figures for the twelve largest |
| routes X, R, P, S, C | the 45 routes: entry routes, research, people, programme-service, capacity; and the watch pass that rewrote each route's account of 2025–26 from the full change records |
| status-A … C | the status pass of 2026-10-05 over the 131 federal research programmes: NIH and NSF · the science and mission agencies · health, justice, education and culture. Sources only; the findings are in `status-research-?.yaml` |

## Integrity, as consolidated

Every citation in a record, a glossary entry, a primer, a figure and the main text resolves to a reference. No record id is used twice. No record points to a funder, gate, standing class or programme that does not exist. 22 references are used nowhere (read, then not needed). 268 pages were read in more than one slice and are one reference each. The builder's validator and the app's own content build (`npm run build:content`) both report 0 errors. The validator gives 68 warnings: those 22 references, one that only a todo entry cites, and 45 sources in the tier current that are dated before 2024 (older notices and pages still in force).

## Known debts

- The recheck ran through the same summarising fetch layer as the sweeps. 102 references stay flagged from it: 12 pages refused (nine eCFR sections among them, which were answering 503 on the day) and 90 hold a fact the second reading did not find. Five contradictions are open (`tr-*-f*` in `todo.yaml`). With the 64 from the status pass, 166 references carry `recheck: true`.
- Eight formula-programme records say that the federal agency takes no application from a non-profit where the page read names only who receives the grant (the SAMHSA block grants, Title V, 21st Century Community Learning Centers, IMLS Grants to States and others). The statement follows from who is eligible and is not a quotation; the main text, the routes, the glossary and the primers no longer say that the agency "states" it.
- The 16 references in the tier seminal were chosen by the editor; 235 other governing texts are carried as background with their original tier in `tier_note`. `role_here` is assigned by rule from the kind of source and its host, not judged one by one.
- Two records code a foundation more narrowly than its own words: Doris Duke is coded letter-of-inquiry and says it does accept unsolicited proposals; MacArthur is coded invitation-only and reviews unsolicited proposals that meet its guidelines. The counts 6, 10, 23, 23 and 3 rest on those codes; each record's note gives the wording.
- Executive Order 14332 is marked final on five change records and pending-implementation on one. NIH's FY 2026 programme level is given as $46.5 billion in one reference and $47.5 billion in another.
- Figure 2's SAMHSA lane rests on one fiscal year 2026 notice and SAMHSA's review page.
- The pathfinder has no question about field, so a researcher's first two answers return most of the research routes. Programme records carry free `fields` tags that could feed one.
- The editor read six routes in full and the 2025–26 passage of seven more; the rest rests on the checker, which tests citations and wording, not judgement.
- The status pass was a single reading on one day. Status goes stale fastest of anything here; the site should show `status_as_of` beside it, and the nightly harvest should overwrite it where a programme can be matched to a Grants.gov notice.
- 26 programmes are `unconfirmed`. For the two federal research ones, ARPA-E and VA Merit Review, the notices sit on sites the fetch layer cannot read.
- 106 facts rest on a non-primary source and are marked `unverified`; 119 conflicts between sources are open, among them nine foundation asset or giving figures where the foundation's own statement and its filing summary differ.
- Three sections of 2 CFR Part 200 rest on GovInfo's January 1, 2025 edition; OMB's proposed rewrite was read only in part.
- The instructions for Part XIV of Form 990-PF could not be read (the fetch layer cuts them short); the form itself was read.
- 29 records contain a second-person sentence to re-voice; three of them only quote a page or name a page title or a tool (listed in `consolidation-report.json`).

## How it was made

Three scripts, run in this order from the app folder, rebuild the pack:

1. `python3 source/t5/assemble_t5.py source/t5 content-pack source/review/review.md` writes `glossary.yaml`, `concepts/`, `figures.yaml`, `figures/` and `review.md` (the main text with its figure markers) from the files in `source/t5/`.
2. `python3 source/sweeps/consolidate.py source/sweeps content-pack` rebuilds the references and every record file, and fills `cited_in` and `used_by` from the files step 1 wrote.
3. `python3 source/t5/make_manifest_scope.py content-pack` writes `manifest.yaml` and `scope.yaml`, counting from the pack.

`python3 source/t5/make_figures.py content-pack source/t5/figures` recounts the data of Figures 6 and 10 when the records change.

`source/sweeps/SWEEP-BRIEF-*.md` are the briefs the sweep agents read, `STATUS-BRIEF.md` the brief for the status pass, and `source/routes/ROUTES-BRIEF.md` and `WATCH-BRIEF.md` the briefs for the routes. `python3 source/sweeps/consolidate.py source/sweeps content-pack` rebuilds every file above from the sweep files and `overrides.yaml`; it renumbers, merges and relabels, applies the recheck verdicts in `source/sweeps/recheck.json` and the statuses in `source/sweeps/status-research-?.yaml`, builds `routes.yaml` from `source/sweeps/routes-?.yaml` and `pathfinder.yaml` from `pathfinder-head.yaml` and the programme records, sets each reference's tier and role (`source/sweeps/seminal.yaml` lists the 16 kept as seminal), and adds no facts. `source/recheck/build_recheck.py` writes that file from the verdict files and `adjudications.json`.
