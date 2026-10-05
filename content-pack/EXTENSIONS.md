# Token for Granted content pack — extension schema (draft v0.10, 2026-10-05)

Token for Granted is `mode: topic` with extension files, on the pattern FAR Out set (`apps/far-out/content-pack/EXTENSIONS.md`). Standard files follow docs/CONTENT-PACK.md (manifest.yaml, scope.yaml, review.md, references.yaml, glossary.yaml, concepts/, figures.yaml, todo.yaml). This file says only what differs from FAR Out. Every field marked *cited* carries `[n]` markers; an uncited prose block fails the build.

Draft. Proposed by Claude, not yet ruled on by Daniel (requirements §5). v0.2 adds what the six research sweeps showed was missing; see the last section. The working copy is this file; `source/token-for-granted-pack-schema.md` points here.

## Files

| File | Holds | FAR Out counterpart |
|---|---|---|
| `routes.yaml` | one record per entry pattern, four families | `routes.yaml` |
| `programs.yaml` | funding programmes and mechanisms | `programs.yaml` |
| `funders.yaml` | federal agencies and sub-agencies; foundations | `buyers.yaml` |
| `standing.yaml` | eligibility classes for institutions, investigators and non-profits | `certifications.yaml` |
| `gates.yaml` | registrations and compliance | `gates.yaml` |
| `help.yaml` | free help | `help.yaml` |
| `mechanics.yaml` | parts of an application and of the process | `mechanics.yaml` |
| `changes.yaml` | dated ledger of what changed and what is pending | `changes.yaml` |
| `pathfinder.yaml` | questions, tags and the ranking rule | `pathfinder.yaml` |
| `queries.yaml` | every search run | `queries.yaml` |

No `primes.yaml`.

## Shared vocabularies

```yaml
family:   research | people | programme-service | capacity
funder_kind: federal | foundation
who:      faculty-investigator | early-career | research-office | nonprofit-programmes | nonprofit-research
purpose:  research-project | person | service | capacity | operating
stage:    never-applied | applied-unfunded | funded-once | established
applicant_types:            # Grants.gov applicant-type codes, so a record can drive a /find filter
  public-higher-ed: '06'
  private-higher-ed: '20'
  nonprofit-501c3: '12'
  nonprofit-other: '13'
  unrestricted: '99'
pending_status: proposed | announced | final | pending-implementation | enjoined | vacated | on-appeal | frozen-by-appropriations
```

The applicant-type codes are to be confirmed against the extract's own schema when the probe has run.

## references.yaml

As FAR Out, with the tiers read for this field:

- `seminal` — statute, public law, 2 CFR and other CFR text, executive orders, court opinions, an agency's governing policy guide (NIH Grants Policy Statement, NSF PAPPG).
- `classic` — standing guidance older than the window (pre-2024) the field still leans on.
- `current` — agency pages, funding notices, policy notices, foundation guidelines dated 2024–2026.
- `background` — CRS and GAO reports, association explainers, glossaries, press releases.

`source_kind: secondary` covers trade press, law firms, consultants, university research-office pages and advocacy trackers. A secondary source never carries a fact alone. A foundation's own site and its own filing are primary for that foundation; a third-party directory is secondary.

## programs.yaml

FAR Out's fields, plus those marked `# new`.

```yaml
- id: nih-r15-area                 # kebab-case, unique
  name: NIH Research Enhancement Award (R15)
  family: research
  kind: mechanism                  # mechanism | program | fellowship | training | center | instrumentation | foundation-program
  funder: nih                      # funders.yaml id                                   # new
  funder_kind: federal             #                                                   # new
  owner: National Institutes of Health (HHS)
  what: >                          # plain layer, 2–4 sentences, cited
  funds: grant                     # grant | cooperative-agreement | fellowship | contract | gift
  mechanism_code: R15              # activity code or programme number as the funder gives it   # new
  assistance_listings: ['93.859']  # ties the record to /find and /funded              # new
  who_may_apply:                   #                                                   # new
    applicant_types: [public-higher-ed, private-higher-ed]
    standing: [undergraduate-focused-institution]   # standing.yaml ids
    investigator: '… [n]'          # career stage, citizenship, appointment, as stated, cited
    limits: '… [n]'                # applications per institution or per investigator, as stated
  cycle:
    pattern: '… [n]'               # standing receipt dates, annual solicitation, rolling, by invitation
    current_notices:
    - id: PAR-25-134
      opens: '2026-01-25'
      closes: '2028-05-08'
      note: '… [n]'
  awards:                          # amounts and periods exactly as stated, cited
  - label: direct costs over the project period
    amount: '$375,000'
    duration: 'up to 3 years'
    cite: [n]
  indirect_costs: '… [n]'          # allowed at the negotiated rate, capped, or not allowed; as stated   # new
  cost_sharing: '… [n]'            #                                                   # new
  review: '… [n]'                  # who reviews and against which criteria            # new
  success:                         # only as published; never an estimate              # new
  - rate: '19.4%'
    fiscal_year: 2025
    cite: [n]
  steps:
  - '… [n]'
  portal: https://…
  gates: [sam-registration, grants-gov-registration, era-commons]
  who: [faculty-investigator]      # pathfinder tags
  purpose: [research-project]
  stage: [never-applied, applied-unfunded]
  fields: [biomedical]             # free tags; 'any' when unrestricted
  pending_changes:
  - status: proposed
    date: '2026-08-14'
    text: '… [n]'
  distinctive: '… as the funder itself frames it [n]'
  official_url: https://…
  as_of: '2026-10-04'
  sources: [n, n]
  conflicts:
  - '… [n] vs [n]'
```

