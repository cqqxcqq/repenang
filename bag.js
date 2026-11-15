'use strict';
(function(root){
  function suggestions(directory, items, entries, onDate) {
    const sources=Object.fromEntries(directory.sources.map(s=>[s.id,s]));
    return directory.locations.map(place=>{
      const matches=entries.map(entry=>({item:items.find(i=>i.id===entry.id),...root.PulangDirectory.assessItem(place,items.find(i=>i.id===entry.id),entry.condition,onDate,sources)}));
      return {place,matches,listed:matches.filter(m=>m.status==='source_listed').length,confirm:matches.filter(m=>m.status==='confirm_item').length};
    }).filter(r=>r.listed+r.confirm>0).sort((a,b)=>b.listed-a.listed||b.confirm-a.confirm||a.place.name.localeCompare(b.place.name));
  }
  let directory,items=[],entries=[],selectPlace,opened=false;
  const $=id=>document.getElementById(id);
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  function close(){opened=false;$('bag-panel').hidden=true;$('bag-toggle').setAttribute('aria-expanded','false');}
  function save(){try{localStorage.setItem('pulang-bag-v1',JSON.stringify(entries));}catch{}$('bag-count').textContent=entries.length;}
  function draw(){
    const panel=$('bag-panel');panel.replaceChildren();
    const head=el('div',null,'bag-heading');head.append(el('h2','Your bag'));
    const dismiss=el('button','×','bag-close');dismiss.type='button';dismiss.setAttribute('aria-label','Close bag');dismiss.onclick=()=>{close();$('bag-toggle').focus();};head.append(dismiss);panel.append(head);
    panel.append(el('p','Choose what you have. Suggestions update as you pack.','bag-intro'));
    if(entries.length){const jump=el('button','See suggestions','bag-view');jump.type='button';jump.onclick=()=>panel.querySelector('.bag-suggestions').scrollIntoView({block:'start',behavior:'smooth'});panel.append(jump);}
    const list=el('div',null,'bag-items');
    for(const item of items){
      const row=el('div',null,'bag-item');const label=el('label');const input=el('input');input.type='checkbox';input.checked=entries.some(e=>e.id===item.id);input.onchange=()=>{entries=entries.filter(e=>e.id!==item.id);if(input.checked)entries.push({id:item.id,condition:'ready'});save();draw();panel.querySelector(`input[data-bag-item="${item.id}"]`)?.focus();};input.dataset.bagItem=item.id;label.append(input,document.createTextNode(item.label));row.append(label);
      const entry=entries.find(e=>e.id===item.id);
      if(entry){row.append(el('p',item.preparation,'bag-preparation'));const condition=el('select');condition.setAttribute('aria-label',`${item.label} condition`);for(const [value,text] of [['ready','Ready to hand over'],['needs_preparation','Needs preparation'],['damaged','Damaged / contaminated']]){const option=el('option',text);option.value=value;condition.append(option);}condition.value=entry.condition;condition.onchange=()=>{entry.condition=condition.value;save();draw();panel.querySelector(`select[data-bag-item="${item.id}"]`)?.focus();};condition.dataset.bagItem=item.id;row.append(condition);}
      list.append(row);
    }
    panel.append(list);
    const result=el('section',null,'bag-suggestions');result.setAttribute('aria-label','Suggested collection points');result.append(el('h3','Places for your bag'));
    const live=el('p',null,'bag-summary');live.setAttribute('role','status');
    if(!entries.length){live.textContent='Add an item to see matching collection points.';result.append(live);}
    else{
      const ranked=suggestions(directory,items,entries,root.PulangDirectory.today());
      live.textContent=ranked.length?'Ranked by published item coverage. Collection times and access still apply.':'No published match for this bag. Check item condition or contact a suitable collector.';result.append(live);
      const names={source_listed:'Listed for this item',confirm_item:'Call to confirm this item',prepare_first:'Prepare first',not_accepted:'Not accepted',not_listed:'Not listed here',unsuitable:'Separate handling',review_required:'Source review needed'};
      for(const rec of ranked.slice(0,3)){
        const article=el('article',null,'bag-suggestion');article.append(el('h4',rec.place.name),el('p',`${rec.listed} of ${entries.length} items explicitly listed${rec.confirm?` · ${rec.confirm} need confirmation`:''}`),el('p',rec.place.hours.display));
        const details=el('details');details.append(el('summary','See each item'));for(const match of rec.matches)details.append(el('p',`${match.item.label}: ${names[match.status]}. ${match.reason}`));article.append(details);
        const open=el('button','View place on map','bag-view');open.type='button';open.onclick=()=>{close();selectPlace(rec.place.id);};article.append(open);result.append(article);
      }
      const covered=new Set(ranked.flatMap(r=>r.matches.filter(m=>['source_listed','confirm_item'].includes(m.status)).map(m=>m.item.id)));
      for(const entry of entries.filter(e=>!covered.has(e.id))){const item=items.find(i=>i.id===entry.id);result.append(el('p',`${item.label}: ${entry.condition==='needs_preparation'?item.preparation:item.route==='residual'?'Keep with residual waste.':entry.condition==='damaged'?item.caution:'No supported collection match in this directory.'}`,'bag-unmatched'));}
    }
    panel.append(result);
    if(entries.length){const clear=el('button','Empty bag','bag-clear');clear.type='button';clear.onclick=()=>{entries=[];save();draw();};panel.append(clear);}
  }
  async function mount(data,onSelect){
    directory=data;selectPlace=onSelect;
    const toggle=$('bag-toggle');toggle.hidden=false;
    try { const saved=JSON.parse(localStorage.getItem('pulang-bag-v1')); if(Array.isArray(saved))$('bag-count').textContent=Math.min(17,new Set(saved.filter(e=>typeof e?.id==='string').map(e=>e.id)).size); } catch {}
    toggle.onclick=async()=>{
      if(opened){close();return;}
      opened=true;$('bag-panel').hidden=false;toggle.setAttribute('aria-expanded','true');
      if(items.length){draw();$('bag-panel').querySelector('.bag-close').focus();return;}
      $('bag-panel').textContent='Opening your bag…';
      try{const response=await fetch('data/items.json',{cache:'no-cache'});if(!response.ok)throw Error('catalogue unavailable');const catalogue=await response.json();if(catalogue.reviewDueAt<root.PulangDirectory.today()||!Array.isArray(catalogue.items)||!catalogue.items.length)throw Error('catalogue needs review');items=catalogue.items;
        try{const saved=JSON.parse(localStorage.getItem('pulang-bag-v1'));if(Array.isArray(saved))entries=saved.filter((e,i,a)=>e&&items.some(item=>item.id===e.id)&&['ready','needs_preparation','damaged'].includes(e.condition)&&a.findIndex(x=>x?.id===e.id)===i).map(e=>({id:e.id,condition:e.condition}));}catch{}
        save();if(opened){draw();$('bag-panel').querySelector('.bag-close').focus();}
      }catch{const panel=$('bag-panel');panel.replaceChildren(el('p','The item list could not load. Close the bag and try again.'));const button=el('button','Close bag');button.onclick=close;panel.append(button);}
    };
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened){close();toggle.focus();}});
    api.ready=true;
  }
  const api={mount,close,suggestions,ready:false};root.PulangBag=api;
})(window);
