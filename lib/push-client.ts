

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

if (!PUBLIC_VAPID_KEY) {
    console.error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable");
}

/**
 * Konverterar VAPID key till Uint8Array (krävs av webbläsaren)
 */
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Registrera Service Worker och prenumerera på push.
 */
export async function subscribeToPush(saveSubscriptionMutation: any) {
    console.log('Starting push subscription process...');

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error('Push missing support: serviceWorker or PushManager missing');
        return false;
    }

    try {
        // 1. Registrera SW
        console.log('Registering service worker...');
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered:', registration);

        // 2. Vänta tills SW är redo
        console.log('Waiting for SW ready...');
        await navigator.serviceWorker.ready;
        console.log('SW Ready');

        // 3. Begär tillåtelse (viktigt!)
        console.log('Requesting permission...');
        const permission = await Notification.requestPermission();
        console.log('Permission result:', permission);

        if (permission !== 'granted') {
            console.warn('Notification permission denied, got:', permission);
            return false;
        }

        // 4. Prenumerera
        const vapidKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim();
        if (!vapidKey) {
            console.error("Missing VAPID public key. Check NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local");
            return false;
        }

        console.log('Subscribing with VAPID key length:', vapidKey.length);
        const applicationServerKey = urlBase64ToUint8Array(vapidKey);
        console.log('Converted applicationServerKey length:', applicationServerKey.length);

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey
        });

        console.log('Push subscription success:', subscription);

        // 5. Spara i db
        const subJson = subscription.toJSON();
        console.log('Saving subscription to DB...');
        await saveSubscriptionMutation({
            endpoint: subJson.endpoint!,
            keys: {
                p256dh: subJson.keys?.p256dh!,
                auth: subJson.keys?.auth!
            }
        });

        console.log('Subscription saved to DB');
        return true;
    } catch (error) {
        console.error('Failed to subscribe to push:', error);
        return false;
    }
}
