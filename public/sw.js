self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(self.registration.showNotification(data.title || 'Klasora', {
    body: data.body || 'New message',
    icon: '/klasora-logo.png',
    badge: '/klasora-logo.png',
    data: data.data || {}
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
