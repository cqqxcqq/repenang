# Pulang

A Penang recycling directory and sorting exercise built with HTML, CSS, vanilla JavaScript, Leaflet and OpenStreetMap. The existing Pulang identity and responsive layout are preserved. No backend, database, build step, API key or new runtime dependency is required.

## Run locally

With Node.js installed, run `node scripts/serve.cjs`, then open http://127.0.0.1:8000/. Stop with Ctrl+C. For a different port use `node scripts/serve.cjs 8001`. The server includes the SVG MIME type needed by the logo. Python's `python -m http.server 8000 --bind 127.0.0.1` also works. Use HTTP rather than double-clicking `index.html` so JSON requests work.

## Published data

The map loads **`data/directory.json`**, not the research candidates or 2005 PDF import. The 15 November 2026 review publishes **45 locations**: 38 backed by MAMPAN records and seven by Riiicycle operator details plus PGC's named-station acceptance list. Every published entry has an address, publisher-sourced coordinates, explicit material descriptions, collection time information, a collection enquiry phone, visit instructions and field-level sources.

**79 of the 124 research records remain outside the map**, including duplicates, closed/relocated entries, records missing an essential field and the unresolved Lumba Kuda schedule conflict. The original research JSON is unchanged. All decisions, reasons and the 45 source observations are in `data/source-review.json`. Omission does not establish closure. Neither dataset claims complete Penang coverage.

“Sources checked” means public-page review, not a call, physical visit or live operational check. Publisher update dates remain separate from our review date. MAMPAN's **“All day” remains publisher text**, with a call-to-confirm note; it is not converted into a 24/7 schedule. Known Riiicycle weekly sessions are structured in Malaysia time. A category does not establish every item format or battery chemistry.

## Behaviour

Search, material selection, result counts, pins and details use the same curated records. Details provide collection times, telephone links, expandable item conditions, sources, a review date and directions. Desktop details stay in the sidebar; mobile details occupy a separate area while keeping part of the map visible. Penang map bounds and the recenter control are retained.

Material selection can request browser geolocation and find the closest listed match by **straight-line distance**, not travel time. The app does not save or send the user's position. HTTPS or localhost and browser permission are required; denied permission leaves list browsing usable. Search uses a small explicit English alias dictionary, not object recognition.

Guide retains the existing two six-item sorting exercises, preparation actions, explanations and keyboard/touch/desktop drag controls. Progress stays in memory across navigation, not reloads. The My bag button opens a sidebar with selectable items and preparation controls. The bag is saved on this device, can be emptied, and shows all supported places grouped by whole-bag, confirmation, preparation and partial coverage. Match-type buttons filter both the list and the map. Coverage ties use straight-line distance from the map centre; Use map centre updates that reference without requesting GPS. It does not calculate travel routes or live availability. Each suggestion shows individual item outcomes and opens the map location. Its data foundation is `data/items.json` (17 starter items) and `PulangDirectory.assessItem(location, item, condition, date, sources)` in `directory-data.js`. Matching distinguishes source-listed exact forms, preparation, confirmation required, explicit rejection, not listed, unsuitable conditions and review required. Unknown acceptance is never turned into a positive recommendation or rejection.

Suggest now links to **PGC's real MAMPAN registration form and published contact**, replacing the local-only form that could not submit. PGC receives these submissions; they do not automatically update Pulang. The maintainer must review source changes. The app sends no form or message automatically, and old local drafts are not deleted.

## Maintenance and checks

Run `node scripts/check-directory.cjs` for required fields, evidence, review dates, audit decisions and item forms. Run `node scripts/check-sources.cjs` for a read-only live comparison with the publisher pages. Both save reports in `outputs`. Changed facts, missing records, unavailable pages or markup changes require review; the checker never approves or overwrites facts automatically.

The current review is due **15 December 2026**. Missing or expired essential evidence fails validation. The site then offers official-directory links instead of publishing incomplete pins or silently loading old research. These checks are not automatic data updates or continuous monitoring. See `docs/DATA_MAINTENANCE.md` for the review procedure and limits.

Run `node --test tests/directory.test.cjs tests/reviewed-directory.test.cjs tests/sorting-game.test.cjs tests/bag.test.cjs`. Tests cover archival preservation, publication requirements, expiry, exact-item matching, exclusions and game progression; they do not establish external service operation.

`tests/sorting-game.browser.cjs` is an optional developer check requiring Playwright and Microsoft Edge; the website needs neither. It starts/closes its own server and browser, checks desktop/mobile details, telephone/direction links, map separation, filters, game flows and failure fallbacks, and saves screenshots in `outputs`.

`.github/workflows/directory-check.yml` validates data and unit tests on push/pull request. A manually triggered run additionally checks live sources. The workflow must be committed and pushed before GitHub can run it.

## Hosting and external services

Leaflet 1.9.4 CSS/JS load from unpkg with integrity hashes. OSM tiles require internet and retain attribution; there is no bulk prefetch or offline-map support. See the [Leaflet quick start](https://leafletjs.com/examples-v1/quick-start/) and [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/). The site works on a basic HTTP server or static host. The public name is Pulang; repository and deployment names remain RePenang.
