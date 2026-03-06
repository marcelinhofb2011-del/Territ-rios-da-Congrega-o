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
                    // Get token
                    // Note: You need to provide your VAPID key here
                    const token = await getToken(messagingInstance, {
                        vapidKey: process.env.VITE_VAPID_KEY
                    });

                    if (token) {
                        await saveFCMToken(user.id, token);
                        console.log('FCM Token saved');
                    }
                }

                // Handle foreground messages
                onMessage(messagingInstance, (payload) => {
                    console.log('Message received in foreground: ', payload);
                    // You can show a custom toast here if you want
                });

            } catch (error) {
                console.error('Error setting up push notifications:', error);
            }
        };

        setupNotifications();
    }, [user]);
};
