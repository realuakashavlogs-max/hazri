const localStore = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => (localStore.has(k) ? localStore.get(k)! : null),
    setItem: (k: string, v: string) => { localStore.set(k, String(v)); },
    removeItem: (k: string) => { localStore.delete(k); },
    clear: () => { localStore.clear(); },
  },
});

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    location: { origin: 'https://hazri.suffah.workers.dev', pathname: '/', href: 'https://hazri.suffah.workers.dev/', search: '', hash: '' },
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: globalThis.localStorage,
    atob: globalThis.atob,
    btoa: globalThis.btoa,
    URL: globalThis.URL,
  },
});

(globalThis as any).__mockOnline = true;
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    get onLine() {
      return (globalThis as any).__mockOnline;
    },
  },
});

(globalThis as any).__downloadedBlobs = [] as { content: string; filename: string; size: number }[];
const RealBlob = globalThis.Blob;
const realCreateObjectURL = globalThis.URL.createObjectURL.bind(globalThis.URL);
const realRevokeObjectURL = globalThis.URL.revokeObjectURL.bind(globalThis.URL);
globalThis.URL.createObjectURL = (blob: any) => {
  const url = realCreateObjectURL(blob);
  (globalThis as any).__downloadedBlobs.push({
    content: (blob as any).__rawText || '',
    filename: '',
    size: blob.size || 0,
  });
  return url;
};
globalThis.URL.revokeObjectURL = (u: string) => realRevokeObjectURL(u);
(globalThis as any).Blob = class SpiedBlob extends RealBlob {
  __rawText: string;
  constructor(parts: any[], opts?: any) {
    super(parts, opts);
    this.__rawText = parts.map((p) => (typeof p === 'string' ? p : '')).join('');
  }
};

(globalThis as any).MouseEvent = class MockMouseEvent { type: string; constructor(t: string) { this.type = t; } };
(globalThis as any).open = () => ({ document: { write: () => {}, close: () => {}, body: { appendChild: () => {} } }, close: () => {} });
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    documentElement: {
      style: { setProperty: () => {} },
      classList: { add: () => {}, remove: () => {} },
      dir: 'ltr',
      lang: 'en',
    },
    querySelector: () => null,
    createElementNS: (_ns: string, tag: string) => (globalThis as any).document.createElement(tag),
    createElement: (tag: string) => ({
      tagName: tag,
      href: '',
      download: '',
      style: {},
      setAttribute: () => {},
      dispatchEvent: () => true,
      click() {
        const blobs = (globalThis as any).__downloadedBlobs;
        if (blobs.length > 0 && this.download) {
          blobs[blobs.length - 1].filename = this.download;
        }
      },
    }),
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
  },
});

class MockEventTarget {
  private listeners = new Map<string, Set<Function>>();
  addEventListener(type: string, cb: Function) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
  }
  removeEventListener(type: string, cb: Function) {
    this.listeners.get(type)?.delete(cb);
  }
  dispatch(type: string, ev: any = {}) {
    const prop = (this as any)[`on${type}`];
    if (typeof prop === 'function') prop(ev);
    for (const cb of this.listeners.get(type) || []) cb(ev);
  }
}

class MockIDBRequest extends MockEventTarget {
  result: any = undefined;
  error: any = null;
}
class MockIDBOpenDBRequest extends MockIDBRequest {}
class MockIDBObjectStore extends MockEventTarget {
  private store: Map<string, any>;
  constructor(store: Map<string, any>) {
    super();
    this.store = store;
  }
  put(val: any) {
    return makeIDBRequest(() => { this.store.set(val.id, val); return val.id; });
  }
  delete(key: string) {
    return makeIDBRequest(() => { this.store.delete(key); return undefined; });
  }
  count() {
    return makeIDBRequest(() => this.store.size);
  }
  getAll() {
    return makeIDBRequest(() => Array.from(this.store.values()));
  }
}
class MockIDBTransaction extends MockEventTarget {
  private os: MockIDBObjectStore;
  objectStoreNames = Object.assign(['pending_attendance'], { contains: () => true });
  constructor(os: MockIDBObjectStore) {
    super();
    this.os = os;
    setTimeout(() => this.dispatch('complete', { target: this }), 0);
  }
  objectStore() { return this.os; }
}
class MockIDBDatabase extends MockEventTarget {
  objectStoreNames = Object.assign(['pending_attendance'], { contains: () => true });
  private os: MockIDBObjectStore;
  constructor(os: MockIDBObjectStore) {
    super();
    this.os = os;
  }
  createObjectStore() { return this.os; }
  transaction() { return new MockIDBTransaction(this.os); }
}

(globalThis as any).IDBRequest = MockIDBRequest;
(globalThis as any).IDBOpenDBRequest = MockIDBOpenDBRequest;
(globalThis as any).IDBTransaction = MockIDBTransaction;
(globalThis as any).IDBDatabase = MockIDBDatabase;
(globalThis as any).IDBObjectStore = MockIDBObjectStore;
(globalThis as any).IDBIndex = class {};
(globalThis as any).IDBCursor = class {};

const idbStore = new Map<string, any>();
const mockOS = new MockIDBObjectStore(idbStore);
const mockDb = new MockIDBDatabase(mockOS);

function makeIDBRequest<T>(resultFn: () => T) {
  const req = new MockIDBRequest();
  queueMicrotask(() => {
    try {
      req.result = resultFn();
      req.dispatch('success', { target: req });
    } catch (e) {
      req.error = e;
      req.dispatch('error', { target: req });
    }
  });
  return req;
}

(globalThis as any).indexedDB = {
  open: () => {
    const req = new MockIDBOpenDBRequest();
    queueMicrotask(() => {
      req.result = mockDb;
      req.dispatch('success', { target: req });
    });
    return req;
  },
};
