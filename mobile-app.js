// Keep the existing navigation handlers and accessible labels.
const paths={
 todo:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 9 1.5 1.5L12 8M8 16h1m4-6h3m-3 6h3"/>',
 calendrier:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/>',
 hotels:'<path d="M3 21V7l9-4 9 4v14M8 21v-5h8v5M7 9h1m8 0h1M7 12h1m8 0h1"/>',
 documents:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 5V3h8v2m-4 7v4m-2-2h4"/><circle cx="12" cy="14" r="5"/>',
 urgence:'<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
 finances:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M16 11h5v5h-5a2.5 2.5 0 0 1 0-5ZM6 5V3h12"/>',
};
for(const button of document.querySelectorAll('.tabs button[data-t]')){
 if(!paths[button.dataset.t]||button.querySelector('.ios-tab-icon'))continue;
 const icon=document.createElement('span');icon.className='ios-tab-icon';icon.setAttribute('aria-hidden','true');
 icon.innerHTML='<svg viewBox="0 0 24 24">'+paths[button.dataset.t]+'</svg>';button.prepend(icon);
}
// Keep the existing destination buttons for desktop and route the mobile sheet
// through their handlers so navigation, counts and URL state stay in one place.
const mobileTabs=document.querySelector('.appbar .tabs');
if(mobileTabs){
 const extraDestinations=[['hotels','Hôtels'],['meteo','Météo'],['todo','À faire'],['finances','Finance']];
 const more=document.createElement('button');more.type='button';more.className='mobile-more-button';
 more.setAttribute('aria-haspopup','dialog');more.setAttribute('aria-controls','mobile-more-dialog');more.setAttribute('aria-expanded','false');
 more.innerHTML='<span class="ios-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></span><span>Plus</span>';
 const sheet=document.createElement('dialog');sheet.id='mobile-more-dialog';sheet.className='mobile-more-dialog';sheet.setAttribute('aria-labelledby','mobile-more-title');
 const head=document.createElement('div');head.className='mobile-more-head';
 const title=document.createElement('h2');title.id='mobile-more-title';title.textContent='Autres rubriques';
 const close=document.createElement('button');close.type='button';close.textContent='Fermer';close.onclick=()=>sheet.close();head.append(title,close);sheet.append(head);
 const choices=document.createElement('div');choices.className='mobile-more-choices';
 const entries=[];
 for(const [id,label] of extraDestinations){
  const destination=mobileTabs.querySelector('[data-t="'+id+'"]');if(!destination)continue;
  const choice=document.createElement('button');choice.type='button';
  const icon=destination.querySelector('.ios-tab-icon');if(icon)choice.append(icon.cloneNode(true));
  const text=document.createElement('span');text.textContent=label;choice.append(text);
  choice.onclick=()=>{sheet.close();destination.click();};choices.append(choice);entries.push({destination,choice});
 }
 sheet.append(choices);document.body.append(sheet);mobileTabs.append(more);
 more.onclick=()=>{sheet.showModal();more.setAttribute('aria-expanded','true');};
 sheet.addEventListener('close',()=>more.setAttribute('aria-expanded','false'));
 sheet.addEventListener('click',event=>{if(event.target===sheet){const r=sheet.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)sheet.close();}});
 const updateMore=()=>{let active=false;for(const {destination,choice} of entries){const selected=destination.getAttribute('aria-current')==='true';choice.setAttribute('aria-current',String(selected));active||=selected;}more.classList.toggle('is-active',active);};
 updateMore();new MutationObserver(updateMore).observe(mobileTabs,{attributes:true,subtree:true,attributeFilter:['aria-current']});
 const mobile=matchMedia('(max-width:1000px)');mobile.addEventListener('change',()=>{if(!mobile.matches&&sheet.open)sheet.close();});
}
const financeRows=document.getElementById('finrows');
const financeLabels=['Dépense','Catégorie','Statut','Payé par','Pour','Date / échéance','Montant','Devise','Note',''];
function labelFinance(){
 for(const row of financeRows?.rows||[]){
  [...row.cells].forEach((cell,index)=>{
   cell.dataset.mobileLabel=financeLabels[index];
   const field=cell.querySelector('input,select,textarea');
   if(field&&!field.hasAttribute('aria-label'))field.setAttribute('aria-label',financeLabels[index]);
  });
 }
}
if(financeRows){labelFinance();new MutationObserver(labelFinance).observe(financeRows,{childList:true,subtree:true});}

const access=window.parent.VoyageAccess;
if(access?.isOffline()){
 const notice=document.createElement('div');notice.className='offline-notice';notice.setAttribute('role','status');
 const title=document.createElement('strong');title.textContent='Copie hors ligne · consultation';notice.append(title);
 const savedAt=access.offlineInfo?.().savedAt;
 notice.append(document.createTextNode(savedAt?'Préparée le '+new Date(savedAt).toLocaleString('fr-FR')+'. Sans Authenticator.':'Sans Authenticator. Les changements ne sont pas enregistrés.'));
 document.querySelector('.appbar')?.after(notice);
 function readOnly(){
  document.querySelectorAll('.mdetail input,.mdetail textarea,.mdetail .mdel,.fintable input,.fintable select,.fintable textarea,.fintable button,#finrate,#finadd,#docadd,.vault-menu-items .danger,#docimportbtn,#finduo button,.vault-edit input,.vault-edit select,[data-urg-profile] input,[data-urg-profile] textarea,[data-urg-profile] button,.todocard input,.todocard .del,.todocard .plus,.todocard form button,.reservation-done').forEach(field=>{field.disabled=true;});
  document.querySelectorAll('.psync,#finsync,#todosync').forEach(label=>{if(label.textContent!=='Copie hors ligne · consultation')label.textContent='Copie hors ligne · consultation';});
 }
 readOnly();new MutationObserver(readOnly).observe(document.body,{childList:true,subtree:true});
}
