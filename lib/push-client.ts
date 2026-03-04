
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
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error('Push saknar stöd: serviceWorker eller PushManager saknas');
        return false;
    }

    try {
        // 1. Registrera SW
        const registration = await navigator.serviceWorker.register('/sw.js');

        // 2. Vänta tills SW är redo
        await navigator.serviceWorker.ready;

        // 3. Begär tillåtelse
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            return false;
        }

        // 4. Prenumerera
        const vapidKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim();
        if (!vapidKey) {
            console.error("Saknar VAPID public key. Kontrollera NEXT_PUBLIC_VAPID_PUBLIC_KEY i .env.local");
            return false;
        }

        const applicationServerKey = urlBase64ToUint8Array(vapidKey);

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey
        });

        // 5. Spara i db
        const subJson = subscription.toJSON();
        await saveSubscriptionMutation({
            endpoint: subJson.endpoint!,
            keys: {
                p256dh: subJson.keys?.p256dh!,
                auth: subJson.keys?.auth!
            }
        });

        return true;
    } catch (error) {
        console.error('Misslyckades att prenumerera på push:', error);
        return false;
    }
}
