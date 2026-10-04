# Taken for Granted — content pack

State on 2026-10-04 (night): **three of six sweep families are in** — research project grants; fellowships, career and training ("people"); programme and service grants. Nothing here has been through the recheck pass, and the pack is not yet buildable: there is no `manifest.yaml`, `scope.yaml`, `review.md`, `routes.yaml`, `glossary.yaml`, `concepts/`, `figures.yaml` or `pathfinder.yaml`.

| File | Count | Note |
|---|---|---|
| `references.yaml` | 1512 | 1443 primary, 69 secondary; 282 read in full, 1227 in part, 3 not fetched; 1490 cited by a record. All flagged `recheck: true`. Numbers 1–726 are research, 727–1106 people; they do not move. |
| `programs.yaml` | 401 | research 131, people 136, programme-service 134 |
| `funders.yaml` | 85 | |
| `standing.yaml` | 55 | |
| `gates.yaml` | 54 | |
| `help.yaml` | 69 | |
| `mechanics.yaml` | 158 | |
| `changes.yaml` | 326 | dated ledger, 2025–26 |
| `todo.yaml` | 425 | gap 177, recheck 100, unverified 80, conflict 68 |
| `queries.yaml` | 392 | every search run, by slice |
| `EXTENSIONS.md` | | the schema, draft v0.4 |
| `consolidation-report.json` | | counts and integrity checks from the last consolidation |

## Programme status as of 2026-10-04

- People: open 54, closed 30, unconfirmed 18, expired 14, no-current-notice 14, forecast 3, not-competed 3.
- Programme-service: closed 55, formula 24, no-current-notice 18, forecast 17, open 17, unconfirmed 1, not-competed 1, expired 1.
- Research: the 131 records were written before `status` was a field; their state is in `cycle`.

## Slices swept

| Slice | Covers |
|---|---|
| research-A … F | NIH · NSF · DOE, DoD, NASA · NIFA, NOAA, EPA, NIST, USGS, DOT, DHS · AHRQ, CDC, FDA, HRSA, ACL, VA, PCORI, DOJ · IES, NEH, NEA, IMLS, NHPRC |
| people-A … E | NIH and AHRQ · NSF · science agencies · humanities, education, health workforce, justice · gap-filling pass |
| service-A | SAMHSA, HRSA, CDC, OASH, IHS, CMS |
| service-B | ACF, ACL, DOJ (OVW, OJP), HUD, DOL ETA, VA, FEMA, Legal Services Corporation |
| service-C | Education, AmeriCorps, NEA, NEH, IMLS, CPB, USDA, EPA, EDA, NTIA, CDFI Fund, IRS, SBA, regional commissions |
| service-D | gap-filling pass: set 24 pass-through records to `formula`, found primary sources for nine facts, added seven programmes |

## Integrity, as consolidated

Every citation in a record resolves to a reference. No record id is used twice. No record points to a funder, gate, standing class or programme that does not exist. 22 references are cited by no record. 130 pages were read in more than one slice and are one reference each.

## Known debts

- The recheck pass has not run. Every quote and figure came through a summarising fetch layer.
- Programme `status` is not yet filled on the research records.
- 80 facts rest on a non-agency source and are marked `unverified`.
- 8 records contain a second-person sentence to re-voice: `programs/acf-csbg`, `funders/dod-onr`, `help/nih-program-official`, `help/nih-matchmaker`, `help/find-your-caa`, `mechanics/nih-modular-budget`, `mechanics/nih-highlighted-topics`, `mechanics/samhsa-notice-six-steps`.
- `source/sweeps/LEADS-capacity.md`, `LEADS-foundations.md` and `LEADS-gates.md` carry the leads handed over for the sweeps still to run.

## How it was made

`source/sweeps/SWEEP-BRIEF-research.md`, `SWEEP-BRIEF-people.md` and `SWEEP-BRIEF-service.md` are the briefs the sweep agents read. `python3 source/sweeps/consolidate.py source/sweeps content-pack` rebuilds every file above from the sweep files and `overrides.yaml`; it renumbers, merges and relabels, and adds no facts.
