"use client";

const VAPID_PUBLIC_KEY = "BCp3sW6dUPm0bD6jsj4uwpmpl50ddKvbrCta9LuVW79jXed3WuQWjgNaat_P5taLlU3t-SEM4PLnfaTlAGKxfk0";

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

        // 1. BUSCA A CHAVE PÚBLICA DIRETO DO SERVIDOR
        const keyResponse = await fetch('/api/notifications/public-key');
        const { publicKey } = await keyResponse.json();

        if (!publicKey) throw new Error("Servidor não enviou chave pública.");

        console.log("🛠️ Tentando resetar assinatura antiga...");

        // 2. FORÇAMOS O NAVEGADOR A ESQUECER QUALQUER ASSINATURA VELHA
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
            console.log("♻️ Desinscrevendo assinatura prévia...");
            await existingSub.unsubscribe();
        }

        // 3. PEDIMOS PERMISSÃO (Caso não tenha)
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') throw new Error('Permissão negada pelo navegador');

        // 4. CRIAMOS UMA ASSINATURA DO ZERO COM A CHAVE NOVA
        console.log(`🆕 Criando nova assinatura com a chave: ${publicKey.substring(0, 10)}...`);
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await saveSubscriptionToServer(subscription);
        console.log('✅ Inscrição concluída com sucesso!');
    } catch (error) {
        console.error('❌ Erro detalhado na inscrição:', error);
        throw error; // RE-LANÇA O ERRO para o Dashboard capturar
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
