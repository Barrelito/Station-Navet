

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
        console.log('Push not supported');
        return false;
    }

    try {
        // 1. Registrera SW
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered:', registration);

        // 2. Vänta tills SW är redo
        await navigator.serviceWorker.ready;

        // 3. Prenumerera
        if (!PUBLIC_VAPID_KEY) {
            console.error("Missing VAPID public key");
            return false;
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });

        console.log('Push subscription:', subscription);

        // 4. Spara i db
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
        console.error('Failed to subscribe to push:', error);
        return false;
    }
}
