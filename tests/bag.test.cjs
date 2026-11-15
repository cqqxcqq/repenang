const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const api=require('../directory-data.js');
const directory=require('../data/directory.json');
const items=require('../data/items.json').items;
const window={PulangDirectory:api};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../bag.js'),'utf8'),{window});
const rank=(ids,origin=null,condition='ready',date=directory.reviewedAt)=>window.PulangBag.suggestions(directory,items,ids.map(id=>({id,condition})),date,origin);

test('all supported places remain discoverable instead of a fixed alphabetical top three',()=>{
  const matches=rank(['newspaper']);
  assert(matches.length>20);
  assert(matches.some(r=>r.place.id==='mampan-candidate-2'));
  assert(matches.some(r=>r.place.id==='mbpp-candidate-3'));
  assert(matches.some(r=>r.group==='whole'));
  assert(matches.some(r=>r.group==='confirm'));
});
test('coverage separates whole-bag, conditional and partial collection options',()=>{
  const matches=rank(['glass-jar','used-cooking-oil']);
  assert.equal(matches[0].place.id,'mampan-candidate-18');
  assert.equal(matches[0].group,'whole');
  assert(matches.some(r=>r.group==='confirm'));
  assert(matches.some(r=>r.group==='partial'&&r.coverage===1));
  assert(!matches.some(r=>r.place.id==='riiicycle-candidate-5')); // no glass-jar or oil evidence
});
test('preparation keeps potential destinations without claiming ready-to-drop acceptance',()=>{
  const matches=rank(['plastic-bottle'],null,'needs_preparation');
  assert(matches.length>20);
  for(const match of matches){assert.equal(match.listed,0);assert.equal(match.prepare,1);assert.equal(match.group,'prepare');}
  assert.equal(rank(['used-tissue']).length,0);
  assert.equal(rank(['plastic-bottle'],null,'damaged').length,0);
});
test('distance from an explicit map anchor breaks coverage ties and changes the ordering',()=>{
  for(const id of ['riiicycle-candidate-5','mbpp-candidate-3']){
    const place=directory.locations.find(p=>p.id===id);
    const matches=rank(['newspaper'],{lat:place.lat,lng:place.lng});
    assert.equal(matches[0].place.id,id);
    assert(matches[0].distance<0.001);
  }
});
test('expired reviews cannot enter results even with broader discovery',()=>{
  assert.equal(rank(['newspaper'],null,'ready','2026-12-16').length,0);
});
