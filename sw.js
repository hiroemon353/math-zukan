// 動く数学図鑑のサービスワーカー（公開用の PWA だけで使う）。
// 最初に開いたとき、起動に必要なファイルをすべて端末に保存し、以後は通信しないで起動する。
// 新しい版は「待機」させ、画面の「更新する」を押したときだけ切り替える（授業中に勝手に変わらないように）。
// 下の版の番号とファイルの一覧は scripts/公開用ファイルを作る.mjs が書き込む。
const VERSION = "2026-11-10-9a4e9f3ad2";
const CACHE = `math-zukan-${VERSION}`;
const FILES = ["./index.html","./manifest.webmanifest","./icons/apple-touch-icon.png","./icons/favicon-32.png","./icons/icon-192.png","./icons/icon-512.png"];

self.addEventListener('install', (e) => {
  // ブラウザの HTTP キャッシュを通さず、公開先から最新を取る
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('math-zukan-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data === 'version') e.source?.postMessage({ version: VERSION });
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // ページを開く（再読み込み・ホーム画面からの起動）は、保存した index.html を返す。#教材 や ?… が付いていても同じ
    if (req.mode === 'navigate') {
      const page = await cache.match('./index.html');
      if (page) return page;
      return fetch(req);
    }
    return (await cache.match(req, { ignoreSearch: true })) ?? fetch(req);
  })());
});
