self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(self.registration.showNotification(data.title || 'Meno', {
    body: data.body || 'New message',
    icon: '/icon.png',
    badge: '/icon.png',
    data: data.data || {}
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