## funders.yaml

```yaml
- id: nih
  name: National Institutes of Health
  funder_kind: federal
  parent: HHS                      # federal only
  what: >                          # plain layer, cited
  how_it_decides: '… [n]'          # peer review, programme staff, council, board; as the funder describes it
  cycle: '… [n]'
  who_to_talk_to: '… [n]'          # programme officers, grants management, a foundation's programme staff
  where_it_posts: '… [n]'
  budget:                          # as published
  - amount: '$47.5 billion'
    fiscal_year: 2026
    cite: [n]
  policy_guide: https://…          # the governing guide, if one exists
  programs: [nih-r01, nih-r15-area]
  pending_changes: []
  official_url: https://…
  as_of: '2026-10-04'
  sources: [n]

- id: example-foundation
  name: …
  funder_kind: foundation
  foundation_kind: independent     # independent | family | community | corporate | operating
  ein: '00-0000000'                # ties the record to /funded
  what_it_funds: '… in its own words [n]'
  unsolicited: accepted            # accepted | letter-of-inquiry | invitation-only | not-stated; from its own site or filing, cited
  how_to_approach: '… [n]'
  typical_grant: '… [n]'           # size and term from its own reports or its 990-PF, with the year
  giving:
  - amount: '$…'
    year: 2025
    cite: [n]
  geography: '… [n]'
  fields: [health, education]
  official_url: https://…
  as_of: '2026-10-04'
  sources: [n]
```

## standing.yaml

```yaml
- id: nsf-epscor-jurisdiction
  name: NSF EPSCoR jurisdiction
  applies_to: institution          # institution | investigator | nonprofit
  what: >                          # cited
  who_qualifies: '… [n]'           # the rule and, where the funder publishes it, the list
  how_decided: '… [n]'             # set by statute, by a funder's table, or by self-certification
  opens: [nsf-epscor-rii]          # program ids this standing opens
  official_url: https://…
  pending_changes: []
  as_of: '2026-10-04'
  sources: [n]
```

## routes.yaml, gates.yaml, help.yaml, mechanics.yaml, changes.yaml, todo.yaml

Field style as FAR Out. A route carries `family`, `funder_kind` (one or both), `who`, `purpose`, `stage`, `gates`, `programs`, `standing`, and a `find_filter` whose `feed` is one of `grants | federal-register | foundations`.

## pathfinder.yaml

FAR Out's rule, with new questions: who (single) · purpose (single) · stage (single) · funder kind (federal, foundation, either) · field (multi) · institution standing (multi, from `standing.yaml`). Score = matched who, purpose and stage tags (2 each) + matched modifiers (1 each). Routes scoring 0 are hidden, the page shows why each route matched, and nothing is called recommended.

## Added in v0.2, after the research sweeps

The sweep agents met cases the v0.1 layout could not hold. These are now part of the schema. Records written under v0.1 are valid as they stand; the fields below are optional until the recheck pass fills them.

