const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDirectory, locationIssues, selectPublishable, validateItems, assessItem: assessWithSources } = require('../directory-data.js');
const directory = require('../data/directory.json');
const review = require('../data/source-review.json');
const original = require('../data/penang-recycling-research.json');
const items = require('../data/items.json').items;
const sources = Object.fromEntries(directory.sources.map((s) => [s.id, s]));
const copy = (record) => JSON.parse(JSON.stringify(record));
const now = directory.reviewedAt;
const assessItem = (place, item, condition = 'ready', date = now) => assessWithSources(place, item, condition, date, sources);

test('runtime withholds one malformed location without losing unrelated reviewed places',()=>{
  const data=copy(directory);data.locations[0].contacts=[];
  const selected=selectPublishable(data,now);
  assert.equal(selected.locations.length,directory.locations.length-1);
  assert(!selected.locations.some(p=>p.id===data.locations[0].id));
  assert(selected.issues.length);
  assert(validateDirectory(data,now).length); // publication checks still fail
  assert.equal(selectPublishable(directory,'2026-12-16').locations.length,0);
});
test('duplicate or malformed identities cannot pick an arbitrary map destination',()=>{
  const data=copy(directory);data.locations.push(copy(data.locations[0]));
  assert.equal(selectPublishable(data,now).locations.length,directory.locations.length-1);
  assert.equal(selectPublishable({schemaVersion:1,sources:null},now).locations.length,0);
});
test('item catalogue rejects missing review dates, unsafe sources and duplicated items',()=>{
  const catalogue=require('../data/items.json');
  assert.deepEqual(validateItems(catalogue,sources,now),[]);
  for(const change of [c=>delete c.reviewDueAt,c=>c.items.push(c.items[0]),c=>c.items[0]=null,c=>c.items[0].sourceId='missing',c=>c.items[0].label='',c=>c.items[0].route='invented']){
    const data=copy(catalogue);change(data);assert(validateItems(data,sources,now).length);
  }
});

test('every published point has usable, sourced visit information and no invented verification', () => {
  assert.deepEqual(validateDirectory(directory, now), []);
  assert(directory.locations.length > 40);
  for (const point of directory.locations) {
    assert(point.address && point.hours.display && point.contacts.length && point.acceptance.length);
    assert.notEqual(point.status, 'verified');
    assert.notEqual(point.coordinatesVerified, true);
  }
});
test('missing contact, schedule, acceptance, coordinates or evidence fails the publication gate', () => {
  for (const mutation of [r=>r.contacts=[],r=>r.hours=null,r=>r.acceptance=[],r=>r.lat=null,r=>delete r.evidence.coordinates,r=>r.evidence.materials.sourceId='invented',r=>r.conflicts=['schedule disagreement'],r=>r.status='demo']) {
    const record=copy(directory.locations[0]); mutation(record);
    assert(locationIssues(record,sources,now).length);
  }
});
test('review expiry and future review dates cannot silently stay recommendation-ready', () => {
  assert(validateDirectory(directory,'2026-12-16').some((x)=>/Review due/.test(x)));
  const record=copy(directory.locations[0]);record.reviewedAt='2999-01-01';
  assert(locationIssues(record,sources,now).some((x)=>/review date/.test(x)));
  const bottle=items.find((i)=>i.id==='plastic-bottle');
  assert.equal(assessItem(directory.locations[0],bottle,'ready','2026-12-16').status,'review_required');
  assert.equal(assessWithSources(directory.locations[0],bottle).status,'review_required');
});
test('every original research record has one decision and archived records do not leak into the map', () => {
  assert.equal(new Set(review.decisions.map((r)=>r.id)).size, original.locations.length);
  const ids=new Set(directory.locations.map((p)=>p.id));
  for(const old of original.locations) {
    const decision=review.decisions.find((r)=>r.id===old.id);assert(decision);
    assert.equal(ids.has(old.id),decision.decision==='publish');
    if(decision.decision==='archive')assert(decision.reasons.length);
  }
  assert(!ids.has('tzuchi-candidate-1')); // unresolved publisher schedule conflict
  assert(!directory.locations.some((p)=>p.id.startsWith('rnc-'))); // no published site schedule
});
test('item matching respects exact forms, preparation, explicit rejection and unknowns', () => {
  const station=directory.locations.find((p)=>p.id==='riiicycle-candidate-5');
  const item=(id)=>items.find((i)=>i.id===id);
  assert.equal(assessItem(station,item('plastic-bottle')).status,'source_listed');
  assert.equal(assessItem(station,item('plastic-bottle'),'needs_preparation').status,'prepare_first');
  assert.equal(assessItem(station,item('plastic-film')).status,'not_accepted');
  assert.equal(assessItem(station,item('household-battery')).status,'not_accepted');
  assert.equal(assessItem(station,item('phone')).status,'confirm_item');
  assert.equal(assessItem(station,item('used-cooking-oil')).status,'not_listed');
  assert.equal(assessItem(station,item('greasy-paper')).status,'unsuitable');
  const broad=directory.locations.find((p)=>p.id==='mampan-candidate-2');
  assert.equal(assessItem(broad,item('plastic-bottle')).status,'confirm_item');
});
test('glass-bottle-only listings do not silently accept jars, and source exclusions win', () => {
  const bottleOnly=directory.locations.find((p)=>p.id==='mampan-candidate-2');
  const jar=items.find((i)=>i.id==='glass-jar');
  assert.equal(assessItem(bottleOnly,jar).status,'confirm_item');
  const excludesGlass=directory.locations.find((p)=>p.id==='mampan-candidate-24');
  assert.equal(assessItem(excludesGlass,jar).status,'not_accepted');
  const jarSource=directory.locations.find((p)=>p.id==='mampan-candidate-18');
  assert.equal(assessItem(jarSource,jar).status,'source_listed');
});
test('publisher text “All day” never becomes a machine claim of 24-hour availability', () => {
  const records=directory.locations.filter((p)=>p.hours.display==='All day');assert(records.length);
  for(const record of records){assert.equal(record.hours.kind,'publisher_text');assert(record.hours.note.includes('not specified'));assert.equal(record.access.mode,'confirm_first_visit');}
});
