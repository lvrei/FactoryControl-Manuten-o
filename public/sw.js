const CACHE_NAME = 'factorycontrol-v1.2.0';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/client/App.tsx',
  '/client/global.css',
  // Adicionar mais recursos conforme necessário
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('🔧 ServiceWorker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Opened cache');
        return cache.addAll(urlsToCache.map(url => new Request(url, {
          mode: 'no-cors'
        })));
      })
      .catch(error => {
        console.error('❌ Cache install failed:', error);
      })
  );
  // Force activation immediately
  self.skipWaiting();
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', event => {
  console.log('🚀 ServiceWorker activating...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache when offline, update cache when online
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          console.log('📦 Serving from cache:', event.request.url);
          return response;
        }

        // Fetch from network
        return fetch(event.request)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return offline fallback for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/') || new Response('App offline', {
                status: 200,
                headers: { 'Content-Type': 'text/html' }
              });
            }
            return new Response('Resource offline', { status: 503 });
          });
      })
  );
});

// Background sync for maintenance data
self.addEventListener('sync', event => {
  console.log('🔄 Background sync triggered:', event.tag);
  if (event.tag === 'background-sync-maintenances') {
    event.waitUntil(syncMaintenances());
  }
});

async function syncMaintenances() {
  try {
    // Get pending maintenance data from localStorage
    const pendingData = localStorage.getItem('pending-maintenances');
    if (pendingData) {
      const data = JSON.parse(pendingData);
      console.log('📤 Syncing maintenance data:', data);
      
      // Here you would typically send to your backend
      // For now, just simulate successful sync
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      localStorage.removeItem('pending-maintenances');
      console.log('✅ Maintenance data synced successfully');
    }
  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error; // This will trigger a retry
  }
}

// Push notification event
self.addEventListener('push', event => {
  console.log('📱 Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Nova manutenção agendada',
    icon: 'https://via.placeholder.com/192x192/2563eb/ffffff?text=FC',
    badge: 'https://via.placeholder.com/72x72/2563eb/ffffff?text=!',
    vibrate: [200, 100, 200],
    tag: 'maintenance-notification',
    requireInteraction: true,
    data: {
      url: '/?tab=maintenance',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: 'Ver Detalhes',
        icon: 'https://via.placeholder.com/32x32/2563eb/ffffff?text=👁'
      },
      {
        action: 'dismiss',
        title: 'Dispensar',
        icon: 'https://via.placeholder.com/32x32/dc2626/ffffff?text=✖'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('FactoryControl 🏭', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url === self.location.origin && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window/tab
        if (clients.openWindow) {
          return clients.openWindow('/?tab=maintenance&source=notification');
        }
      })
    );
  }
});

// Handle updates and prompt user
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⚡ Forcing update activation');
    self.skipWaiting();
  }
});

// Log when service worker is ready
console.log('🚀 FactoryControl Service Worker loaded successfully');

// Enhanced error handling
self.addEventListener('error', event => {
  console.error('💥 ServiceWorker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('💥 ServiceWorker unhandled rejection:', event.reason);
});
