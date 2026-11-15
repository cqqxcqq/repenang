'use strict';
(function(root){
  function suggestions(directory, items, entries, onDate) {
    const sources=Object.fromEntries(directory.sources.map(s=>[s.id,s]));
    return directory.locations.map(place=>{
      const matches=entries.map(entry=>({item:items.find(i=>i.id===entry.id),...root.PulangDirectory.assessItem(place,items.find(i=>i.id===entry.id),entry.condition,onDate,sources)}));
      return {place,matches,listed:matches.filter(m=>m.status==='source_listed').length,confirm:matches.filter(m=>m.status==='confirm_item').length};
    }).filter(r=>r.listed+r.confirm>0).sort((a,b)=>b.listed-a.listed||b.confirm-a.confirm||a.place.name.localeCompare(b.place.name));
  }
  let directory,items=[],entries=[],selectPlace,updateMap,opened=false;
  const $=id=>document.getElementById(id);
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  function syncNavigation(active){
    const nav=$('bag-nav-main');nav.setAttribute('aria-expanded',String(active));nav.classList.toggle('active',active);
    if(active){document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.remove('active');b.removeAttribute('aria-current');});nav.setAttribute('aria-current','page');}
    else {nav.removeAttribute('aria-current');const mapButton=document.querySelector('[data-tab="map"]');mapButton.classList.add('active');mapButton.setAttribute('aria-current','page');}
  }
  function close(){const wasOpen=opened;opened=false;$('bag-panel').hidden=true;$('bag-toggle').setAttribute('aria-expanded','false');if(wasOpen)syncNavigation(false);}
  function save(){try{localStorage.setItem('pulang-bag-v1',JSON.stringify(entries));}catch{}$('bag-count').textContent=entries.length;syncMap();}
  function syncMap(){if(updateMap)updateMap(entries.length?suggestions(directory,items,entries,root.PulangDirectory.today()).slice(0,3).map(r=>r.place.id):null);}
  let view='items', editing=null;
  function icon(material){
    const source=Array.from(document.querySelectorAll('#material-options button')).find(b=>b.dataset.value===material)?.querySelector('svg');
    return source?source.cloneNode(true):document.createTextNode('');
  }
  function switchView(next){view=next;editing=null;draw();$('bag-panel').querySelector('.bag-body').scrollTop=0;}
  function draw(){
    const panel=$('bag-panel');panel.replaceChildren();
    const head=el('div',null,'bag-heading');head.append(el('h2','Your bag'));
    const dismiss=el('button','×','bag-close');dismiss.type='button';dismiss.setAttribute('aria-label','Close bag');dismiss.onclick=()=>{close();$('bag-toggle').focus();};head.append(dismiss);panel.append(head);
    const nav=el('div',null,'bag-nav');
    for(const [id,label] of [['items','Items'],['places','Places']]){const button=el('button',label+(id==='items'&&entries.length?' · '+entries.length:''));button.type='button';button.setAttribute('aria-pressed',String(view===id));button.onclick=()=>switchView(id);nav.append(button);}panel.append(nav);
    const body=el('div',null,'bag-body');panel.append(body);
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
      const ranked=entries.length?suggestions(directory,items,entries,root.PulangDirectory.today()):[];
      if(!ranked.length){const live=el('p',entries.length?'No matching places.':'Choose items first.','bag-summary');live.setAttribute('role','status');result.append(live);}
      const names={source_listed:'Listed',confirm_item:'Confirm first',prepare_first:'Prepare first',not_accepted:'Not accepted',not_listed:'Not listed',unsuitable:'Separate handling',review_required:'Review needed'};
      for(const rec of ranked.slice(0,3)){
        const article=el('article',null,'bag-suggestion');const title=el('button',rec.place.name,'bag-place-name');title.type='button';title.onclick=()=>{close();selectPlace(rec.place.id);};article.append(title,el('p',rec.listed+'/'+entries.length+' listed'+(rec.confirm?' · '+rec.confirm+' to confirm':''),'bag-coverage'),el('p',rec.place.hours.display,'bag-hours'));
        const details=el('details');details.append(el('summary','Items'));for(const match of rec.matches)details.append(el('p',match.item.label+' · '+names[match.status]));article.append(details);
        const open=el('button','View on map','bag-view');open.type='button';open.onclick=()=>{close();selectPlace(rec.place.id);};article.append(open);result.append(article);
      }
      const covered=new Set(ranked.flatMap(r=>r.matches.filter(m=>['source_listed','confirm_item'].includes(m.status)).map(m=>m.item.id)));
      for(const entry of entries.filter(e=>!covered.has(e.id))){const item=items.find(i=>i.id===entry.id);result.append(el('p',item.label+' · '+(entry.condition==='needs_preparation'?'Prepare first':item.route==='residual'?'Residual waste':entry.condition==='damaged'?'Contact a specialist':'No listed match'),'bag-unmatched'));}
    }
    const footer=el('div',null,'bag-footer');const action=el('button',view==='items'?'Find places'+(entries.length?' · '+entries.length:''):'Edit items','bag-primary');action.type='button';action.disabled=view==='items'&&!entries.length;action.onclick=()=>switchView(view==='items'?'places':'items');footer.append(action);
    if(entries.length){const clear=el('button','Empty bag','bag-clear');clear.type='button';clear.onclick=()=>{entries=[];editing=null;view='items';save();draw();};footer.append(clear);}panel.append(footer);
  }
  async function mount(data,onSelect,onChange){
    directory=data;selectPlace=onSelect;updateMap=onChange;
    const toggle=$('bag-toggle');toggle.hidden=false;
    try { const saved=JSON.parse(localStorage.getItem('pulang-bag-v1')); if(Array.isArray(saved))$('bag-count').textContent=Math.min(17,new Set(saved.filter(e=>typeof e?.id==='string').map(e=>e.id)).size); } catch {}
    toggle.onclick=async()=>{
      if(opened){close();return;}
      opened=true;$('bag-panel').hidden=false;toggle.setAttribute('aria-expanded','true');syncNavigation(true);
      if(items.length){syncMap();draw();$('bag-panel').querySelector('.bag-close').focus();return;}
      $('bag-panel').textContent='Opening your bag…';
      try{const response=await fetch('data/items.json',{cache:'no-cache'});if(!response.ok)throw Error('catalogue unavailable');const catalogue=await response.json();if(catalogue.reviewDueAt<root.PulangDirectory.today()||!Array.isArray(catalogue.items)||!catalogue.items.length)throw Error('catalogue needs review');items=catalogue.items;
        try{const saved=JSON.parse(localStorage.getItem('pulang-bag-v1'));if(Array.isArray(saved))entries=saved.filter((e,i,a)=>e&&items.some(item=>item.id===e.id)&&['ready','needs_preparation','damaged'].includes(e.condition)&&a.findIndex(x=>x?.id===e.id)===i).map(e=>({id:e.id,condition:e.condition}));}catch{}
        save();if(opened){draw();$('bag-panel').querySelector('.bag-close').focus();}
      }catch{const panel=$('bag-panel');panel.replaceChildren(el('p','The item list could not load. Close the bag and try again.'));const button=el('button','Close bag');button.onclick=close;panel.append(button);}
    };
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened){close();toggle.focus();}});
    api.open=()=>{if(!opened)return toggle.onclick();};
    $('bag-nav-main').disabled=false;
    api.ready=true;
  }
  const api={mount,close,suggestions,ready:false};root.PulangBag=api;
})(window);
