// @ts-nocheck

self.addEventListener("push", (event: any) => {
    const data = event.data?.json();
    const title = data?.title || "Nova Notificação";
    const options = {
        body: data?.body || "Você tem uma nova mensagem do sistema.",
        icon: "/LOGOAPP.png",
        badge: "/LOGOAPP.png",
        data: {
            url: data?.url || "/painel",
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: any) => {
    event.notification.close();
    event.waitUntil(
        self.clients.openWindow(event.notification.data?.url || "/painel")
    );
});
