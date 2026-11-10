const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const records = read('data/locations.json');
const demos = read('data/locations.demo.json');
const modern = read('data/locations.source-reviewed.json');
const metadata = read('data/pdf-import.json');
const research = read('data/penang-recycling-research.json');
const context = vm.createContext({ window:{matchMedia:()=>({})}, document:{}, URL, console });
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/initialize\(\);\s*$/,''),context);
const api=vm.runInContext('({prepareRecords,hasMapLocation,hasVerifiedDirections,materialKey,reportedMaterialKeys,safeUrl,sourceLink,validDate,distanceKm,nearestMappedPoint})',context);

test('the linked source PDF is the exact supplied document',()=>{
 const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,metadata.sourcePdf))).digest('hex');
 assert.equal(hash,metadata.sourceSha256);
 assert.equal(metadata.publicationDate,'2005-09');
});
test('all 177 source appearances are traceable across 172 unique records',()=>{
 assert.equal(records.length,172);
 assert.equal(new Set(records.map(r=>r.id)).size,172);
 const appearances=records.flatMap(r=>r.sourceEntries);
 assert.equal(appearances.length,177);
 for(const [page,count] of Object.entries(metadata.perPage)) assert.equal(appearances.filter(e=>e.page===Number(page)).length,count,`page ${page}`);
 assert.equal(api.prepareRecords(records).length,172);
 for(const r of records){assert(r.address);assert(r.sourcePages.every(p=>p>=4&&p<=28));assert(api.sourceLink(r.sourceUrl));}
});
test('historical records have no fabricated current service, hours, contact or review date',()=>{
 for(const r of records){assert.equal(r.historical,true);assert.equal(r.status,'historical');assert.equal(r.sourceYear,2005);assert.equal(r.verifiedAt,null);assert.equal(r.hours,null);assert.equal(r.phone,null);assert(!api.hasVerifiedDirections(r));}
 assert.equal(records.filter(r=>r.region==='Kedah').length,7);
});
test('only separately source-checked building coordinates create map pins',()=>{
 const mapped=api.prepareRecords(records).filter(api.hasMapLocation);
 assert.equal(mapped.length,2);
 for(const r of mapped){assert(api.safeUrl(r.coordinateSourceUrl));assert(!api.hasVerifiedDirections(r));}
 assert.equal(api.prepareRecords(records).filter(r=>!api.hasMapLocation(r)).length,170);
});
test('cross-category duplicates are merged but distinct branches stay separate',()=>{
 const apac=records.filter(r=>r.name==='APAC Marketing');assert.equal(apac.length,1);
 assert.deepEqual(apac[0].sourcePages,[4,9]);
 assert(apac[0].materials.includes('clothes'));assert(apac[0].materials.includes('general recyclables'));
 for(const name of ['e.duc.com','ESH Resource Recovery Sdn Bhd','ARR Metals Trading']) assert.equal(records.filter(r=>r.name===name).length,2);
});
test('stopped-service and source-address conflicts are preserved',()=>{
 const stopped=records.find(r=>r.name==='Church of Risen Christ');assert.match(stopped.sourceStatus,/Stopped/);assert(!api.hasVerifiedDirections(stopped));
 const adventist=records.find(r=>r.name==='Penang Adventist Hospital');assert.match(adventist.address,/^65 Burma/);assert.equal(adventist.lat,null);assert.match(adventist.notes,/465/);
});
test('missing coordinates preserve searchable records without a phantom marker',()=>{
 const p={id:'qa',name:'QA',address:'Address only',materials:null};
 const [prepared]=api.prepareRecords([p]);assert(prepared);assert.equal(prepared.materials.length,0);assert.equal(prepared.lat,null);assert(!api.hasMapLocation(prepared));
 assert.equal(api.prepareRecords([p,p,{name:'Missing ID'}]).length,1);
 const [out]=api.prepareRecords([{...p,lat:1,lng:100,coordinatesVerified:true,coordinateSourceUrl:'https://example.com'}]);assert(out);assert.equal(out.lat,null);
});
test('neither demo status nor a historical flag can be bypassed with verification metadata',()=>{
 assert(api.hasVerifiedDirections(modern[0]));
 assert(!api.hasVerifiedDirections({...modern[0],historical:true}));
 for(const demo of demos){assert(!api.hasVerifiedDirections(demo));const [p]=api.prepareRecords([{...modern[0],...demo,status:'verified'}]);assert(!api.hasVerifiedDirections(p));}
 for(const patch of [{coordinatesVerified:false},{coordinateSourceUrl:null},{verifiedAt:'2999-01-01'},{status:'unverified'}]) assert(!api.hasVerifiedDirections({...modern[0],...patch}));
});
test('source URLs stay safe and only explicit aliases are applied',()=>{
 assert.equal(api.materialKey(' OLD   PHONE '),'e waste');assert.equal(api.materialKey('batteries'),'battery');assert.equal(api.materialKey('bottle'),'bottle');
 assert.equal(api.sourceLink('data/sources/penang-directory-2005.pdf#page=21'),'data/sources/penang-directory-2005.pdf#page=21');
 for(const value of ['javascript:alert(1)','data:text/html,test','file:///tmp/test','data/sources/../../secret.pdf']) assert.equal(api.sourceLink(value),null);
 for(const value of ['2005-02-30','2999-01-01',null]) assert.equal(api.validDate(value),false);
});
test('source-listed research pins remain unverified and records without coordinates stay unmapped',()=>{
 const listed=research.locations.filter(r=>r.status==='source_listed_not_currently_verified');
 const mapped=api.prepareRecords(listed).filter(api.hasMapLocation);
 assert(mapped.length>0);
 for(const r of mapped){assert(api.safeUrl(r.sourceUrl));assert(!api.hasVerifiedDirections(r));}
 assert(api.prepareRecords(listed).some(r=>!api.hasMapLocation(r)));
 const sample=listed.find(r=>Number.isFinite(r.lat));
 assert(!api.hasMapLocation({...sample,status:'closed_until_further_notice'}));
 assert(!api.hasMapLocation({...sample,sourceUrl:'javascript:alert(1)'}));
});
test('material filters use explicit source claims and preserve unknowns and exclusions',()=>{
 const byId=id=>api.prepareRecords([research.locations.find(r=>r.id===id)])[0];
 assert(byId('mampan-candidate-1').reportedMaterials.includes('glass'));
 assert(!byId('mampan-candidate-24').reportedMaterials.includes('glass'));
 assert(byId('riiicycle-ewaste-1').reportedMaterials.includes('e waste'));
 assert(byId('rnc-candidate-1').reportedMaterials.includes('cooking oil'));
 assert(!byId('rnc-candidate-1').reportedMaterials.includes('plastic'));
 assert(!byId('riiicycle-smart-2').reportedMaterials.includes('plastic'));
 assert.equal(byId('mbpp-candidate-1').reportedMaterials.length,0);
});
test('nearest selection uses distance and skips unmapped or fictional places',()=>{
 const source={status:'source_listed_not_currently_verified',sourceUrl:'https://example.org'};
 const candidates=[{...source,id:'far',lat:5.5,lng:100.4},{...source,id:'near',lat:5.4,lng:100.3},
  {id:'demo',status:'demo',lat:5.40001,lng:100.3},{...source,id:'unknown',lat:null,lng:null}];
 assert.equal(api.nearestMappedPoint(candidates,5.4,100.3).point.id,'near');
 assert.equal(api.nearestMappedPoint(candidates,NaN,100),null);
 assert(api.distanceKm(5.4,100.3,5.5,100.3)>11);
 assert.equal(api.nearestMappedPoint([candidates[2],candidates[3]],5.4,100.3),null);
});
