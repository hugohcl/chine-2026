// Persist the SDK session even when WebKit cannot use localStorage.
// Only session tokens are saved here; passwords and Authenticator codes are not.
export function createSessionStorage() {
  async function transact(mode, action) {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('voyage-auth-storage-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('sessions');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Stockage de connexion bloqué. Ferme les autres fenêtres du voyage.'));
    });
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('sessions', mode);
      const request = action(transaction.objectStore('sessions'));
      transaction.oncomplete = () => { database.close(); resolve(request.result); };
      transaction.onabort = transaction.onerror = () => { database.close(); reject(transaction.error || request.error); };
    });
  }
  const local = {
    getItem: key => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: key => window.localStorage.removeItem(key),
  };
  return {
    async getItem(key) {
      try {
        const record = await transact('readonly', store => store.get(key));
        if (record !== undefined) return record; // null is a sign-out tombstone.
      } catch { return local.getItem(key); }
      let previous = null;
      try { previous = local.getItem(key); } catch { /* IndexedDB remains available. */ }
      if (previous !== null) await this.setItem(key, previous);
      return previous;
    },
    async setItem(key, value) {
      let durable = false;
      try { await transact('readwrite', store => store.put(value, key)); durable = true; } catch {}
      try { local.setItem(key, value); durable = true; } catch {}
      if (!durable) throw new Error('Impossible de mémoriser la connexion sur cet appareil. Vérifie les réglages de stockage du navigateur.');
    },
    async removeItem(key) {
      // Keep a tombstone so an old localStorage copy can never resurrect a session.
      let durable = false;
      try { await transact('readwrite', store => store.put(null, key)); durable = true; } catch {}
      try { local.removeItem(key); durable = true; } catch {}
      if (!durable) throw new Error('Impossible d’effacer la connexion sur cet appareil.');
    },
  };
}
