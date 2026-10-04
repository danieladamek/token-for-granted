# Taken for Granted — content pack

State on 2026-10-04: **one of six sweep families is in.** The research project grants family has been swept in six slices and consolidated. Nothing here has been through the recheck pass, and the pack is not yet buildable: there is no `manifest.yaml`, `scope.yaml`, `review.md`, `routes.yaml`, `glossary.yaml`, `concepts/`, `figures.yaml` or `pathfinder.yaml`.

| File | Count | Note |
|---|---|---|
| `references.yaml` | 726 | 683 primary, 43 secondary; 142 read in full, 584 in part; 714 cited by a record. All flagged `recheck: true`. |
| `programs.yaml` | 131 | all `family: research` |
| `funders.yaml` | 51 | agencies, sub-agencies and offices as research grant-makers |
| `standing.yaml` | 25 | eligibility classes met in passing |
| `gates.yaml` | 29 | registrations named by the programmes; 19 statements merged under `variants` across gates, help and mechanics |
| `help.yaml` | 32 | |
| `mechanics.yaml` | 75 | |
| `changes.yaml` | 140 | dated ledger, 2025–26 |
| `todo.yaml` | 196 | gap 83, unverified 42, recheck 43, conflict 28 |
| `queries.yaml` | 244 | every search run, by slice |
| `EXTENSIONS.md` | | the schema, draft v0.2 |
| `consolidation-report.json` | | counts and integrity checks from the last consolidation |

## Slices swept

| Slice | Covers |
|---|---|
| research-A | NIH |
| research-B | NSF |
| research-C | DOE, DoD, NASA |
| research-D | USDA NIFA, NOAA, EPA, NIST, USGS, DOT, DHS |
| research-E | AHRQ, CDC, FDA, HRSA, ACL, VA, PCORI, DOJ |
| research-F | IES, NEH, NEA, IMLS, NHPRC |

## Integrity, as consolidated

Every citation in a record resolves to a reference. No record id is used twice. No record points to a funder, gate, standing class or programme that does not exist. 12 references are cited by no record. Three pages were read in two slices and are one reference each.

## Known debts

- The recheck pass has not run. Every quote and figure came through a summarising fetch layer.
- 5 records contain a second-person sentence to re-voice: `funders/dod-onr`, `help/nih-program-official`, `help/nih-matchmaker`, `mechanics/nih-modular-budget`, `mechanics/nih-highlighted-topics`.
- Programme `status` (open, closed, expired) is not yet a field on these records; see EXTENSIONS.md.
- Each sweep note under `source/sweeps/` ends with a "For other sweeps" list and a Gaps section. Those lists are the starting point for the people, capacity and programme-service sweeps.

## How it was made

`source/sweeps/SWEEP-BRIEF-research.md` is the brief every sweep agent read. `source/sweeps/consolidate.py <sweeps-dir> <pack-dir>` rebuilds every file above from the sweep files; it renumbers and merges and adds no facts.