```yaml
# programs.yaml
status: open              # open | closed | expired | not-competed | forecast | unconfirmed, as of as_of.   # new
                          # Many programmes had no open notice on 2026-10-04. Until this field is filled the
                          # state is in cycle.pattern and current_notices.
funds: [grant, cooperative-agreement]   # may be a list: a broad agency announcement can award several instruments
eligibility_note: '… [n]' # what the applicant-type codes cannot say (for example NSF's non-profit category,
                          # which is not defined by tax status)
budget_rules: '… [n]'     # salary limits, modular budgets and the like, when they belong to one programme
success:
- rate: '13.0%'
  fiscal_year: 2025
  note: '… [n]'           # what the rate measures; two published rates for one programme are both kept
  cite: [n]

# funders.yaml
funder_kind: federal | foundation | independent-nonprofit   # the third is PCORI: set up by Congress, neither an
                                                            # agency nor a foundation. Scope question for the author.
budget:
- amount: '$47.5 billion'
  fiscal_year: 2026
  status: enacted         # enacted | requested | house-mark | senate-mark | continuing-resolution
  cite: [n]
funding_rates: […]        # as success, at funder level
policy_guide_note: '… [n]'   # which version of the guide is in force, and its supplements
governing_terms: '… [n]'     # where there is no single policy guide

# shared
applicant_types:          # more Grants.gov codes, needed to say who is shut out as well as who is let in
  state-government: '00'
  county-government: '01'
  city-government: '02'
  tribal-government: '07'
  individual: '21'
  for-profit: '22'
  small-business: '23'
  other: '25'
pending_status: … | in-litigation | rescinded | enacted
```

Records that share an id across sweep slices (the same gate met at six agencies) are merged by the consolidation script. The first statement met stays as the record and the others are kept, cited, under `variants`, each with the slice it came from, until the author reconciles them. (From v0.6: where the rules sweep wrote the record, that one is the main record.)

Every record carries `sweep: <family>-<slice>` and every reference `sweep_ids`, the ids it had in the sweep files under `source/sweeps/`.

## Added in v0.3, after the people sweep

```yaml
# programs.yaml — family: people
applicant: institution        # person | institution | either: who submits the application.
applicant_note: '… [n]'       # for routes the three values cannot express: an institution applying for a named person,
                              # a state programme nominating to a national one, an outside administrator taking applications
citizenship: '… [n]'
career_window: '… [n]'        # years since degree, tenure-track status, attempts allowed
stipend: '… [n]'              # amount with its fiscal year
obligation: '… [n]'           # service or payback
kind: fellowship | training | program | mechanism
funds: … | loan-repayment | appointment     # a federal appointment or a loan repayment is not a grant

status: open | closed | expired | not-competed | no-current-notice | forecast | unconfirmed
#   not-competed       the funder says the competition is cancelled or will not be held
#   no-current-notice  no notice for the current cycle was found on the funder's page or Grants.gov, and the funder
#                      has not said the programme has ended. Reported as an absence, with the listing cited.
#   closed             the current competition's deadline has passed; the programme continues
#   expired            the announcement lapsed or was ended early
```

Funders met in two slices are merged like gates: one record, the other wording kept under `variants`.

`source/sweeps/overrides.yaml` holds rulings made at consolidation (so far: relabelling fourteen statuses to `no-current-notice`). Each override writes its reason into the record under `consolidation_notes`.

## Added in v0.4, after the programme and service sweep

```yaml
# programs.yaml — family: programme-service
route: direct             # direct | pass-through | both
                          #   direct        the organisation applies to the federal agency
                          #   pass-through  the federal award goes to a state, territory, tribe or locality, which
                          #                 makes subawards; the federal agency takes no application from a non-profit
                          #   both          a formula part and a competitive part
pass_through_via: '… [n]' # who the non-profit applies to, as the federal page says
match: '… [n]'            # the exact cost-sharing or matching rule
service_area: '… [n]'     # geographic or population limits
reporting: '… [n]'        # performance measures or data systems the grantee must use

status: … | formula       # formula: money allotted by formula or block grant; there is no federal competition a
                          # non-profit can enter, and the door is the state or local grantee's own subaward cycle.
                          # cycle.pattern says what a primary page shows about the current year's allotment.
```

On a pass-through record `who_may_apply.applicant_types` names the federal recipient (the state), not the non-profit; the non-profit's route is in `pass_through_via`.

Cases the vocabulary still does not hold, recorded in prose and listed in the sweep notes: a competed notice open to governments only; programmes entered through a local body that itself applies (HUD's Continuum of Care, FEMA's Nonprofit Security Grant Program); a notice rescinded after posting (recorded as `expired`).

## Added in v0.5, after the capacity sweep

```yaml
# programs.yaml — family: capacity
kind: program | instrumentation | facility | center
route: … | congressional  # a congressionally directed project (an earmark): the organisation asks a Member's or
                          # Senator's office, Congress names the recipient in an appropriations act, and the named
                          # recipient then applies to the agency for that project only. On these records `status`
                          # refers to the request cycle, and cycle.pattern gives the agency's own window as well.
who_may_apply:
  limits: '… [n]'         # the limit on applications per institution; many capacity programmes have one
match: '… [n]'
```

