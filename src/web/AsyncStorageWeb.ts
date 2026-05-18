const AsyncStorage = {
  getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key: string, value: string) => { localStorage.setItem(key, value); return Promise.resolve(); },
  removeItem: (key: string) => { localStorage.removeItem(key); return Promise.resolve(); },
  clear: () => { localStorage.clear(); return Promise.resolve(); },
  getAllKeys: () => Promise.resolve(Object.keys(localStorage)),
  multiGet: (keys: string[]) => Promise.resolve(keys.map(k => [k, localStorage.getItem(k)] as [string, string | null])),
  multiSet: (pairs: [string, string][]) => { pairs.forEach(([k, v]) => localStorage.setItem(k, v)); return Promise.resolve(); },
  multiRemove: (keys: string[]) => { keys.forEach(k => localStorage.removeItem(k)); return Promise.resolve(); },
};

export default AsyncStorage;
