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

        // 1. Verifica se já existe uma inscrição
        let subscription = await registration.pushManager.getSubscription();

        // 2. Se existir, vamos verificar se ela usa a chave CERTA ou se está "vencida"
        if (subscription) {
            const currentKey = subscription.options.applicationServerKey;
            // Se a chave mudou ou precisamos forçar renovação, cancelamos a antiga
            if (currentKey) {
                const newKeyArray = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
                // Comparação simples (checamos se os primeiros bytes batem)
                const currentKeyArray = new Uint8Array(currentKey);

                // Converto o buffer binário para string Base64 para poder comparar corretamente (ignora o padding do meio)
                const currentKeyBase64 = btoa(String.fromCharCode(...currentKeyArray)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                const newKeyBase64 = VAPID_PUBLIC_KEY.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

                if (currentKeyBase64 !== newKeyBase64) {
                    console.warn("⚠️ Chave VAPID mudou! Renovando assinatura...");
                    await subscription.unsubscribe();
                    subscription = null; // Força recriar
                }
            }
        }

        if (!subscription) {
            // Solicita permissão se ainda não tiver
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Permissão negada');
            }

            // Cria nova inscrição com a chave NOVA
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
