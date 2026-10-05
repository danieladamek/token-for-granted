# Taken for Granted — content pack

State on 2026-10-04: **all six sweep families are in** — research project grants; fellowships, career and training ("people"); programme and service grants; capacity and infrastructure; rules and gates; foundations. Nothing here has been through the recheck pass, and the pack is not yet buildable: there is no `manifest.yaml`, `scope.yaml`, `review.md`, `routes.yaml`, `glossary.yaml`, `concepts/`, `figures.yaml` or `pathfinder.yaml`.

| File | Count | Note |
|---|---|---|
| `references.yaml` | 2512 | 2412 primary, 100 secondary; 377 read in full, 2132 in part, 3 not fetched; 2492 cited by a record. All flagged `recheck: true`. Numbers 1–726 are research, 727–1106 people, 1107–1512 programme-service, 1513–1798 capacity, 1799–2118 rules, 2119–2512 foundations; they do not move. |
| `programs.yaml` | 565 | 524 federal and 41 foundation programmes; by family: research 145, people 154, programme-service 141, capacity 125 |
| `funders.yaml` | 159 | 94 federal and congressionally created funders, 65 foundations and other private grantmakers |
| `standing.yaml` | 113 | jurisdiction lists, institution designations, non-profit tax standing, the kinds of foundation |
| `gates.yaml` | 93 | |
| `help.yaml` | 146 | |
| `mechanics.yaml` | 272 | |
| `changes.yaml` | 524 | dated ledger, 2025–26 |
| `todo.yaml` | 798 | gap 342, recheck 231, unverified 106, conflict 119 |
| `queries.yaml` | 615 | every search run, by slice |
| `EXTENSIONS.md` | | the schema, draft v0.7 |
| `consolidation-report.json` | | counts and integrity checks from the last consolidation |

## Foundations

65 funder records. How each takes requests, in its own words: open-call-only 23, invitation-only 23, letter-of-inquiry 10, accepted 6, not-stated 3. The 41 foundation programmes with their own competition: closed 24, open 12, forecast 3, unconfirmed 2.

The selection is editorial: the largest national grantmakers that fund universities or non-profits, spread across kinds and fields, with examples of community and corporate foundations. It is a sample, and the site must say so.

## Programme status as of 2026-10-04

- People: open 57, closed 41, unconfirmed 19, expired 14, no-current-notice 14, forecast 6, not-competed 3.
- Programme-service: closed 60, formula 24, open 19, no-current-notice 18, forecast 17, unconfirmed 1, not-competed 1, expired 1.
- Capacity: closed 35, open 34, no-current-notice 26, forecast 8, formula 8, not-competed 7, expired 4, unconfirmed 3.
- Research: None 131, open 7, closed 6, unconfirmed 1 — the 131 federal research records were written before `status` was a field ("None"); their state is in `cycle`.

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

## Integrity, as consolidated

Every citation in a record resolves to a reference. No record id is used twice. No record points to a funder, gate, standing class or programme that does not exist. 20 references are cited by no record. 255 pages were read in more than one slice and are one reference each.

## Known debts

- The recheck pass has not run. Every quote and figure came through a summarising fetch layer.
- Programme `status` is not yet filled on the 131 federal research records.
- 106 facts rest on a non-primary source and are marked `unverified`; 119 conflicts between sources are open, among them nine foundation asset or giving figures where the foundation's own statement and its filing summary differ.
- Three sections of 2 CFR Part 200 rest on GovInfo's January 1, 2025 edition; OMB's proposed rewrite was read only in part.
- The instructions for Part XIV of Form 990-PF could not be read (the fetch layer cuts them short); the form itself was read.
- 26 records contain a second-person sentence to re-voice (listed in `consolidation-report.json`).

## How it was made

`source/sweeps/SWEEP-BRIEF-*.md` are the briefs the sweep agents read. `python3 source/sweeps/consolidate.py source/sweeps content-pack` rebuilds every file above from the sweep files and `overrides.yaml`; it renumbers, merges and relabels, and adds no facts.
