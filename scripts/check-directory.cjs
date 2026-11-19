'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { validateDirectory, validateItems, today } = require('../directory-data.js');
const root = path.resolve(__dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const directory = read('data/directory.json');
const review = read('data/source-review.json');
const original = read('data/penang-recycling-research.json');
const catalogue = read('data/items.json');
const onDate = process.argv.find((value) => value.startsWith('--date='))?.slice(7) || today();
const issues = validateDirectory(directory, onDate);
const ids = new Set(directory.locations.map((r) => r.id));
const decisions = new Map();
for (const decision of review.decisions) {
  if (decisions.has(decision.id)) issues.push(`Repeated audit decision: ${decision.id}`);
  decisions.set(decision.id, decision);
  if (decision.decision === 'publish' && !ids.has(decision.id)) issues.push(`Published audit entry missing: ${decision.id}`);
  if (decision.decision === 'archive' && (!decision.reasons?.length || ids.has(decision.id))) issues.push(`Invalid archive decision: ${decision.id}`);
}
for (const record of original.locations) if (!decisions.has(record.id)) issues.push(`No review decision: ${record.id}`);
for (const record of directory.locations) if (!review.observations.some((r) => r.locationId === record.id)) issues.push(`No source observation: ${record.id}`);
const itemIds = new Set();
const sourceIds = new Set(directory.sources.map((s) => s.id));
issues.push(...validateItems(catalogue,Object.fromEntries(directory.sources.map(s=>[s.id,s])),onDate));
for (const item of catalogue.items) {
  if (itemIds.has(item.id) || !item.label || !item.material || !item.preparation || !sourceIds.has(item.sourceId)) issues.push(`Invalid item: ${item.id}`);
  itemIds.add(item.id);
}
if (catalogue.reviewDueAt < onDate) issues.push('Item catalogue review due');
for (const record of directory.locations) for (const rule of record.acceptance) for (const form of rule.forms) if (!itemIds.has(form)) issues.push(`${record.id}: Unknown item form ${form}`);
const summary = { checkedOn: onDate, published: directory.locations.length, archived: review.decisions.filter((d) => d.decision === 'archive').length, items: catalogue.items.length, reviewDueAt: directory.reviewDueAt, issues };
fs.mkdirSync(path.join(root, 'outputs'), { recursive: true });
fs.writeFileSync(path.join(root, 'outputs/directory-check.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
if (issues.length) process.exitCode = 1;