A programme recorded in two slices of one family is merged like a gate: one record, the other wording under `variants`.

Standing records now carry the jurisdiction lists (NSF, DOE and NASA EPSCoR, DEPSCoR, NIH IDeA, USDA) and the institution designations, each with the date of the list it was read from.

## Added in v0.6, after the rules and gates sweep

The rules sweep gave gates and rules their full treatment. Its layouts are fuller than the short form above.

```yaml
# gates.yaml
- id: sam-registration
  name: SAM.gov entity registration
  what: >                         # 2–4 plain sentences, each cited
  applies_when: '… [n]'           # which applicants and which funders need it
  who_does_it: organisation       # organisation | person | both
  steps: ['… [n]']                # the official steps, in order
  time: '… [n]'                   # how long the official page says it takes
  cost: '… [n]'                   # fees, or that it is free
  renewal: '… [n]'                # how often, and what lapses if it is missed
  common_problems: '… [n]'        # only what an official page itself warns about
  official_url: https://…
  pending_changes: [{status: proposed, date: '2026-01-28', text: '… [n]'}]
  as_of: '2026-10-04'
  sources: [n, n]
  same_as: other-gate-id          # set by an override where two ids name one gate; the other holds the full record

# mechanics.yaml — a rule or a process, as against a thing to obtain
- id: de-minimis-indirect-rate
  name: De minimis indirect cost rate
  what: >
  rule: '… [n]'                   # the rule in force, with its section
  figures:                        # thresholds and rates exactly as the text gives them
  - {label: de minimis rate, value: 'up to 15 percent of modified total direct costs', cite: [n]}
  applies_to: '… [n]'
  pending_changes: []
  related: [other-record-id]      # cross-references, uncited
  official_url: https://…
  as_of: '2026-10-04'
  sources: [n]

# help.yaml
- {id, name, what, who_it_is_for, cost, official_url, sources}
```

Where an earlier sweep had written a gate, mechanics, standing or help record in passing and the rules sweep wrote the same id, the rules record is the main record and the earlier statements sit beneath it under `variants`.

Statuses still missing from the vocabulary and recorded in prose: a declaratory judgment with no injunction or vacatur (recorded as `in-litigation`).

## Added in v0.7, after the foundations sweep

```yaml
# funders.yaml — a foundation or other private grantmaker
- id: sloan-foundation
  name: Alfred P. Sloan Foundation
  funder_kind: foundation         # foundation | independent-nonprofit (a public charity or research organisation that makes grants)
  foundation_kind: independent    # independent | family | community | corporate | operating | public-charity |
                                  # medical-research-organization | donor-advised-fund-sponsor
  legal_form: '… [n]'             # where the funder is not one entity or not a foundation in law (an LLC beside a
  legal_form_note: '… [n]'        # foundation, a trust behind a foundation, a network of filers), in its own words
  ein: '13-1623877'
  what_it_funds: '… in its own words [n]'
  fields: [science, economics]
  who_it_funds: '… [n]'
  unsolicited: letter-of-inquiry  # accepted | letter-of-inquiry | invitation-only | open-call-only | not-stated
  unsolicited_note: '… the foundation's own wording [n]'
  how_to_approach: '… [n]'
  cycle: '… [n]'
  typical_grant: '… [n]'
  indirect_costs: '… its overhead policy, with the exact cap [n]'
  giving:                         # more than one entry where the foundation's own report and its filing differ
  - {amount: '$…', year: 2025, basis: 'grants paid | grants approved | charitable disbursements', cite: [n]}
  assets: {amount: '$…', year: 2025, cite: [n]}
  giving_form: in-kind            # only where the programme gives products or services, not money
  geography: '… [n]'
  programs: [sloan-research-fellowships]
  pending_changes: [{status: announced, date: '2025-05-08', text: '… [n]'}]
  official_url: https://…
  grants_database_url: https://…
  as_of: '2026-10-04'
  sources: [n, n]
```

`unsolicited` is the field a grant seeker reads first. `open-call-only` means the funder takes applications only under a posted competition; `invitation-only` means it says it does not accept unsolicited requests.

A foundation programme record uses the programme layout with `funder_kind: foundation`, and its `family` is whichever of research, people, programme-service or capacity fits the award, so foundation programmes sit beside federal ones.

Figures for giving and assets came first from ProPublica's summaries of the filings; for the twelve largest the foundation's own statement was added. Where the two differ both are kept, with a `conflict` todo.

## Added in v0.8, after the recheck

The recheck re-read every source against its live page and put each stored quote and fact to it. Its results are fields on the reference; no record file changes shape.

