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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {user.role === 'admin' && (
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-admin-sidebar'))}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-950 rounded-2xl transition-all flex items-center justify-center border border-slate-200 bg-slate-50 shadow-sm"
              aria-label="Abrir Menu"
            >
              <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="4" y1="6" x2="20" y2="6" className="text-blue-600 stroke-blue-600" />
                <line x1="4" y1="12" x2="14" y2="12" />
                <line x1="4" y1="18" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <div className="w-10 h-10 flex items-center justify-center rounded bg-gray-50 border border-gray-200 shadow-sm overflow-hidden transform hover:bg-gray-100 transition-all cursor-pointer">
             <MapIcon className="w-7 h-7"/>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 tracking-tight leading-none">
              {user.role === 'admin' ? 'Administração de Territórios' : 'Territórios'}
            </h1>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Congregação Vila Cisper</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sino de Notificações */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => { setShowDropdown(!showDropdown); handleMarkAsRead(); }}
              className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-all relative"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
              )}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded border border-gray-200 shadow-lg overflow-hidden animate-in fade-in duration-100 z-50 p-4">
                <div className="px-1 py-1 mb-2 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Atividade Recente</h3>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-1">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div key={n.id} className={`p-3 rounded transition-all ${!n.read ? 'bg-blue-50/50 border-l-2 border-blue-600' : 'hover:bg-gray-50'}`}>
                        <p className="text-xs font-semibold text-gray-700 leading-normal">{n.message}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-wider">{formatDate(n.createdAt)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center text-gray-400 font-semibold text-xs py-8 italic">Nenhuma nova atividade.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Menu do Usuário */}
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded transition-all"
            >
              <div className="w-8 h-8 rounded bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center justify-center text-white font-bold text-sm transition-all">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded border border-gray-200 shadow-lg overflow-hidden animate-in fade-in duration-100 z-50 p-5">
                <div className="mb-4 text-center border-b border-gray-100 pb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Perfil Ativo</p>
                  <p className="text-sm font-bold text-gray-800 leading-tight">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                </div>
                <div className="space-y-1">
                  <button 
                    onClick={logout}
                    className="w-full py-2 bg-red-50 text-red-700 rounded hover:bg-red-600 hover:text-white transition-all text-xs font-semibold tracking-wider flex items-center justify-center gap-2 border border-red-100"
                  >
                    Sair da Conta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;