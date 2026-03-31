const CACHE_NAME = 'jtp-portfolio-v2';
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 설치: 정적 자산 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // 아이콘 없어도 설치 계속
        return cache.add('./index.html');
      });
    })
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 패치: GAS API는 항상 네트워크 우선, 정적 파일은 캐시 우선
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // GAS API 요청 → 항상 네트워크 (캐시 X)
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ status: 'error', message: '오프라인 상태입니다' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 정적 파일 → 캐시 우선, 없으면 네트워크
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // 성공 응답이면 캐시에 저장
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
