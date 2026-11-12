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
