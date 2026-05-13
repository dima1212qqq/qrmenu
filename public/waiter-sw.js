importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Уведомление';
  const notificationBody = payload.notification?.body || 'Новое уведомление';
  const notificationIcon = '/icons/waiter-icon-192.png';
  const notificationBadge = '/icons/badge-icon.png';
  const notificationTag = payload.data?.type || 'default';

  const options = {
    body: notificationBody,
    icon: notificationIcon,
    badge: notificationBadge,
    tag: notificationTag,
    data: payload.data,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: getActionsFromPayload(payload.data?.type),
  };

  return self.registration.showNotification(notificationTitle, options);
});

function getActionsFromPayload(type) {
  switch (type) {
    case 'call':
      return [
        { action: 'accept', title: '✓ Принять' },
        { action: 'dismiss', title: '✕ Отклонить' },
      ];
    case 'order':
      return [
        { action: 'view', title: '👁 Посмотреть' },
        { action: 'complete', title: '✓ Выполнено' },
      ];
    default:
      return [
        { action: 'open', title: 'Открыть' },
      ];
  }
}

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'dismiss') {
    return;
  }

  const urlToOpen = getUrlFromAction(action, data);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/waiter') && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            action,
            data,
          });
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

function getUrlFromAction(action, data) {
  const baseUrl = '/waiter';

  switch (action) {
    case 'accept':
    case 'view':
    case 'open':
      return baseUrl;
    case 'complete':
      return `${baseUrl}?order=${data?.orderId || ''}`;
    default:
      return baseUrl;
  }
}

self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  console.log('Message received in service worker:', event);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});