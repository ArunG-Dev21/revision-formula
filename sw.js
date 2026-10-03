/* Revision Formula service worker: offline cache + background daily check */
const CACHE = 'rf-v3';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'maskable-512.png',
  'badge-96.png', 'apple-touch-icon.png'
];

self.addEventListener('install', e => {
  // 'reload' skips the HTTP cache so a new version never precaches a stale file.
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('rf-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first, refresh in the background. Works fully offline after the first visit.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;
  const key = req.mode === 'navigate' ? 'index.html' : req;
  e.respondWith(caches.open(CACHE).then(async cache => {
    // ignoreVary: the font stylesheet is cached from a fetch() but later requested by a <link>, with different headers.
    const hit = await cache.match(key, { ignoreSearch: req.mode === 'navigate', ignoreVary: true });
    const net = fetch(req).then(res => {
      if (res && !res.redirected && (res.ok || res.type === 'opaque')) cache.put(key, res.clone()).catch(() => {});
      return res;
    });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net.catch(() => Response.error());
  }));
});

/* ---- tiny IndexedDB access (same DB as the page) ---- */
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('revision-formula', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function get(k) { const d = await db(); return new Promise((res, rej) => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
async function set(k, v) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }

const pad = n => String(n).padStart(2, '0');
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function dailyCheck() {
  const st = await get('state');
  if (!st || !st.settings || !st.settings.notify || !Array.isArray(st.topics)) return;
  const now = new Date(), td = fmt(now);
  const due = st.topics
    .map(t => ({ t, r: (t.reviews || []).find(r => !r.done) }))
    .filter(x => x.r && x.r.due <= td);
  try { if (self.navigator.setAppBadge) (due.length ? self.navigator.setAppBadge(due.length) : self.navigator.clearAppBadge()).catch(() => {}); } catch (e) {}
  if (!due.length) return;
  if ((await get('lastNotified')) === td) return;
  const [h, m] = String(st.settings.reminderTime || '07:00').split(':').map(Number);
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
  const lines = due.slice(0, 4).map(({ t, r }) =>
    `• ${t.subject ? t.subject + ' – ' : ''}${t.title}${t.notes ? ' (' + t.notes + ')' : ''} · Day ${r.day}`);
  if (due.length > 4) lines.push(`+${due.length - 4} more`);
  await self.registration.showNotification(`${due.length} revision${due.length > 1 ? 's' : ''} due today`, {
    body: lines.join('\n'), icon: 'icon-192.png', badge: 'badge-96.png',
    tag: 'revise-daily', renotify: true, data: { url: './' }
  });
  await set('lastNotified', td);
}

self.addEventListener('periodicsync', e => {
  if (e.tag === 'revise-check') e.waitUntil(dailyCheck().catch(() => {}));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
