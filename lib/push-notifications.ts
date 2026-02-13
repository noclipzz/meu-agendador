"use client";

const VAPID_PUBLIC_KEY = "BFWkYyZs30s3mcN-A777dG1uv9Zjgs7n7DFHDqezCUkhRDrliHNbUkRyBw5_her_sV5QGtUCxKV9LcaNALxo9R0";

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

        // Verifica se já existe uma inscrição
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
            // Opcional: atualizar no servidor
            await saveSubscriptionToServer(existingSubscription);
            return;
        }

        // Solicita permissão
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission denied');
            return;
        }

        // Cria nova inscrição
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

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
