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
        await registration.update();

        // BUSCA A CHAVE PÚBLICA DIRETO DO SERVIDOR (Corta o cache)
        const keyResponse = await fetch('/api/notifications/public-key');
        const { publicKey } = await keyResponse.json();

        if (!publicKey) {
            throw new Error("Não foi possível obter a chave pública do servidor.");
        }

        // 1. Verifica se já existe uma inscrição
        let subscription = await registration.pushManager.getSubscription();

        // 2. Se existir, verifica se a chave bate
        if (subscription) {
            const currentKey = subscription.options.applicationServerKey;

            if (currentKey) {
                // Converto o buffer binário para string Base64
                const currentKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(currentKey)))
                    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

                const serverKeyBase64 = publicKey
                    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

                if (currentKeyBase64 !== serverKeyBase64) {
                    console.warn(`⚠️ Chave VAPID mudou!\nAtual: ${currentKeyBase64}\nNova: ${serverKeyBase64}\nRenovando...`);
                    await subscription.unsubscribe();
                    subscription = null;
                }
            }
        }

        if (!subscription) {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Permissão negada');
            }

            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
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
