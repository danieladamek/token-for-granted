# Taken for Granted — content pack

State on 2026-10-04: **five of six sweep families are in** — research project grants; fellowships, career and training ("people"); programme and service grants; capacity and infrastructure; rules and gates. Foundations remains. Nothing here has been through the recheck pass, and the pack is not yet buildable: there is no `manifest.yaml`, `scope.yaml`, `review.md`, `routes.yaml`, `glossary.yaml`, `concepts/`, `figures.yaml` or `pathfinder.yaml`.

| File | Count | Note |
|---|---|---|
| `references.yaml` | 2118 | 2032 primary, 86 secondary; 372 read in full, 1743 in part, 3 not fetched; 2098 cited by a record. All flagged `recheck: true`. Numbers 1–726 are research, 727–1106 people, 1107–1512 programme-service, 1513–1798 capacity, 1799–2118 rules; they do not move. |
| `programs.yaml` | 524 | research 131, people 136, programme-service 134, capacity 123 |
| `funders.yaml` | 94 | |
| `standing.yaml` | 97 | jurisdiction lists, institution designations, non-profit tax standing |
| `gates.yaml` | 85 | registrations, submission systems, assurances; 42 gate, mechanics and help records were given their full form by the rules sweep |
| `help.yaml` | 129 | |
| `mechanics.yaml` | 237 | includes the Uniform Guidance section by section, indirect costs, termination and its remedies |
| `changes.yaml` | 470 | dated ledger, 2025–26 |
| `todo.yaml` | 644 | gap 272, recheck 180, unverified 95, conflict 97 |
| `queries.yaml` | 523 | every search run, by slice |
| `EXTENSIONS.md` | | the schema, draft v0.6 |
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
| capacity-A … D | research capacity · designated institutions · non-profit capacity and capital, earmarks · gap-filling pass |
| rules-A | what a grant is; 2 CFR Part 200 section by section; indirect costs; the 2026 proposed rewrite; Executive Order 14332; termination and where a grantee may sue; certifications added in 2025–26; appropriations |
| rules-B | SAM.gov and the Unique Entity ID; Grants.gov and Simpler.Grants.gov; the agency submission and payment systems; ORCID, SciENcv and the Common Forms; subaward reporting; help desks |
| rules-C | human-subjects and animal-welfare assurances; conflict of interest; research misconduct; research security; data and public access; the assurances every applicant signs; 501(c)(3) recognition and keeping it; financial readiness for a first award; free help |
| rules-D | gap-filling pass: confirmed the Part 200 figures against the current eCFR text for ten sections; read section 157 of Public Law 119-103; 36 records completed |

## Integrity, as consolidated

Every citation in a record resolves to a reference. No record id is used twice. No record points to a funder, gate, standing class or programme that does not exist. 20 references are cited by no record. 243 pages were read in more than one slice and are one reference each. Three gates recorded under two ids each carry `same_as` pointing at the full record (`uei`, `sciencv`, `nsf-id`).

## Known debts

- The recheck pass has not run. Every quote and figure came through a summarising fetch layer.
- Programme `status` is not yet filled on the research records.
- 95 facts rest on a non-agency source and are marked `unverified`.
- Three sections of 2 CFR Part 200 (200.204, 200.306, 200.344) could not be re-read on the current eCFR, which was returning errors; they rest on GovInfo's January 1, 2025 edition and the eCFR version record.
- OMB's proposed rewrite was read only in part: the fetch layer cuts the Federal Register document short.
- 15 records contain a second-person sentence to re-voice (listed in `consolidation-report.json`).
- `source/sweeps/LEADS-foundations.md` carries the leads handed over for the last sweep.

## How it was made

`source/sweeps/SWEEP-BRIEF-*.md` are the briefs the sweep agents read. `python3 source/sweeps/consolidate.py source/sweeps content-pack` rebuilds every file above from the sweep files and `overrides.yaml`; it renumbers, merges and relabels, and adds no facts.
