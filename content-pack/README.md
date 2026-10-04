# Taken for Granted — content pack

State on 2026-10-04: **four of six sweep families are in** — research project grants; fellowships, career and training ("people"); programme and service grants; capacity and infrastructure. Nothing here has been through the recheck pass, and the pack is not yet buildable: there is no `manifest.yaml`, `scope.yaml`, `review.md`, `routes.yaml`, `glossary.yaml`, `concepts/`, `figures.yaml` or `pathfinder.yaml`.

| File | Count | Note |
|---|---|---|
| `references.yaml` | 1798 | 1724 primary, 74 secondary; 303 read in full, 1492 in part, 3 not fetched; 1777 cited by a record. All flagged `recheck: true`. Numbers 1–726 are research, 727–1106 people, 1107–1512 programme-service, 1513–1798 capacity; they do not move. |
| `programs.yaml` | 524 | research 131, people 136, programme-service 134, capacity 123 |
| `funders.yaml` | 94 | |
| `standing.yaml` | 85 | includes the EPSCoR and IDeA jurisdiction lists and the institution designations |
| `gates.yaml` | 58 | |
| `help.yaml` | 85 | |
| `mechanics.yaml` | 181 | |
| `changes.yaml` | 411 | dated ledger, 2025–26 |
| `todo.yaml` | 513 | gap 221, recheck 117, unverified 89, conflict 86 |
| `queries.yaml` | 450 | every search run, by slice |
| `EXTENSIONS.md` | | the schema, draft v0.5 |
| `consolidation-report.json` | | counts and integrity checks from the last consolidation |

## Programme status as of 2026-10-04

- People: open 54, closed 30, unconfirmed 18, expired 14, no-current-notice 14, forecast 3, not-competed 3.
- Programme-service: closed 55, formula 24, no-current-notice 18, forecast 17, open 17, unconfirmed 1, not-competed 1, expired 1.
- Capacity: open 34, closed 33, no-current-notice 26, forecast 8, formula 8, not-competed 7, expired 4, unconfirmed 3.
- Research: the 131 records were written before `status` was a field; their state is in `cycle`.

## Slices swept

| Slice | Covers |
|---|---|
| research-A … F | NIH · NSF · DOE, DoD, NASA · NIFA, NOAA, EPA, NIST, USGS, DOT, DHS · AHRQ, CDC, FDA, HRSA, ACL, VA, PCORI, DOJ · IES, NEH, NEA, IMLS, NHPRC |
| people-A … E | NIH and AHRQ · NSF · science agencies · humanities, education, health workforce, justice · gap-filling pass |
| service-A … D | health agencies · human services, justice, housing, labour, veterans · education, national service, culture, community development · gap-filling pass |
| capacity-A | instrumentation, EPSCoR and IDeA, core facilities, research capacity at emerging institutions |
| capacity-B | institution designations and the programmes that depend on them (Education Titles III and V, NSF, NIH, DoD, NASA, USDA) |
| capacity-C | congressionally directed projects, non-profit capacity-building, cultural infrastructure and preservation, capital grants |
| capacity-D | gap-filling pass: eight earmark records set to `route: congressional`, fourteen statuses settled, thirteen facts moved onto primary sources, seven programmes added |

## Integrity, as consolidated

Every citation in a record resolves to a reference. No record id is used twice. No record points to a funder, gate, standing class or programme that does not exist. 21 references are cited by no record. 176 pages were read in more than one slice and are one reference each.

## Known debts

- The recheck pass has not run. Every quote and figure came through a summarising fetch layer.
- Programme `status` is not yet filled on the research records.
- 89 facts rest on a non-agency source and are marked `unverified`.
- 10 records contain a second-person sentence to re-voice: `programs/acf-csbg`, `programs/hrsa-cpf-cds-projects`, `funders/dod-onr`, `help/nih-program-official`, `help/nih-matchmaker`, `help/find-your-caa`, `help/hrsa-cds-program-mailbox`, `mechanics/nih-modular-budget`, `mechanics/nih-highlighted-topics`, `mechanics/samhsa-notice-six-steps`.
- `source/sweeps/LEADS-foundations.md` and `LEADS-gates.md` carry the leads handed over for the sweeps still to run.

## How it was made

`source/sweeps/SWEEP-BRIEF-*.md` are the briefs the sweep agents read. `python3 source/sweeps/consolidate.py source/sweeps content-pack` rebuilds every file above from the sweep files and `overrides.yaml`; it renumbers, merges and relabels, and adds no facts.
