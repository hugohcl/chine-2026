const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = a => btoa(Array.from(new Uint8Array(a), x => String.fromCharCode(x)).join(''));
const bytes = s => Uint8Array.from(atob(s), x => x.charCodeAt(0));
export async function derive(phrase, salt) {
  const material = await crypto.subtle.importKey('raw', enc.encode(phrase.normalize('NFC').trim()), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt:bytes(salt), iterations:600000, hash:'SHA-256'}, material, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
export async function seal(data, phrase) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(32)));
  const key = await derive(phrase, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:enc.encode('voyage-offline-v1')}, key, enc.encode(JSON.stringify(data)));
  return {version:1, salt, iv:b64(iv), body:b64(body)};
}
export async function unseal(record, phrase) {
  if(record?.version !== 1) throw new Error('Format de copie inconnu.');
  const key = await derive(phrase,record.salt);
  const data = await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(record.iv),additionalData:enc.encode('voyage-offline-v1')},key,bytes(record.body));
  return JSON.parse(dec.decode(data));
}
