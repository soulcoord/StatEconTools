const CACHE_NAME = 'zh-converter-cache-v1';
const urlsToCache = [
    '/',
    '/chines.html',
    'https://cdn.jsdelivr.net/npm/moedict-data-zhuyin@latest/dict-revised.json',
    'https://cdn.jsdelivr.net/npm/moedict-data-pinyin@latest/dict-revised.json',
    'https://cdn.jsdelivr.net/npm/moedict-data-twblg@latest/dict-revised.json',
    'https://cdnjs.cloudflare.com/ajax/libs/jieba-zh-tw/0.0.7/jieba.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
