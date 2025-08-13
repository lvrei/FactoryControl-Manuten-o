// Service Worker básico para teste
console.log('🚀 Service Worker carregado!');

const CACHE_NAME = 'factorycontrol-test-v1';

// Install event
self.addEventListener('install', event => {
  console.log('✅ Service Worker installing...');
  self.skipWaiting();
});

// Activate event  
self.addEventListener('activate', event => {
  console.log('🎯 Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Fetch event
self.addEventListener('fetch', event => {
  // Apenas log, sem cache por agora
  console.log('�� Fetch:', event.request.url);
});

console.log('🔧 Service Worker básico pronto!');
