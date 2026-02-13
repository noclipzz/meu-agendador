"use client";

const VAPID_PUBLIC_KEY = "BG6vrlAV2S7nXPuXMK_tZ2X5yvVb1FVPxoGKvgL65ab6t-CGIVxSyeQt6DgxL3d4-tF8G2yvJz_hO6a6Q6p6jU8";

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeUserToPush() {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push messaging is not supported');
            return;
        }

        const registration = await navigator.serviceWorker.ready;

        // Força atualização para garantir que o worker mais recente está ativo
        await registration.update();

        // Verifica se já existe uma inscrição
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Solicita permissão
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Permissão negada');
            }

            // Cria nova inscrição
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
        }

        await saveSubscriptionToServer(subscription);
        console.log('User is subscribed to Push Notifications');
    } catch (error) {
        console.error('Failed to subscribe user:', error);
    }
}

async function saveSubscriptionToServer(subscription: PushSubscription) {
    await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
    });
}
