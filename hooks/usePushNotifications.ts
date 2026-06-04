import { useEffect } from 'react';
import { messaging } from '../firebase/config';
import { getToken, onMessage } from 'firebase/messaging';
import { saveFCMToken } from '../services/api';
import { User } from '../types';

export const usePushNotifications = (user: User | null) => {
    useEffect(() => {
        if (!user) return;

        const setupNotifications = async () => {
            try {
                const messagingInstance = await messaging();
                if (!messagingInstance) return;

                // Request permission
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // Encontra o Service Worker ativo para evitar dupla assinatura ou erro de arquivo 404
                    const registration = await navigator.serviceWorker.ready;
                    
                    // Get token
                    const token = await getToken(messagingInstance, {
                        vapidKey: (import.meta as any).env.VITE_VAPID_KEY,
                        serviceWorkerRegistration: registration
                    });

                    if (token) {
                        await saveFCMToken(user.id, token);
                        console.log('FCM Token saved');
                    }
                }

                // Handle foreground messages
                if (messagingInstance) {
                    onMessage(messagingInstance, async (payload) => {
                        console.log('Message received in foreground: ', payload);
                        
                        // Exibe a notificação no topo do celular (como Push do Sistema) mesmo com app aberto!
                        if (payload.notification && Notification.permission === 'granted') {
                            const registration = await navigator.serviceWorker.ready;
                            await registration.showNotification(payload.notification.title || 'Nova Notificação', {
                                body: payload.notification.body || '',
                                icon: 'map-icon.svg',
                                badge: 'map-icon.svg',
                                requireInteraction: true,
                                data: payload.data
                            });
                        }
                    });
                }

            } catch (error) {
                console.error('Error setting up push notifications:', error);
            }
        };

        setupNotifications();
    }, [user]);
};
