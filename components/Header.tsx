import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AppNotification } from '../types';
import { markNotificationsAsRead } from '../services/api';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { formatDate } from '../utils/helpers';
import { MapIcon } from './Icon';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    // Removemos o orderBy daqui para evitar erro de índice composto (failed-precondition)
    // Buscamos as últimas 50 notificações do usuário e ordenamos no cliente.
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as AppNotification));
      
      // Ordenação no cliente: mais recentes primeiro
      const sortedNotifs = notifs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Limitamos a exibição das 10 mais recentes
      setNotifications(sortedNotifs.slice(0, 10));
    }, (error) => {
      console.error("Erro ao escutar notificações:", error);
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
    if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
      setShowUserMenu(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  if (!user) return null;

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 backdrop-blur-md bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center rounded-full shadow-sm overflow-hidden">
             <MapIcon className="w-full h-full"/>
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">territorio</h1>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">{user.role === 'admin' ? 'ADM' : 'Congregação'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Sino de Notificações */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => { setShowDropdown(!showDropdown); handleMarkAsRead(); }}
              className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all relative"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-black text-gray-800">Notificações</h3>
                </div>
                <div className="max-h-96 overflow-y-auto no-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div key={n.id} className={`p-4 border-b border-gray-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}>
                        <p className="text-sm font-bold text-gray-700 leading-snug">{n.message}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase mt-2">{formatDate(n.createdAt)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-10 text-center text-gray-400 font-bold italic">Nenhuma notificação nova.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Menu do Usuário */}
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-1.5 pr-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-md">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-black text-gray-900 leading-none">{user.name.split(' ')[0]}</p>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">{user.role}</p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Sua Conta</p>
                  <p className="text-sm font-bold text-gray-800 truncate">{user.email}</p>
                </div>
                <button 
                  onClick={logout}
                  className="w-full p-4 flex items-center gap-3 text-red-600 font-black text-sm hover:bg-red-50 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  SAIR DO SISTEMA
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;