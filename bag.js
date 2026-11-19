'use strict';
(function(root){
  function suggestions(directory, items, entries, onDate, origin=null) {
    const sources=Object.fromEntries(directory.sources.map(s=>[s.id,s]));
    return directory.locations.map(place=>{
      const matches=entries.map(entry=>({item:items.find(i=>i.id===entry.id),...root.PulangDirectory.assessItem(place,items.find(i=>i.id===entry.id),entry.condition,onDate,sources)}));
      const listed=matches.filter(m=>m.status==='source_listed').length,confirm=matches.filter(m=>m.status==='confirm_item').length,prepare=matches.filter(m=>m.status==='prepare_first').length;
      const coverage=listed+confirm+prepare;
      const group=coverage<entries.length?'partial':prepare?'prepare':confirm?'confirm':'whole';
      const rad=Math.PI/180;
      const distance=origin&&Number.isFinite(origin.lat)&&Number.isFinite(origin.lng)?6371*2*Math.asin(Math.min(1,Math.sqrt(Math.sin((place.lat-origin.lat)*rad/2)**2+Math.cos(origin.lat*rad)*Math.cos(place.lat*rad)*Math.sin((place.lng-origin.lng)*rad/2)**2))):null;
      return {place,matches,listed,confirm,prepare,coverage,group,distance};
    }).filter(r=>r.coverage>0).sort((a,b)=>({whole:0,confirm:1,prepare:2,partial:3}[a.group]-{whole:0,confirm:1,prepare:2,partial:3}[b.group])||b.coverage-a.coverage||b.listed-a.listed||(a.distance!==null&&b.distance!==null?a.distance-b.distance:0)||a.place.name.localeCompare(b.place.name));
  }
  let directory,items=[],entries=[],selectPlace,updateMap,getOrigin,origin=null,opened=false;
  const rankedPlaces=()=>suggestions(directory,items,entries,root.PulangDirectory.today(),origin);
  let resultGroup='all';
  const shownPlaces=()=>rankedPlaces().filter(r=>resultGroup==='all'||r.group===resultGroup);
  const $=id=>document.getElementById(id);
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  function syncNavigation(active){
    const nav=$('bag-nav-main');nav.setAttribute('aria-expanded',String(active));nav.classList.toggle('active',active);
    if(active){document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.remove('active');b.removeAttribute('aria-current');});nav.setAttribute('aria-current','page');}
    else {nav.removeAttribute('aria-current');const mapButton=document.querySelector('[data-tab="map"]');mapButton.classList.add('active');mapButton.setAttribute('aria-current','page');}
  }
  function close(){const wasOpen=opened;opened=false;$('bag-panel').hidden=true;$('bag-nav-main').setAttribute('aria-expanded','false');if(wasOpen)syncNavigation(false);}
  let storageNotice='';
  function save(){try{localStorage.setItem('pulang-bag-v1',JSON.stringify(entries));storageNotice='';}catch{storageNotice='Bag kept for this visit only.';}$('bag-count').textContent=entries.length||'';resultGroup='all';syncMap();}
  function syncMap(){if(updateMap)updateMap(entries.length?shownPlaces().map(r=>r.place.id):null);}
  let view='items', editing=null;
  function icon(material){
    const source=Array.from(document.querySelectorAll('#material-options button')).find(b=>b.dataset.value===material)?.querySelector('svg');
    return source?source.cloneNode(true):document.createTextNode('');
  }
  function switchView(next){view=next;editing=null;draw();$('bag-panel').querySelector('.bag-body').scrollTop=0;}
  function draw(){
    const panel=$('bag-panel');panel.replaceChildren();
    const head=el('div',null,'bag-heading');head.append(el('h2','Your bag'));
    const dismiss=el('button','×','bag-close');dismiss.type='button';dismiss.setAttribute('aria-label','Close bag');dismiss.onclick=()=>{close();$('bag-nav-main').focus();};head.append(dismiss);panel.append(head);
    const nav=el('div',null,'bag-nav');
    for(const [id,label] of [['items','Items'],['places','Places']]){const button=el('button',label+(id==='items'&&entries.length?' · '+entries.length:''));button.type='button';button.setAttribute('aria-pressed',String(view===id));button.onclick=()=>switchView(id);nav.append(button);}panel.append(nav);
    const body=el('div',null,'bag-body');panel.append(body);
    if(storageNotice){const notice=el('p',storageNotice,'bag-summary');notice.setAttribute('role','status');body.append(notice);}
    if(view==='items'){
      body.append(el('p','What are you taking?','bag-intro'));
      const grid=el('div',null,'bag-items');
      for(const item of items){const selected=entries.some(e=>e.id===item.id);const button=el('button',null,'bag-choice');button.type='button';button.dataset.bagItem=item.id;button.setAttribute('aria-pressed',String(selected));button.append(icon(item.material),el('span',item.label));button.onclick=()=>{entries=entries.filter(e=>e.id!==item.id);if(!selected)entries.push({id:item.id,condition:'ready'});save();draw();panel.querySelector('[data-bag-item="'+item.id+'"]').focus();};grid.append(button);}body.append(grid);
      if(entries.length){
        const selected=el('section',null,'bag-selected');selected.append(el('h3','In your bag'));
        for(const entry of entries){const item=items.find(i=>i.id===entry.id);const row=el('div',null,'bag-selected-row');const button=el('button',null,'bag-edit');button.type='button';button.dataset.editItem=item.id;button.setAttribute('aria-expanded',String(editing===item.id));button.append(el('span',item.label),el('span',entry.condition==='ready'?'Ready':entry.condition==='needs_preparation'?'Prepare first':'Separate handling','bag-item-state'));button.onclick=()=>{editing=editing===item.id?null:item.id;draw();panel.querySelector('[data-edit-item="'+item.id+'"]').focus();};row.append(button);
          if(editing===item.id){row.append(el('p',item.preparation,'bag-preparation'));const group=el('div',null,'bag-conditions');group.setAttribute('role','group');group.setAttribute('aria-label',item.label+' condition');for(const [value,label] of [['ready','Ready'],['needs_preparation','Prepare first'],['damaged','Damaged / dirty']]){const option=el('button',label);option.type='button';option.dataset.condition=value;option.setAttribute('aria-pressed',String(entry.condition===value));option.onclick=()=>{entry.condition=value;save();draw();panel.querySelector('[data-edit-item="'+item.id+'"]').focus();};group.append(option);}row.append(group);}selected.append(row);
        }body.append(selected);
      }
    }else{
      const result=el('section',null,'bag-suggestions');result.setAttribute('aria-label','Suggested collection points');body.append(result);
      const allRanked=entries.length?rankedPlaces():[];
      const ranked=allRanked.filter(r=>resultGroup==='all'||r.group===resultGroup);
      if(!ranked.length){const live=el('p',entries.length?'No matching places.':'Choose items first.','bag-summary');live.setAttribute('role','status');result.append(live);}
      else {const tools=el('div',null,'bag-result-tools');const count=el('span',ranked.length+' places');count.setAttribute('role','status');tools.append(count);if(getOrigin){const near=el('button','Use map centre');near.type='button';near.title='Break coverage ties by straight-line distance from the current map centre';near.onclick=()=>{origin=getOrigin();syncMap();draw();};tools.append(near);}result.append(tools);
        const filters=el('div',null,'bag-result-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Collection match type');
        for(const [group,label] of [['all','All'],['whole','Whole bag'],['confirm','Check first'],['prepare','Prepare first'],['partial','Partial']]){const count=group==='all'?allRanked.length:allRanked.filter(r=>r.group===group).length;if(!count)continue;const button=el('button',label+' · '+count);button.type='button';button.dataset.resultGroup=group;button.setAttribute('aria-pressed',String(resultGroup===group));button.onclick=()=>{resultGroup=group;syncMap();draw();panel.querySelector('[data-result-group="'+group+'"]').focus();};filters.append(button);}result.append(filters);
      }
      const names={source_listed:'Listed',confirm_item:'Confirm first',prepare_first:'Prepare first',not_accepted:'Not accepted',not_listed:'Not listed',unsuitable:'Separate handling',review_required:'Review needed'};
      let lastGroup=null;
      for(const rec of ranked){
        if(rec.group!==lastGroup){const labels={whole:'Whole bag',confirm:'Check first',prepare:'Prepare first',partial:'Part of your bag'};result.append(el('h3',labels[rec.group]+' · '+ranked.filter(r=>r.group===rec.group).length,'bag-group-heading'));lastGroup=rec.group;}
        const article=el('article',null,'bag-suggestion');const title=el('button',rec.place.name,'bag-place-name');title.type='button';title.onclick=()=>{close();selectPlace(rec.place.id);};article.append(title,el('p',rec.listed+'/'+entries.length+' listed'+(rec.confirm?' · '+rec.confirm+' to confirm':'')+(rec.prepare?' · '+rec.prepare+' to prepare':''),'bag-coverage'),el('p',rec.place.hours.display,'bag-hours'));
        if(rec.distance!==null)article.append(el('p',rec.distance.toFixed(1)+' km from map centre','bag-distance'));
        const details=el('details');details.append(el('summary','Items'));for(const match of rec.matches)details.append(el('p',match.item.label+' · '+names[match.status]));article.append(details);
        const open=el('button','View on map','bag-view');open.type='button';open.onclick=()=>{close();selectPlace(rec.place.id);};article.append(open);result.append(article);
      }
      const covered=new Set(allRanked.flatMap(r=>r.matches.filter(m=>['source_listed','confirm_item','prepare_first'].includes(m.status)).map(m=>m.item.id)));
      for(const entry of entries.filter(e=>!covered.has(e.id))){const item=items.find(i=>i.id===entry.id);result.append(el('p',item.label+' · '+(entry.condition==='needs_preparation'?'Prepare first':item.route==='residual'?'Residual waste':entry.condition==='damaged'?'Contact a specialist':'No listed match'),'bag-unmatched'));}
    }
    const footer=el('div',null,'bag-footer');const action=el('button',view==='items'?'Find places'+(entries.length?' · '+entries.length:''):'Edit items','bag-primary');action.type='button';action.disabled=view==='items'&&!entries.length;action.onclick=()=>switchView(view==='items'?'places':'items');footer.append(action);
    if(entries.length){const clear=el('button','Empty bag','bag-clear');clear.type='button';clear.onclick=()=>{entries=[];editing=null;view='items';save();draw();};footer.append(clear);}panel.append(footer);
  }
  let catalogue=null, loading=null;
  function restoreEntries(){
    try{const saved=JSON.parse(localStorage.getItem('pulang-bag-v1'));entries=Array.isArray(saved)?saved.filter((entry,index,all)=>entry&&items.some(item=>item.id===entry.id)&&['ready','needs_preparation','damaged'].includes(entry.condition)&&all.findIndex(other=>other?.id===entry.id)===index).map(entry=>({id:entry.id,condition:entry.condition})):[];}
    catch{entries=[];}
    $('bag-count').textContent=entries.length||'';
  }
  async function loadItems(){
    const sources=Object.fromEntries(directory.sources.map(source=>[source.id,source]));
    if(catalogue&&!root.PulangDirectory.validateItems(catalogue,sources).length)return;
    if(!loading)loading=(async()=>{
      const response=await fetch('data/items.json',{cache:'no-cache'});
      if(!response.ok)throw Error('Item request failed');
      const next=await response.json();
      if(root.PulangDirectory.validateItems(next,sources).length)throw Error('Item review required');
      catalogue=next;items=next.items;restoreEntries();
    })().finally(()=>{loading=null;});
    await loading;
  }
  function showLoadError(){
    const panel=$('bag-panel');panel.replaceChildren();
    const header=el('div',null,'bag-heading');header.append(el('h2','Your bag'));
    const dismiss=el('button','×','bag-close');dismiss.type='button';dismiss.setAttribute('aria-label','Close bag');dismiss.onclick=()=>{close();$('bag-nav-main').focus();};header.append(dismiss);panel.append(header);
    const body=el('div',null,'bag-body');const message=el('p','Items are temporarily unavailable.','bag-summary');message.setAttribute('role','alert');body.append(message);
    const retry=el('button','Try again','bag-view');retry.type='button';retry.onclick=()=>openBag(true);body.append(retry);panel.append(body);retry.focus();
  }
  async function openBag(retry=false){
    if(opened&&!retry)return;
    origin=getOrigin?.()||origin;
    opened=true;$('bag-panel').hidden=false;syncNavigation(true);
    const pending=el('p','Opening your bag…','bag-summary');pending.setAttribute('role','status');$('bag-panel').replaceChildren(pending);
    try{await loadItems();if(!opened)return;syncMap();draw();$('bag-panel').querySelector('.bag-close').focus();}
    catch{if(opened)showLoadError();}
  }
  function mount(data,onSelect,onChange,mapOrigin){
    directory=data;selectPlace=onSelect;updateMap=onChange;getOrigin=mapOrigin;
    try{const saved=JSON.parse(localStorage.getItem('pulang-bag-v1'));if(Array.isArray(saved))$('bag-count').textContent=new Set(saved.filter(entry=>entry&&typeof entry.id==='string'&&['ready','needs_preparation','damaged'].includes(entry.condition)).map(entry=>entry.id)).size||'';}catch{}
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened){close();$('bag-nav-main').focus();}});
    api.open=openBag;$('bag-nav-main').disabled=false;api.ready=true;
  }
  const api={mount,close,suggestions,ready:false};root.PulangBag=api;
})(window);
