import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Notification as NotificationType } from '../types';
import { markNotificationsAsRead } from '../services/api';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { formatDate } from '../utils/helpers';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Listen for notifications in real-time
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as NotificationType));
      setNotifications(notifs);

      // Trigger Browser Notification if supported and active
      const unread = notifs.filter(n => !n.read);
      if (unread.length > 0 && document.visibilityState === 'hidden') {
         // This is a simple browser notification while the tab is open but not focused
         new window.Notification("Atualização de Território", {
           body: unread[0].message,
           icon: 'map-icon.svg'
         });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for NEW REQUESTS in real-time if Admin
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const q = query(
      collection(db, 'requests'),
      where('status', '==', 'pendente'),
      orderBy('requestDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty && !snapshot.metadata.hasPendingWrites) {
            // New request came in!
            // We could show a specific admin toast here
        }
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      await markNotificationsAsRead(unreadIds);
    }
  };

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setShowDropdown(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 backdrop-blur-md bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
            <img src="map-icon.svg" alt="Logo" className="w-8 h-8 brightness-0 invert" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">territorio</h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Gestão Inteligente</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                setShowDropdown(!showDropdown);
                if (!showDropdown) handleMarkAsRead();
              }}
              className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all relative"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 h-5 w-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Notificações</h3>
                  <button onClick={() => setShowDropdown(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                </div>
                <div className="max-h-96 overflow-y-auto no-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div key={n.id} className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}>
                        <p className="text-sm font-bold text-gray-800 mb-1">{n.message}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{formatDate(n.createdAt)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-10 text-center text-gray-400 italic text-sm font-medium">
                      Nenhuma notificação nova.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-8 w-[1px] bg-gray-100 hidden sm:block"></div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-black text-gray-900 leading-none">{user?.name}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                {user?.role === 'admin' ? 'Administrador' : 'Publicador'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title="Sair"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;