'use strict';
// Read-only publisher checks. Findings never overwrite accepted facts or review dates.
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const crypto = require('node:crypto');
const { clean, mampan, riiicycle, mampanObservation, guidanceText } = require('./source-parsers.cjs');
const root = path.resolve(__dirname, '..');
const review = require('../data/source-review.json');
const directory = require('../data/directory.json');
const cacheArg = process.argv.find((arg) => arg.startsWith('--cache='));
const cacheDir = cacheArg && path.resolve(cacheArg.slice(8));
const guardrails = {
  ecochamps: ['Plastic bottles and plastic containers only', 'Non-rechargeable battery', 'Glass bottle', '1 October', '31 December 2026', 'Midlands Station', 'Auto City Station'],
  faq: ['Only food and beverage', 'not engine oil', 'positive (+) and negative (-)', 'Tzu Chi Tambun Indah']
};
async function readSource(source) {
  if (cacheDir) return fs.readFileSync(path.join(cacheDir, `${source.id}.html`), 'utf8');
  const response = await fetch(source.url, { signal: AbortSignal.timeout(30000), redirect: 'follow', headers: { 'User-Agent': 'Pulang-source-review/1.0 (manual directory maintenance)' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.headers.get('content-type')?.includes('text/html')) throw new Error('Publisher did not return HTML');
  const html = await response.text();
  if (html.length > 8000000) throw new Error('Response too large; inspect manually');
  return html;
}
(async () => {
  const results = [];
  for (const source of directory.sources) {
    try {
      const html = await readSource(source);
      const changes = [];
      if (source.id === 'mampan' || source.id === 'riiicycle') {
        const rows = source.id === 'mampan' ? mampan(html) : riiicycle(html);
        for (const observation of review.observations.filter((o) => o.sourceId === source.id)) {
          const row = rows.find((r) => source.id === 'mampan' ? r.company_id === observation.recordId : r.name === observation.recordId);
          if (!row) { changes.push(`${observation.locationId}: publisher record no longer found`); continue; }
          const current = source.id === 'mampan' ? mampanObservation(row) : row;
          for (const key of Object.keys(observation.expected)) if (!isDeepStrictEqual(current[key], observation.expected[key])) changes.push(`${observation.locationId}: ${key} changed`);
        }
      }
      if (guardrails[source.id]) {
        const body = clean(html).toLowerCase();
        for (const phrase of guardrails[source.id]) if (!body.includes(phrase.toLowerCase())) changes.push(`Review required: expected guidance no longer found: ${phrase}`);
        // Programme / preparation wording changes require review, even if keywords remain.
        const digest = crypto.createHash('sha256').update(guidanceText(html, source.id)).digest('hex');
        if (digest !== source.guidanceSha256) changes.push('Published acceptance / preparation section changed; manual review required.');
      }
      if (source.id === 'device-privacy' && !clean(html).toLowerCase().includes('remove personal information')) changes.push('Device privacy instructions changed; manual review required.');
      if (source.id === 'mampan-info' && (!html.includes('T7zUfkomaaQ7uoPu5') || !html.includes('eeopgc2020@gmail.com'))) changes.push('Public registration/contact channel changed; review the Suggest page.');
      results.push({ sourceId: source.id, url: source.url, status: changes.length ? 'review_required' : 'matched', changes });
    } catch (error) { results.push({ sourceId: source.id, url: source.url, status: 'unavailable', error: error.message }); }
  }
  const report = { checkedAt: new Date().toISOString(), mode: cacheDir ? 'saved_source_replay' : 'live_publisher_check', scope: 'Source page availability and stored published facts only; not live station operation or physical verification.', results };
  fs.mkdirSync(path.join(root, 'outputs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'outputs/source-check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (results.some((r) => r.status !== 'matched')) process.exitCode = 1;
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
