export function initNotifications({api,CONFIG,isOffline}) {
 const box=document.createElement('section');box.id='notifications';
 const style=document.createElement('style');style.textContent='#notifications{border-top:1px solid #c5d0c7;margin-top:8px;padding-top:16px}#notifications h3{font-size:16px;margin:0 0 10px}#notifications p{font-size:13px;line-height:1.55;margin:10px 0}#notifications .push-actions{display:flex;flex-direction:column;gap:8px}#notifications [hidden]{display:none}#push-status{font-weight:600}';document.head.append(style);
 box.innerHTML='<h3>Notifications</h3><p>Un rappel à 9 h à Paris avant le départ, puis à 9 h en Chine du 13 novembre au 8 décembre. Les tâches terminées sont exclues. Le contenu reste discret sur l’écran verrouillé.</p><p id="push-status" role="status" aria-live="polite"></p><div class="push-actions"><button id="push-enable" class="secondary">Activer sur cet appareil</button><button id="push-test" class="secondary" hidden>Envoyer un test</button><button id="push-disable" class="secondary" hidden>Désactiver sur cet appareil</button></div>';
 document.querySelector('#toolbar .account-actions').append(box);
 const $=id=>document.getElementById(id),supported='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
 let subscription=null;
 async function call(action,extra={}) {if(isOffline())throw Error('Reconnecte-toi au réseau pour gérer les rappels.');const {data}=await api.auth.getSession();if(!data.session)throw Error('Reconnecte-toi.');const r=await fetch(CONFIG.url+'/functions/v1/voyage-push',{method:'POST',headers:{apikey:CONFIG.key,Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action,...extra}),cache:'no-store'});const result=await r.json();if(!r.ok)throw Error(result.error||'Envoi impossible.');return result;}
 function display(active,text){$('push-status').textContent=text;$('push-enable').hidden=active;$('push-test').hidden=!active;$('push-disable').hidden=!active;}
 async function refresh(){if(ios&&!installed){$('push-enable').disabled=true;return display(false,'Sur iPhone, ouvre le voyage depuis son icône sur l’écran d’accueil. Ajoute-la depuis Safari → Partager → Sur l’écran d’accueil.');}if(!supported){$('push-enable').disabled=true;return display(false,'Les notifications ne sont pas disponibles dans ce navigateur.');}const reg=await navigator.serviceWorker.ready;subscription=await reg.pushManager.getSubscription();const state=subscription?await call('status',{endpoint:subscription.endpoint}):{active:false};display(state.active,state.active?'Rappels activés sur cet appareil. Teste la réception ci-dessous.':Notification.permission==='denied'?'Notifications refusées. Autorise-les dans les réglages de cet appareil, puis réessaie.':'Rappels non activés sur cet appareil.');}
 async function run(fn){const buttons=[...box.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{await fn();}catch(e){$('push-status').textContent=e.message;}finally{buttons.forEach(b=>b.disabled=false);}}
 $('push-enable').onclick=()=>run(async()=>{
  if(ios&&!installed)throw Error('Ouvre d’abord le voyage depuis son icône sur l’écran d’accueil.');
  if(await Notification.requestPermission()!=='granted')throw Error('Autorise les notifications dans les réglages de cet appareil.');
  const cfg=await call('config'),reg=await navigator.serviceWorker.ready;
  const bytes=Uint8Array.from(atob(cfg.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  subscription=await reg.pushManager.getSubscription();
  if(subscription){const old=subscription.options.applicationServerKey;if(old&&Array.from(new Uint8Array(old)).join()!==Array.from(bytes).join()){await subscription.unsubscribe();subscription=null;}}
  subscription=subscription||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
  await call('subscribe',{subscription:subscription.toJSON()});display(true,'Rappels activés. Utilise « Envoyer un test » pour vérifier la réception.');
 });
 $('push-test').onclick=()=>run(async()=>{await call('test',{endpoint:subscription.endpoint});$('push-status').textContent='Test accepté par le service push. Vérifie la notification sur cet appareil ; cela ne confirme pas encore sa réception.';});
 $('push-disable').onclick=()=>run(async()=>{await call('unsubscribe',{endpoint:subscription.endpoint});await subscription.unsubscribe();subscription=null;display(false,'Rappels désactivés sur cet appareil.');});
 $('toolbar').addEventListener('toggle',()=>{if($('toolbar').open)refresh().catch(e=>$('push-status').textContent=e.message);});
 new MutationObserver(()=>{if($('toolbar').open)refresh().catch(e=>$('push-status').textContent=e.message);}).observe($('toolbar'),{attributes:true,attributeFilter:['open']});
}
