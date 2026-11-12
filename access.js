import {initNotifications} from './notifications.js';
import {CONFIG} from './config.js';
import {seal,unseal} from './crypto.js';
import {createSessionStorage} from './session-storage.js';
const $=id=>document.getElementById(id);
const bootStarted=performance.now();
let offlineDocuments=null, offlineSavedAt=null, offlineAssets={}, bootAttempt=0;
let pdfLibrary=null;
async function loadPdfLibrary(){if(!pdfLibrary)pdfLibrary=import('./vendor/pdfjs/pdf.min.mjs').then(lib=>{lib.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',location.href).href;return lib;}).catch(e=>{pdfLibrary=null;throw e;});return pdfLibrary;}
function offlineHTML(source){
 for(const name of ['mobile-app.css','vendor/leaflet.css'])if(offlineAssets[name])source=source.replace(new RegExp('<link[^>]+href="'+name.replaceAll('.','\\.')+'"[^>]*>','g'),()=>'<style>'+offlineAssets[name]+'</style>');
 for(const name of ['mobile-app.js','vendor/leaflet.js'])if(offlineAssets[name])source=source.replace(new RegExp('<script([^>]*)src="'+name.replaceAll('.','\\.')+'"[^>]*></script>','g'),(_,attrs)=>'<script'+attrs+'>'+offlineAssets[name]+'</script>');
 for(const name of ['oogway.png','po.png','huahua-sticker.png'])if(offlineAssets[name])source=source.replaceAll('src="'+name+'"','src="'+offlineAssets[name]+'"');
 return source;
}
function deadline(promise,ms=20000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Le réseau ne répond pas. Réessaie ou ouvre ta copie hors ligne.')),ms);})]).finally(()=>clearTimeout(timer));}
function showOfflineForm(){bootAttempt++;resumeAllowed=false;$('boot').hidden=true;$('gate').hidden=false;$('login').hidden=true;$('mfa').hidden=true;$('resume-session').hidden=true;$('offline-form').hidden=false;$('offline-phrase').focus();status('Sans réseau ni Authenticator. Utilise le mot de passe de la dernière copie.');}
// Offer the local copy independently of auth startup and token refresh.
void db('readonly',s=>s.get('snapshot')).then(copy=>{if(copy){$('offline-open').hidden=false;$('boot-offline').hidden=false;}}).catch(()=>{});
$('boot-offline').onclick=showOfflineForm;
const api=window.supabase.createClient(CONFIG.url,CONFIG.key,{auth:{experimental:{passkey:true},storage:createSessionStorage(),storageKey:CONFIG.storageKey,flowType:'pkce',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
let factor=null, html='', vaultKey=null, offline=false, values=Object.create(null), responses=Object.create(null), opening=false, recovering=false, booting=true, resuming=false, resumeAllowed=true;
const storage={get length(){return Object.keys(values).length;},key:i=>Object.keys(values)[i]??null,getItem:k=>{if(k==='chine-hotel-view'||k==='chine-grille'){try{return localStorage.getItem(k);}catch{}}return values[k]??null;},setItem(k,v){values[k]=String(v);if((k==='chine-hotel-view'||k==='chine-grille')&&String(v).length<10000){try{localStorage.setItem(k,String(v));}catch{}}},removeItem(k){delete values[k];},clear(){values=Object.create(null);}};
const status=t=>{$('status').textContent=t;};
async function db(mode,fn){const database=await new Promise((resolve,reject)=>{const r=indexedDB.open('voyage-offline-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('copies');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return new Promise((resolve,reject)=>{const tx=database.transaction('copies',mode),r=fn(tx.objectStore('copies'));let value;r.onsuccess=()=>{value=r.result;};tx.oncomplete=()=>{database.close();resolve(value);};tx.onerror=()=>{database.close();reject(tx.error);};});}
function hideTrip(){ $('trip').srcdoc='';$('trip').hidden=true;$('toolbar').close();$('gate').hidden=false;$('offline-save').hidden=true;$('invite-panel').hidden=true;$('invite-link').value='';html='';vaultKey=null;offlineDocuments=null;offlineSavedAt=null;values=Object.create(null);responses=Object.create(null); }
function reset(){ $('resume-session').hidden=true;factor=null;recovering=false;$('qr').removeAttribute('src');$('qr').hidden=true;$('code').value='';$('mfa').hidden=true;$('login').hidden=false;$('back').hidden=true;}
async function headers(){const {data,error}=await api.auth.getSession();if(error||!data.session)throw new Error('Reconnecte-toi pour synchroniser.');return {apikey:CONFIG.key,Authorization:'Bearer '+data.session.access_token};}
async function secureFetch(input,options={}){
  const attempt=bootAttempt;
  const u=new URL(typeof input==='string'?input:input.url,location.href);
  if(![CONFIG.url,CONFIG.oldOrigin].includes(u.origin)) throw new Error('Destination réseau non autorisée.');
  if(!/^\/rest\/v1\/(chine_plan|chine_finances|chine_todo|chine_hotel_wishlist|chine_coffre|chine_coffre_config)(\?|$)/.test(u.pathname+u.search))throw new Error('Ce service est indisponible dans cet accès.');
  const path=u.pathname+u.search, method=(options.method||'GET').toUpperCase();
  if(offline){if(method==='GET'&&Object.hasOwn(responses,path))return new Response(responses[path],{headers:{'Content-Type':'application/json'}});throw new Error('Copie hors ligne : synchronisation indisponible.');}
  const h=new Headers(options.headers);h.delete('x-chine-cle');for(const [k,v] of Object.entries(await headers()))h.set(k,v);
  const response=await fetch(CONFIG.url+path,{...options,headers:h,cache:'no-store',credentials:'omit',redirect:'error'});
  if(method==='GET'&&response.ok&&attempt===bootAttempt&&!offline)responses[path]=await response.clone().text();
  if((response.status===401||response.status===403)&&attempt===bootAttempt&&!offline){hideTrip();reset();status('L’accès a expiré ou a été révoqué. Reconnecte-toi.');}
  return response;
}
async function weather(points){
 const key='weather:v2';
 if(offline){if(responses[key])return JSON.parse(responses[key]);throw new Error('Météo indisponible hors ligne. Connecte-toi pour la charger.');}
 const response=await fetch(CONFIG.url+'/functions/v1/voyage-weather',{method:'POST',headers:{...await headers(),'Content-Type':'application/json'},body:JSON.stringify({points}),cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(90000)});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Météo indisponible. Reconnecte-toi si nécessaire.');
 responses[key]=JSON.stringify(result);return result;
}
window.VoyageAccess=Object.freeze({weather,request:secureFetch,storage,isOffline:()=>offline,getOfflineDocuments:()=>offlineDocuments,offlineInfo:()=>({savedAt:offlineSavedAt}),loadPdfLibrary,getVaultKey:()=>vaultKey,openExternal:url=>{const target=new URL(url);if(target.protocol!=='https:'||target.username||target.password)throw new Error('Lien externe non autorisé');window.open(target.href,'_blank','noopener,noreferrer');},openSettings:()=>{$('toolbar').showModal();},lock:()=>{$('lock').click();}});
function display(){ resumeAllowed=true;$('resume-session').hidden=true; $('gate').hidden=true;$('trip').hidden=false;$('prepare').hidden=offline;$('invite').hidden=true;$('reset-jade').hidden=true;if(!offline)api.rpc('voyage_can_invite').then(({data})=>{$('invite').hidden=data!==true;$('reset-jade').hidden=data!==true;});$('mode').textContent=offline?'Copie hors ligne · modifications non enregistrées':'Accès privé · Authenticator';$('trip').srcdoc=offline?offlineHTML(html):html;document.body.dataset.openMs=String(Math.round(performance.now()-bootStarted)); }
async function authorized(){const {data,error}=await api.rpc('voyage_claim');if(error||data!==true)throw new Error('Ce compte n’est pas autorisé, ou sa connexion a expiré.');}
async function openOnline(){
 if(opening)return;opening=true;const attempt=bootAttempt;
 try{
  // Both SELECTs enforce allowed() server-side, including member, AAL2 and live session.
  const [app,key]=await Promise.all([api.from('voyage_app').select('html').eq('id',1).single(),api.from('voyage_vault_key').select('key_b64').eq('id',1).single()]);
  if(app.error||!app.data?.html||key.error||!key.data?.key_b64)throw new Error('Connexion expirée ou accès refusé. Reconnecte-toi.');
  if(attempt!==bootAttempt)return;vaultKey=key.data.key_b64;offline=false;offlineDocuments=null;offlineSavedAt=null;html=app.data.html;
  if(html.startsWith('gzip:')){const bytes=Uint8Array.from(atob(html.slice(5)),c=>c.charCodeAt(0));html=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();}
  if(attempt!==bootAttempt)return;display();$('qr').removeAttribute('src');$('code').value='';
 }finally{opening=false;}
}
async function challenge(force=false){
 const attempt=bootAttempt;
 if(force)resumeAllowed=false;
 const {data:level,error}=await api.auth.mfa.getAuthenticatorAssuranceLevel();if(error)throw error;
 if(attempt!==bootAttempt)return;
 if(level.currentLevel==='aal2'&&!force){await openOnline();return;}
 const {data:account,error:accountError}=await api.rpc('voyage_account_status');
 if(attempt!==bootAttempt)return;
 if(accountError)throw new Error('Impossible de vérifier l’autorisation du compte.');
 if(account!=='approved'){reset();$('login').hidden=true;$('back').hidden=false;status('Accès refusé : utilise une adresse autorisée et vérifiée.');return;}
 const {data:factors,error:factorError}=await api.auth.mfa.listFactors();if(factorError)throw factorError;
 if(attempt!==bootAttempt)return;
 factor=factors.totp.find(f=>f.status==='verified')?.id;
 $('login').hidden=true;$('mfa').hidden=false;$('back').hidden=false;
 $('mfa-title').textContent=factor?'Code Authenticator':'Configurer Authenticator';
 if(!factor){
   for(const f of factors.all.filter(f=>f.factor_type==='totp'&&f.status==='unverified')){const {error}=await api.auth.mfa.unenroll({factorId:f.id});if(error)throw error;}
   const {data,error}=await api.auth.mfa.enroll({factorType:'totp',friendlyName:'Voyage personnel'});if(error)throw error;
   factor=data.id;$('qr').src=data.totp.qr_code;$('qr').hidden=false;
   $('mfa-help').textContent='Scanne ce QR code avec Authenticator, conserve sa sauvegarde dans un endroit protégé, puis entre le code affiché. Ne partage pas ce QR code dans le chat.';
 }else{$('qr').hidden=true;$('mfa-help').textContent=recovering?'Entre le code de ton application Authenticator. Tu choisiras ensuite ton nouveau mot de passe.':'Entre le code de ton application Authenticator.';}
 status('');$('code').focus();
}
// A used or expired link must not end the session already open on this device.
async function keepSession(message){const {data}=await api.auth.getSession();if(!data.session)throw new Error(message);await challenge();}
async function run(button,action){button.disabled=true;try{await action();}catch(e){status(e.message||'Connexion impossible.');}finally{button.disabled=false;}}
const passkeysAvailable=!!window.PublicKeyCredential&&typeof api.auth.signInWithPasskey==='function';
$('passkey-login').hidden=!passkeysAvailable;
$('passkey-help').hidden=!passkeysAvailable;
$('passkey-register').hidden=!passkeysAvailable;
$('passkey-login').onclick=()=>run($('passkey-login'),async()=>{status('Valide la clé d’accès sur ton appareil…');const {error}=await api.auth.signInWithPasskey();if(error)throw new Error('Aucune clé utilisable ou validation annulée. Pour activer Face ID, connecte-toi avec ton mot de passe et Authenticator, puis ouvre Options → Activer Face ID / clé d’accès.');await challenge();});
$('passkey-register').onclick=async()=>{const button=$('passkey-register');button.disabled=true;try{await authorized();$('passkey-status').textContent='Valide la création sur ton appareil…';const {error}=await api.auth.registerPasskey();if(error)throw error;$('passkey-status').textContent='Clé d’accès ajoutée. À la prochaine connexion, utilise Face ID / clé d’accès. Authenticator reste demandé si nécessaire.';}catch{$('passkey-status').textContent='Création annulée ou indisponible. Ton accès habituel reste utilisable.';}finally{button.disabled=false;}};
$('login').addEventListener('submit',e=>{e.preventDefault();run(e.submitter,async()=>{status('Connexion…');const password=$('password').value;$('password').value='';const {error}=await api.auth.signInWithPassword({email:$('email').value.trim(),password});if(error)throw new Error('Connexion refusée. Vérifie tes identifiants et la confirmation de ton e-mail.');await challenge();});});
$('mfa').addEventListener('submit',e=>{e.preventDefault();run(e.submitter,async()=>{const code=$('code').value;$('code').value='';const {error}=await api.auth.mfa.challengeAndVerify({factorId:factor,code});if(error)throw new Error('Code refusé ou expiré. Utilise le nouveau code Authenticator.');if(recovering){$('mfa').hidden=true;$('back').hidden=true;$('welcome-title').textContent='Nouveau mot de passe';$('welcome-help').textContent='Choisis ton nouveau mot de passe. Ton Authenticator ne change pas.';$('welcome-submit').textContent='Enregistrer et ouvrir';$('welcome').hidden=false;status('');$('new-password').focus();return;}await openOnline();});});
$('back').onclick=()=>run($('back'),async()=>{resumeAllowed=false;$('welcome').hidden=true;await api.auth.signOut({scope:'local'});reset();status('');});
$('lock').onclick=()=>{hideTrip();if(offline){reset();$('offline-form').hidden=false;status('Copie verrouillée.');}else run($('lock'),()=>challenge(true));};
$('logout').onclick=()=>run($('logout'),async()=>{resumeAllowed=false;hideTrip();await api.auth.signOut({scope:'local'});reset();status('Déconnecté. La copie hors ligne, si préparée, reste chiffrée sur cet appareil.');});
$('prepare').onclick=()=>{$('toolbar').close();$('offline-save').hidden=false;$('trip').inert=true;$('save-status').textContent='';$('save-phrase').focus();};
const privateLinks={invite:{fn:'invite-jade',title:'Invitation personnelle',help:'Transmets ce lien uniquement à Jade, en privé. Il remplace la vérification par e-mail et permet d’activer son compte. Usage unique ; validité limitée.'},'reset-jade':{fn:'reset-jade',title:'Nouveau mot de passe pour Jade',help:'Transmets ce lien uniquement à Jade, en privé. Il lui demande son code Authenticator, puis un nouveau mot de passe. Usage unique ; validité limitée.'}};
for(const [id,link] of Object.entries(privateLinks))$(id).onclick=()=>run($(id),async()=>{ $('toolbar').close();$('invite-title').textContent=link.title;$('invite-help').textContent=link.help;$('invite-panel').hidden=false;$('invite-link').value='';$('copy-invite').hidden=true;$('invite-status').textContent='Préparation du lien…';try{const r=await fetch(CONFIG.url+'/functions/v1/'+link.fn,{method:'POST',headers:await headers(),cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'Lien indisponible.');$('invite-link').value=data.url;$('copy-invite').hidden=false;$('invite-status').textContent='Lien prêt. Copie-le pour le transmettre directement à Jade.';}catch(e){$('invite-status').textContent=e.message;} });
$('copy-invite').onclick=()=>run($('copy-invite'),async()=>{await navigator.clipboard.writeText($('invite-link').value);$('invite-status').textContent='Lien copié. À transmettre uniquement à Jade.';});
$('close-invite').onclick=()=>{$('invite-link').value='';$('invite-panel').hidden=true;};
$('welcome').addEventListener('submit',e=>{e.preventDefault();run(e.submitter,async()=>{const password=$('new-password').value;const confirmation=$('confirm-password').value;$('new-password').value='';$('confirm-password').value='';if(password!==confirmation)throw new Error('Les mots de passe ne correspondent pas.');const {error}=await api.auth.updateUser({password});if(error)throw new Error('Mot de passe refusé : utilise au moins 14 caractères, différent de l’ancien.');const changed=recovering;recovering=false;$('welcome').hidden=true;await challenge();if(changed)status('Mot de passe changé. Si tu avais préparé une copie hors ligne, prépare-la à nouveau.');});});
$('save-cancel').onclick=()=>{$('offline-save').hidden=true;$('trip').inert=false;$('save-phrase').value='';$('toolbar').showModal();};
$('save-form').addEventListener('submit',async e=>{e.preventDefault();e.submitter.disabled=true;try{
 const phrase=$('save-phrase').value;$('save-phrase').value='';$('save-status').textContent='Préparation des données et documents…';
 const vault=$('trip').contentWindow.VoyageVault;if(!vault)throw new Error('Le coffre n’est pas disponible.');
 const {data:identity,error:identityError}=await api.auth.getUser();if(identityError||!identity.user?.email)throw new Error('Reconnecte-toi avant de préparer le hors-ligne.');
 const verifier=window.supabase.createClient(CONFIG.url,CONFIG.key,{auth:{storageKey:'voyage-password-check',persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 try{const {data:checked,error}=await verifier.auth.signInWithPassword({email:identity.user.email,password:phrase});if(error||checked.user?.id!==identity.user.id)throw new Error('Mot de passe de connexion incorrect.');}finally{await verifier.auth.signOut({scope:'local'});}
 await vault.unlock();await deadline(vault.sync(),45000);
 // Refresh required data explicitly; a successful vault sync alone can mask failures.
 for(const path of ['/rest/v1/chine_plan?id=eq.principal&select=etat,maj_le','/rest/v1/chine_finances?id=eq.principal&select=etat,maj_le','/rest/v1/chine_todo?select=*&order=ordre.asc,cree_le.asc']){
  const response=await deadline(secureFetch(CONFIG.url+path));if(!response.ok)throw new Error('Copie incomplète : certaines données n’ont pas pu être chargées. Réessaie.');
 }
 const docsResponse=await deadline(secureFetch(CONFIG.url+'/rest/v1/chine_coffre?select=*'),60000);
 if(!docsResponse.ok)throw new Error('Les documents n’ont pas pu être téléchargés. Réessaie.');
 const documents=await docsResponse.json();
 if(!Array.isArray(documents)||documents.some(d=>!d.id||!d.iv_m||!d.meta_c||!d.iv_d||!d.data_c))throw new Error('La copie des documents est incomplète.');
 if(!navigator.serviceWorker)throw new Error('Le hors-ligne nécessite Safari ou un navigateur compatible.');
 await deadline(navigator.serviceWorker.ready);
 await Promise.all(['vendor/pdfjs/pdf.min.mjs','vendor/pdfjs/pdf.worker.min.mjs'].map(async path=>{const response=await fetch(new URL(path,location.href));if(!response.ok)throw new Error('Le lecteur PDF n’a pas pu être préparé hors ligne. Réessaie avec du réseau.');await response.arrayBuffer();}));
 const assets={};
 for(const name of ['mobile-app.css','mobile-app.js','vendor/leaflet.css','vendor/leaflet.js']){const asset=await deadline(fetch(new URL(name,location.href)));if(!asset.ok)throw new Error('Interface hors ligne incomplète. Réessaie.');assets[name]=await asset.text();}
 for(const name of ['oogway.png','huahua-sticker.png']){const asset=await deadline(fetch(new URL(name,location.href)));if(asset.ok){const bytes=new Uint8Array(await asset.arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));assets[name]='data:image/png;base64,'+btoa(text);}}
 const savedAt=new Date().toISOString();const record=await seal({html,values,responses,documents,assets,vaultKey,savedAt},phrase);
 await db('readwrite',s=>s.put(record,'snapshot'));
 await navigator.storage?.persist?.().catch(()=>false);$('save-status').textContent='Copie prête : '+documents.length+' document'+(documents.length===1?'':'s')+'. Ouverture sans Authenticator, avec ce mot de passe. Teste-la en mode avion.';$('offline-open').hidden=false;$('test-offline').hidden=false;
}catch(e){$('save-status').textContent=e.message==='Phrase incorrecte'?'Phrase du coffre incorrecte.':e.message;}finally{e.submitter.disabled=false;}});
$('offline-open').onclick=showOfflineForm;
$('test-offline').onclick=()=>{hideTrip();$('trip').inert=false;showOfflineForm();};
$('offline-form').addEventListener('submit',e=>{e.preventDefault();run(e.submitter,async()=>{const phrase=$('offline-phrase').value;$('offline-phrase').value='';let data;try{data=await unseal(await db('readonly',s=>s.get('snapshot')),phrase);}catch{throw new Error('Phrase incorrecte ou copie endommagée.');}if(typeof data.vaultKey!=='string')throw new Error('Prépare une nouvelle copie depuis la connexion en ligne.');bootAttempt++;vaultKey=data.vaultKey;offlineDocuments=Array.isArray(data.documents)?data.documents:null;offlineSavedAt=data.savedAt||null;offlineAssets=data.assets||{};html=data.html;values=Object.assign(Object.create(null),data.values);responses=Object.assign(Object.create(null),data.responses);offline=true;display();});});
// Resume outside the SDK auth callback: it runs while the auth lock is held.
async function resumeSession(){
 if(booting||resuming||opening||offline||!resumeAllowed||!$('trip').hidden||!$('welcome').hidden||!$('mfa').hidden)return;
 resuming=true;
 try{
  const {data,error}=await api.auth.getSession();if(error)throw error;
  if(!data.session){$('resume-session').hidden=true;$('login').hidden=false;return;}
  $('login').hidden=true;$('resume-session').hidden=true;status('Reprise de ta connexion…');
  await challenge();
 }catch{ $('back').hidden=false;$('login').hidden=true;$('resume-session').hidden=false;status('Ta connexion est mémorisée. Impossible de rouvrir le voyage pour le moment. Réessaie avec du réseau.'); }
 finally{resuming=false;}
}
$('resume-session').onclick=()=>resumeSession();
api.auth.onAuthStateChange(event=>{
 if(event==='SIGNED_OUT'&&!offline){resumeAllowed=false;hideTrip();reset();$('resume-session').hidden=true;status('Session terminée.');}
 if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')setTimeout(()=>{void resumeSession();},0);
});
window.addEventListener('online',()=>{void resumeSession();});
window.addEventListener('pageshow',()=>{void resumeSession();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void resumeSession();});
setInterval(async()=>{if(offline||$('trip').hidden)return;const attempt=bootAttempt;try{await authorized();}catch{if(offline||attempt!==bootAttempt)return;hideTrip();reset();$('login').hidden=true;$('resume-session').hidden=false;status('Vérification de l’accès interrompue. Réessaie pour reprendre ta connexion, ou ouvre ta copie hors ligne.');}},60000);
window.addEventListener('offline',()=>{if(!$('trip').hidden&&!offline)$('mode').textContent='Réseau perdu · modifications non garanties';});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./offline-sw.js').catch(()=>{});
try{const params=new URLSearchParams(location.hash.slice(1)),invitation=params.get('invitation'),recovery=params.get('reinitialisation');if(recovery){history.replaceState(null,'',location.pathname);const {error}=await api.auth.verifyOtp({token_hash:recovery,type:'recovery'});if(error)await keepSession('Lien expiré ou déjà utilisé. Demande à Hugo un nouveau lien.');else{recovering=true;await challenge();if(recovering&&!$('mfa').hidden)status('Lien reconnu. Confirme avec Authenticator.');}}else if(invitation){history.replaceState(null,'',location.pathname);const {error}=await api.auth.verifyOtp({token_hash:invitation,type:'invite'});if(error)await keepSession('Invitation expirée ou déjà utilisée. Demande à Hugo un nouveau lien.');else{$('login').hidden=true;$('welcome').hidden=false;status('Ton invitation est reconnue. Choisis ton mot de passe.');}}else{db('readonly',s=>s.get('snapshot')).then(copy=>{$('offline-open').hidden=!copy;}).catch(()=>{});const {data,error}=await api.auth.getSession();if(error)throw error;if(data.session){$('login').hidden=true;if(resumeAllowed)await deadline(challenge());}else status('Connecte-toi pour préparer votre voyage.');}}catch(e){status(navigator.onLine?e.message:'Pas de réseau. Ouvre une copie hors ligne préparée sur cet appareil.');}finally{booting=false;if($('login').hidden&&$('trip').hidden&&$('mfa').hidden&&$('welcome').hidden)$('resume-session').hidden=false;$('boot').hidden=true;if($('trip').hidden)$('gate').hidden=false;}

$('toolbar').addEventListener('click',e=>{if(['lock','logout'].includes(e.target.closest('button')?.id))$('toolbar').close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('offline-save').hidden)$('save-cancel').click();else $('toolbar').close();}});

$('close-options').onclick=()=>{$('toolbar').close();};
$('toolbar').addEventListener('click',e=>{if(e.target===$('toolbar'))$('toolbar').close();});

initNotifications({api,CONFIG,isOffline:()=>offline});
