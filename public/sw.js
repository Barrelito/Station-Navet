
self.addEventListener('push', function (event) {
    if (!event.data) {
        console.log('Push event but no data');
        return;
    }

    try {
        const data = event.data.json();
        const options = {
            body: data.message,
            icon: '/icon-192x192.png', // Justera sökväg vid behov
            badge: '/icon-72x72.png',
            data: {
                url: data.link || '/',
                relatedId: data.relatedId
            },
            // Android vibration pattern
            vibrate: [100, 50, 100],
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    } catch (err) {
        console.error('Error handling push event:', err);
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Om fönstret redan är öppet, fokusera på det
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // Annars öppna nytt
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
