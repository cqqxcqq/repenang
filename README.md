# RePenang

A Penang recycling directory built with HTML, CSS, vanilla JavaScript, Leaflet and OpenStreetMap. The map displays sourced research candidates, not independently verified or comprehensive listings.

## Run locally

Open a terminal in this folder and serve it over HTTP:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Then visit http://127.0.0.1:8000/ and stop with Ctrl+C. On Windows, `py -m http.server 8000 --bind 127.0.0.1` also works when a Python runtime is installed. Double-clicking `index.html` is insufficient because `file://` cannot reliably fetch the JSON.

The Python alias/launcher on the test machine did not provide a working runtime. With Node.js installed, this built-in-only alternative needs no npm packages:

```powershell
node -e 'const http=require("node:http"),fs=require("node:fs"),path=require("node:path");const root=process.cwd();http.createServer((req,res)=>{const file=path.resolve(root,"."+decodeURIComponent(new URL(req.url,"http://localhost").pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const target=file===root?path.join(root,"index.html"):file;fs.readFile(target,(error,data)=>{if(error){res.writeHead(404);res.end("Not found");return;}res.setHeader("Content-Type",({".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".json":"application/json; charset=utf-8",".png":"image/png"})[path.extname(target)]||"application/octet-stream");res.end(data);});}).listen(8000,"127.0.0.1",()=>console.log("http://127.0.0.1:8000"));'
```

## Behaviour

The map initially shows Penang Island and Seberang Perai. It limits zooming out and panning to the Penang area and provides a recenter control. The page stays within the viewport. Long result lists and details use thin scrollbars inside the existing sidebar; mobile selected details open in a dismissible sheet that keeps part of the map visible. Close with the button or Escape. Attribution remains visible with the sheet open.

Search and the material dropdown operate on the same JSON records, synchronizing the count, list, markers and selected details. Selecting a material asks the browser for the user's location and centers the map on the closest mapped match among the current filtered results. The distance is straight-line distance, not a travel route. Location stays in the browser and is not saved or sent by the app; browser location permission and a secure context (HTTPS or localhost) are required. If access is denied, the list remains usable. Source-listed materials and availability remain unverified; a closer place without coordinates cannot be included. Matching is case-insensitive, with a small explicit alias dictionary in `app.js`: for example, `old phone` maps to e-waste and `batteries` to battery. Ambiguous `bottle` is not assigned a material. Reset clears both filters.

Guide contains “Sort this bag”, a six-item sorting game. Select an item to inspect its condition, prepare it if needed, then click a destination or drag it there. All actions work with keyboard buttons and touch selection. Correct placements clear the bag; mistakes explain the item’s condition and allow retry. A second bag changes clean paper to food-soiled paper and a household battery to a phone. Progress stays in memory while navigating, and resets when the page reloads. Completion can open the map with the battery or e-waste filter applied. Suggest saves a draft in this browser's `localStorage` under `repenang-suggestion`; it does not send a message to anyone. Online submission is not configured.

Game rules and explanations are in `data/sorting-game.json`, reviewed against the Penang Green Council FAQ on 10 November 2026. The three destinations represent collection routes, not official bin colours. Glass is set aside for a collector that explicitly accepts it; batteries and electronics also need suitable collection. These educational scenarios do not establish current acceptance at any directory location. The game uses `sorting-game.js`, authored SVG shapes, and the existing styles; there are no added runtime dependencies.

## Data and sources

The site loads `data/penang-recycling-research.json`. Source-listed candidates with coordinates within the map bounds appear as markers; candidates without coordinates remain searchable in the list. Entries explicitly marked closed or relocated are excluded. The materials filter uses explicitly source-reported categories and device types; original descriptions remain visible and acceptance must be confirmed. Unknown and ambiguous categories are not guessed. Coordinates and site operation have not been independently verified. Directions are disabled for these candidates. The older historical directory and separately reviewed records remain in the data folder.

The dataset is incomplete, can contain duplicates, and should be checked with operators before visiting. Do not bulk-scrape a third-party directory.

## Checks

Run `node --check app.js`, `node --check sorting-game.js` and `node --test tests/directory.test.cjs tests/sorting-game.test.cjs`. The tests validate local data handling and game progression, not whether external locations are currently operating. `tests/sorting-game.browser.cjs` is an optional developer check requiring Playwright and Edge; the site itself needs neither. It starts and closes its own local server and browser and writes desktop/mobile screenshots into `outputs`.

## External dependencies and configuration

Leaflet CSS/JS are pinned to 1.9.4 on unpkg with integrity hashes. The standard HTTPS OSM tile endpoint is used with attribution and normal browser caching; there is no bulk prefetch or offline-map support. The CDN and tiles need internet access. See the [Leaflet quick start](https://leafletjs.com/examples-v1/quick-start/) and [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).

There are no API keys, backend, database, accounts, analytics, React, Tailwind, build dependencies or geocoding calls. Online suggestion submission is the only deliberately unconfigured third-party feature. Directions open Google Maps using the reviewed destination coordinates. Source links open their publishers' websites. Local drafts stay in this browser until its site storage is cleared; they do not move with the website to a different origin or device.
