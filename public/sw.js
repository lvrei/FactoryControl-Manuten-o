// FACTORY CONTROL - SERVICE WORKER v4.0
// Versão estável e limpa do Service Worker

const CACHE_NAME = 'factory-control-v4.0';
const STATIC_CACHE_NAME = 'factory-control-static-v4.0';

// Recursos críticos para cache offline
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/login'
];

// Recursos que devem ser atualizados sempre
const NETWORK_FIRST = [
  '/api/',
  '/auth/'
];

// Log simplificado para debug
const log = (message, data = '') => {
  console.log(`[SW v4.0] ${message}`, data);
};

// Install Event - Cache recursos estáticos
self.addEventListener('install', (event) => {
  log('Installing Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        log('Static assets cached successfully');
        // Ativar imediatamente o novo SW
        return self.skipWaiting();
      })
      .catch((error) => {
        log('Error caching static assets:', error);
      })
  );
});

// Activate Event - Limpar caches antigos
self.addEventListener('activate', (event) => {
  log('Activating Service Worker');
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Assumir controle de todas as abas
      self.clients.claim()
    ])
    .then(() => {
      log('Service Worker activated successfully');
    })
    .catch((error) => {
      log('Error during activation:', error);
    })
  );
});

// Fetch Event - Estratégias de cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET e extensões do navegador
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Estratégia Network First para APIs
  if (NETWORK_FIRST.some(pattern => url.pathname.startsWith(pattern))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Estratégia Cache First para recursos estáticos
  if (STATIC_ASSETS.includes(url.pathname) || 
      url.pathname.includes('.css') || 
      url.pathname.includes('.js') ||
      url.pathname.includes('.png') ||
      url.pathname.includes('.jpg') ||
      url.pathname.includes('.ico')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Estratégia Stale While Revalidate para páginas
  event.respondWith(staleWhileRevalidate(request));
});

// Estratégia Cache First
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    log('Cache First error:', error);
    // Retornar página offline se disponível
    if (request.destination === 'document') {
      return caches.match('/');
    }
    throw error;
  }
}

// Estratégia Network First
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache apenas respostas bem-sucedidas
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    log('Network First fallback to cache for:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Se for uma requisição de documento, retornar página principal
    if (request.destination === 'document') {
      return caches.match('/');
    }
    
    throw error;
  }
}

// Estratégia Stale While Revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Buscar versão atualizada em background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  // Retornar cache imediatamente se disponível, senão aguardar network
  return cachedResponse || fetchPromise;
}

// Message Event - Comunicação com a aplicação
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      log('Received SKIP_WAITING message');
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;

    case 'CLEAR_CACHE':
      log('Clearing all caches');
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;

    default:
      log('Unknown message type:', type);
  }
});

// Background Sync (para funcionalidades futuras)
self.addEventListener('sync', (event) => {
  log('Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    // Implementar sincronização de dados offline
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    log('Performing background sync');
    // Aqui seria implementada a sincronização de dados offline
    // Por exemplo, enviar dados salvos localmente quando a rede voltar
  } catch (error) {
    log('Background sync error:', error);
  }
}

// Error handler global
self.addEventListener('error', (event) => {
  log('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  log('Unhandled promise rejection:', event.reason);
});

// Notificações (para funcionalidades futuras)
self.addEventListener('notificationclick', (event) => {
  log('Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  // Abrir/focar a aplicação
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

log('Service Worker script loaded successfully');
