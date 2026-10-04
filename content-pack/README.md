# Taken for Granted — content pack

State on 2026-10-04 (evening): **two of six sweep families are in** — research project grants, and fellowships, career and training ("people"). Nothing here has been through the recheck pass, and the pack is not yet buildable: there is no `manifest.yaml`, `scope.yaml`, `review.md`, `routes.yaml`, `glossary.yaml`, `concepts/`, `figures.yaml` or `pathfinder.yaml`.

| File | Count | Note |
|---|---|---|
| `references.yaml` | 1106 | 1058 primary, 48 secondary; 187 read in full, 919 in part; 1086 cited by a record. All flagged `recheck: true`. Numbers 1–726 are the research family and do not move. |
| `programs.yaml` | 267 | research 131, people 136 |
| `funders.yaml` | 60 | |
| `standing.yaml` | 44 | |
| `gates.yaml` | 43 | |
| `help.yaml` | 49 | |
| `mechanics.yaml` | 126 | |
| `changes.yaml` | 237 | dated ledger, 2025–26 |
| `todo.yaml` | 334 | gap 139, recheck 76, unverified 66, conflict 53 |
| `queries.yaml` | 328 | every search run, by slice |
| `EXTENSIONS.md` | | the schema, draft v0.3 |
| `consolidation-report.json` | | counts and integrity checks from the last consolidation |

## Programme status, people family (as of 2026-10-04)

open 54, closed 30, unconfirmed 18, expired 14, no-current-notice 14, forecast 3, not-competed 3. The research family's 131 records were written before `status` was a field; their state is in `cycle`.

## Slices swept

| Slice | Covers |
|---|---|
| research-A … F | NIH · NSF · DOE, DoD, NASA · NIFA, NOAA, EPA, NIST, USGS, DOT, DHS · AHRQ, CDC, FDA, HRSA, ACL, VA, PCORI, DOJ · IES, NEH, NEA, IMLS, NHPRC |
| people-A | NIH and AHRQ fellowships, career development, training, loan repayment |
| people-B | NSF: CAREER, GRFP, postdoctoral fellowships, traineeships, research experiences |
| people-C | DOE, DoD, NASA, NIFA, NOAA, EPA, NIST, USGS, Smithsonian, DHS |
| people-D | NEH, NEA, IMLS, Education, State (Fulbright), HRSA, SAMHSA, ACL, NIJ, Library of Congress, Wilson Center |
| people-E | gap-filling pass after the fetch layer rate-limited the four slices; it added seven programmes and completed 26 records in A–D |

## Integrity, as consolidated

Every citation in a record resolves to a reference. No record id is used twice. No record points to a funder, gate, standing class or programme that does not exist. 20 references are cited by no record. 77 pages were read in more than one slice and are one reference each.

## Known debts

- The recheck pass has not run. Every quote and figure came through a summarising fetch layer.
- Fourteen people programmes are `no-current-notice`: an absence on Grants.gov or the funder's page, not a funder statement. Eighteen are `unconfirmed`.
- Programme `status` is not yet filled on the research records.
- 5 records contain a second-person sentence to re-voice: `funders/dod-onr`, `help/nih-program-official`, `help/nih-matchmaker`, `mechanics/nih-modular-budget`, `mechanics/nih-highlighted-topics`.
- `source/sweeps/LEADS-capacity.md`, `LEADS-programme-service.md`, `LEADS-foundations.md` and `LEADS-gates.md` carry the leads handed over for the sweeps still to run.

## How it was made

`source/sweeps/SWEEP-BRIEF-research.md` and `SWEEP-BRIEF-people.md` are the briefs the sweep agents read. `python3 source/sweeps/consolidate.py source/sweeps content-pack` rebuilds every file above from the sweep files and `overrides.yaml`; it renumbers, merges and relabels, and adds no facts.
