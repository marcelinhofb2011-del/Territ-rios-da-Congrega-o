
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Notification } from '../types';
import { fetchNotifications, markNotificationsAsRead } from '../services/api';
import { formatDate } from '../utils/helpers';

const NotificationsPanel: React.FC<{
    notifications: Notification[];
    onClose: () => void;
    onMarkAsRead: (ids: string[]) => void;
}> = ({ notifications, onClose, onMarkAsRead }) => {
    
    useEffect(() => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length > 0) {
            onMarkAsRead(unreadIds);
        }
    }, [notifications, onMarkAsRead]);
    
    return (
         <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-4 font-bold border-b">Notificações</div>
            <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                    notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b text-sm ${n.type === 'warning' ? 'bg-red-50' : 'bg-white'} hover:bg-gray-50`}>
                            <p className="text-gray-700">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
                        </div>
                    ))
                ) : (
                    <p className="p-4 text-center text-gray-500">Nenhuma notificação.</p>
                )}
            </div>
        </div>
    );
};


const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const loadNotifications = useCallback(async () => {
      if (!user) return;
      try {
        const notifs = await fetchNotifications(user);
        setNotifications(notifs);
      } catch (e) {
        console.error("Error loading notifications", e);
      }
  }, [user]);

  useEffect(() => {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkAsRead = useCallback(async (ids: string[]) => {
      await markNotificationsAsRead(ids);
      setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      // On success, the component will unmount, so no need to reset state.
    } catch (error) {
      console.error("Erro logout:", error);
      // If logout fails, reset the button state so the user can try again.
      setIsLoggingOut(false);
    }
  };


  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Territórios</h1>
        </div>
        <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 hidden lg:block">{user?.name}</span>
            
            <div className="relative" ref={notificationRef}>
                <button onClick={() => setShowNotifications(s => !s)} className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
                    )}
                </button>
                {showNotifications && <NotificationsPanel notifications={notifications} onClose={() => setShowNotifications(false)} onMarkAsRead={handleMarkAsRead} />}
            </div>

            <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="bg-red-50 text-red-600 hover:bg-red-100 font-bold py-2 px-4 rounded-lg transition-all transform active:scale-95 disabled:opacity-50"
            >
                {isLoggingOut ? '...' : 'Sair'}
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;