```yaml
# references.yaml — added by the recheck
rechecked: '2026-10-05'        # the date the page was re-read; absent when the page refused
recheck_result:
  fetch: ok                    # ok | blocked (with reason)
  partial: true                # the fetch returned only part of the page; the verdict covers that part
  quotes_dropped: 1            # quotes not found word for word, removed from quotes
  by_hand: 1                   # facts whose code rests on a re-read by hand
fact_check: [C, C, S, N]       # one code per key_facts entry, in order:
                               #   C  the page states all of it
                               #   S  the page states part of it and contradicts none of it
                               #   N  not found on the page as re-read
                               #   X  the page says something different (a tr-<n>-f<i> todo gives the page's wording)
                               #   -  not re-read (the page refused, or the fact was edited after the recheck)
recheck: false                 # true while any fact is N, X or -, or the page refused
```

`quotes` now holds only quotes found word for word on the second reading, except on a page that refused, where the first extraction stands. A todo whose id starts `tr-` comes from the recheck: `tr-<n>-f<i>` (kind `conflict`) for a contradicted fact, `tr-<n>-unconfirmed` (kind `recheck`) for facts not found, `tr-<n>-blocked` (kind `recheck`) for a page that refused. Their `about` is `references/<n>`.

A site built from this pack should show a record's figure with less confidence when the reference behind it is still flagged, and should not print a quote from a reference whose page refused without saying so.

## Added in v0.9, after the status pass

The 131 federal research records were written before `status` was a field. A status pass on 2026-10-05 read each programme's notice or listing and recorded its state. The findings live beside the sweep files in `status-research-?.yaml` and are applied at consolidation; a record that already had a status is left alone.

```yaml
# programs.yaml — added by the status pass
status: forecast               # the vocabulary of v0.3 and v0.4, unchanged
status_as_of: '2026-10-05'     # the day the page was read; absent on records whose status came with their sweep (use as_of)
status_note: '… [n]'           # one or two cited sentences: what the page showed
next_date: '2026-12-14'        # the next date an applicant can act on, when a page gave one
status_change: '… [n]'         # only when the page showed something the record's cycle did not: a new notice, a new date, an archived listing
```

`cycle` is left as the sweep wrote it. Where `status_change` is present, `cycle` is a day older than `status_note` and the two differ; the site should show the status fields first. Pages the status pass read are references 2513 onward, with `sweep: status-A` to `status-C`; they were read once and are flagged `recheck: true`.

## Added in v0.10: routes and the pathfinder

```yaml
# routes.yaml
- id: formula-money-through-the-state
  name: Federal formula money that reaches a non-profit through a state, tribe or local government
  family: programme-service        # research | people | programme-service | capacity | start (the entry routes)
  what: '… [n]'                    # 2–4 cited sentences, plain layer
  who_for: '… [n]'
  how_it_works: ['… [n]', …]       # 3–6 cited steps in the order a first-time applicant meets them
  watch: '… [n]'                   # what changed in 2025–26 or is pending, dated, from changes.yaml
  programs: [ids]                  # every programme on the route, whatever its status
  funders: [ids]
  standing: [ids]
  gates: [ids]
  mechanics: [ids]
  help: [ids]
  changes: [ids]
  who: […]  purpose: […]  stage: […]     # editorial tags; the pathfinder uses them only for entry routes
  funder_kind: federal | foundation | either
  door: direct | state | congress | nomination | invitation | letter-of-inquiry | registration | partner
  find_filter: {applicant_types: […], keywords: […]}   # how /find is pre-set from this route
  as_of: '2026-10-05'
  sources: [n, …]                  # written at consolidation: every number the prose cites
```

Each programme record gains `on_routes: [route ids]`.

A route states nothing its linked records do not state. Its prose does not say what is open; the page lists the route's programmes with each one's status and date.

```yaml
# pathfinder.yaml
rule: …                            # the ranking rule in words
display:
  route_statuses: [open, forecast, closed, formula]    # which programmes a route page lists; search shows all
questions: [who, purpose, stage, funder_kind]
routes:
- id: health-and-behavioural-health-services
  family: programme-service
  door: direct
  funder_kind: federal
  n: {federal: 41, foundation: 0}                       # programmes on the route, by side
  fit:                                                  # how many of them carry each pair of answers in their own records
  - {who: nonprofit-programmes, purpose: service, funder: federal, count: 37}
- id: getting-registered-to-apply                       # an entry route carries tags instead of counts
  family: start
  who: […]  purpose: […]  stage: […]
```

The `fit` counts are computed at consolidation from `who` and `purpose` on the programme records, so they change when the records do.
