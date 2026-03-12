(function () {
  function isManagedKey(key) {
    return String(key || '').toLowerCase().indexOf('playtrix') === 0;
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function seedJson(key, value) {
    if (localStorage.getItem(key) === null) {
      writeJson(key, value);
      return value;
    }
    return readJson(key, value);
  }

  function readText(key, fallback) {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  }

  function writeText(key, value) {
    localStorage.setItem(key, String(value));
    return value;
  }

  function remove(key) {
    localStorage.removeItem(key);
  }

  function bumpCounterMap(key, itemKey) {
    const state = readJson(key, {});
    state[itemKey] = (state[itemKey] || 0) + 1;
    writeJson(key, state);
    return state;
  }

  function listManagedKeys() {
    return Object.keys(localStorage).filter(isManagedKey).sort();
  }

  function createSnapshot() {
    const keys = {};
    listManagedKeys().forEach(function (key) {
      keys[key] = localStorage.getItem(key);
    });
    return {
      app: 'Waylight-Playtrix',
      version: 1,
      createdAt: new Date().toISOString(),
      keys: keys
    };
  }

  function clearManagedKeys() {
    listManagedKeys().forEach(function (key) {
      localStorage.removeItem(key);
    });
  }

  function applySnapshot(snapshot, options) {
    if (!snapshot || typeof snapshot !== 'object' || !snapshot.keys || typeof snapshot.keys !== 'object') {
      throw new Error('Invalid Playtrix snapshot.');
    }

    if (options && options.replace) {
      clearManagedKeys();
    }

    let written = 0;
    Object.keys(snapshot.keys).forEach(function (key) {
      if (!isManagedKey(key)) return;
      const value = snapshot.keys[key];
      if (value === null || typeof value === 'undefined') {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, String(value));
      }
      written += 1;
    });
    return written;
  }

  window.PlaytrixStorage = {
    readJson: readJson,
    writeJson: writeJson,
    seedJson: seedJson,
    readText: readText,
    writeText: writeText,
    remove: remove,
    bumpCounterMap: bumpCounterMap,
    listManagedKeys: listManagedKeys,
    createSnapshot: createSnapshot,
    applySnapshot: applySnapshot,
    clearManagedKeys: clearManagedKeys
  };
})();
