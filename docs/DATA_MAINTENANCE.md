# Collection data review

## Publication standard

The 15 November 2026 set publishes 45 locations and supplies 17 starter item definitions. Every published location has an address, publisher coordinates, explicit material descriptions, a collection schedule, a collection enquiry phone, visit instructions and field-level evidence. This is a completeness standard for published information, not proof of live operation, physical access or coverage of all Penang facilities.

`data/directory.json` is the canonical public dataset. `data/source-review.json` holds the source registry, captured field observations and one publish/archive decision for each of the 124 research records. `data/penang-recycling-research.json` and the original 2005 data remain research archives and must not be used as a runtime fallback. `data/items.json` is a starter catalogue, not a universal classifier.

## Review procedure

Open the cited primary publisher page and locate the exact named facility. MAMPAN evidence locators include public company record numbers. Compare address, coordinates, contact, working-hour text, material descriptions and remarks. For Riiicycle compare the exact station card, its seven-day sessions and publisher map links. Check newer operator statements for conflicts. Similar venue names or nearby pins are not sufficient evidence to merge places.

Use each field's actual source, record the review date and set a review deadline no more than 30 days later. Preserve the publisher's update date. Do not call an online review independently verified, infer hours from nearby businesses, use a headquarters phone as an on-site number, or turn “All day” into 24/7. Broad material categories do not establish every plastic format, battery chemistry or device type. MAMPAN phone numbers are labelled collection enquiries and first-visit access needs confirmation.

If an essential field is missing or conflicting, remove the entry from `directory.locations`, retain its research record and update the audit decision/reasons. A removal from Pulang is not a closure announcement. Reinstatement requires the same evidence as a new publication.

Only after manual review should the maintainer update the curated fields and the corresponding `source-review.observations[].expected` values. `scripts/source-parsers.cjs` extracts public fields to assist comparison; it does not approve facts. Guidance section fingerprints should only be refreshed after reviewing the changed section. Never advance review dates just to satisfy a test.

## Rules for the bag

Acceptance rules contain a material, original publisher wording, source ID, known item forms and separately sourced preparation guidance. `forms: []` means a material is listed without an exact-item promise. Explicit exclusions take precedence. Plastic film does not match a bottles-only collection. Glass-bottle wording does not establish jar acceptance. An unspecified battery listing leaves chemistry as a question.

`PulangDirectory.assessItem(location, item, condition, date, sources)` requires a valid source registry. It returns `source_listed`, `confirm_item`, `prepare_first`, `not_accepted`, `not_listed`, `unsuitable` or `review_required`. Source-listed acceptance is not live availability. Unknown acceptance must never be upgraded to a confirmed recommendation to fill a bag plan.

## Checks and maintenance

Run `node scripts/check-directory.cjs`, `node scripts/check-sources.cjs` and `node --test tests/directory.test.cjs tests/reviewed-directory.test.cjs tests/sorting-game.test.cjs`. Reports go into `outputs`. The source checker requests each public source once, compares stored public facts and relevant guidance sections, and reports changed/missing records, unavailable pages and markup changes. It never overwrites accepted facts or review dates. Cached-source replay (`--cache=<directory>`) is a parser regression aid, not a fresh online review.

Use the browser test after schema or rendering changes. It covers desktop/mobile details, telephone/direction links, non-overlapping map layout, filters, game flow and failure fallbacks. It closes its server and browser. A directory validation failure offers direct official-directory links instead of incomplete pins or old research data.

The current review deadline is 15 December 2026. The GitHub workflow validates data/tests on push and pull request; a manual workflow dispatch also checks live sources. It must be pushed before it can run. There is no scheduled monitor, automatic source refresh or operator notification. A static directory cannot promise continuously current service information without maintenance.

## Important review decisions

The 56 RECYCLEnCASH inventory entries provide device coordinates but lack site-level addresses and collection schedules in the reviewed inventory. A headquarters number does not establish access; these entries stay archived. Lumba Kuda has conflicting operator and MAMPAN schedules and stays archived. The original MBPP Midlands Park point is distinct from the Riiicycle Midlands station and lacks specific material descriptions. Duplicates and publisher-reported closures/relocations stay outside the map.

MAMPAN's “All day” wording is retained with a timing-confirmation note; it is not used to calculate open-now status. Operator Waze geohashes were decoded to their coordinate-cell centres; their approximately five-metre encoding resolution is not a surveyed accuracy claim. Riiicycle programme acceptance is only applied to the named stations, with its restrictions preserved.

Suggest links to PGC's real registration/contact channels. PGC receives those submissions; they do not automatically update Pulang. No public submission backend, road travel-time calculation, live capacity feed or measured recycling-impact claim is implemented.
