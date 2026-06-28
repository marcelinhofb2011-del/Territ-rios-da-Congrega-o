import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AppNotification } from '../types';
import { markNotificationsAsRead } from '../services/api';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { formatDate } from '../utils/helpers';
import { Bell, Search, Menu, LogOut, Check, Calendar, Activity, MapPin } from 'lucide-react';
import { MapIcon } from './Icon';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const isAdmin = user?.role === 'admin' || user?.email?.toLowerCase() === 'marcelinhofb2011@gmail.com';

  useEffect(() => {
    if (!user) return;

    // Se for admin, escuta solicitações pendentes
    let unsubscribeRequests: (() => void) | undefined;
    if (isAdmin) {
      const rq = query(
        collection(db, 'requests'),
        where('status', '==', 'pendente')
      );
      unsubscribeRequests = onSnapshot(rq, (snapshot) => {
        setPendingRequestsCount(snapshot.size);
      }, (error) => {
        console.error("Erro ao escutar solicitações pendentes:", error);
      });
    }

    // Escuta notificações normais
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      limit(50)
    );

    const unsubscribeNotifications = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as AppNotification));
      
      const sortedNotifs = notifs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setNotifications(sortedNotifs.slice(0, 10));
    }, (error) => {
      console.error("Erro ao escutar notificações:", error);
    });

    return () => {
      unsubscribeNotifications();
      if (unsubscribeRequests) unsubscribeRequests();
    };
  }, [user, isAdmin]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const badgeCount = isAdmin ? pendingRequestsCount : unreadCount;

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    window.dispatchEvent(new CustomEvent('global-search', { detail: val }));
  };

  if (!user) return null;

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Menu trigger, App Brand, Congregation Name */}
        <div className="flex items-center gap-3.5 shrink-0">
          {user.role === 'admin' && (
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-admin-sidebar'))}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 active:scale-95 rounded-xl transition-all flex items-center justify-center border border-slate-150 shadow-xs"
              aria-label="Abrir Menu"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
          )}

          {/* Icon wrapper */}
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all cursor-pointer">
             <MapIcon className="w-6 h-6 text-white"/>
          </div>

          <div className="hidden sm:block">
            <h1 className="text-sm font-extrabold text-slate-800 tracking-tight leading-none uppercase">
              {user.role === 'admin' ? 'Gestão de Territórios' : 'Territórios'}
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Congregação Vila Cisper
            </p>
          </div>
        </div>

        {/* Center: Quick Search (as requested) */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Pesquisa rápida de mapas ou publicadores..."
              value={searchVal}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder-slate-400 text-slate-800"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Right: Actions and Dropdowns */}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          
          {/* Mobile Search button fallback */}
          <div className="md:hidden relative">
            <input 
              type="text" 
              placeholder="Pesquisar..."
              value={searchVal}
              onChange={handleSearchChange}
              className="w-32 sm:w-44 pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Sino de Notificações */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => { 
                if (isAdmin) {
                  window.dispatchEvent(new CustomEvent('toggle-requests-drawer'));
                } else {
                  setShowDropdown(!showDropdown); 
                  handleMarkAsRead(); 
                }
              }}
              className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 active:scale-95 rounded-xl transition-all relative border border-transparent hover:border-slate-100 flex items-center justify-center"
            >
              <Bell className="w-4.5 h-4.5 text-slate-600" />
              {badgeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-sm ring-2 ring-white animate-pulse leading-none">
                  {badgeCount}
                </span>
              )}
            </button>

            {!isAdmin && showDropdown && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in fade-in duration-200 z-50 p-4">
                <div className="px-1.5 py-1.5 mb-2 border-b border-slate-50 flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atividades Recentes</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[9px] font-black">
                      {unreadCount} novas
                    </span>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto space-y-1.5 no-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div key={n.id} className={`p-3 rounded-xl transition-all flex gap-3 ${!n.read ? 'bg-blue-50/40 border-l-3 border-blue-600' : 'hover:bg-slate-50'}`}>
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-700 leading-snug break-words">{n.message}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-wider flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {formatDate(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 font-semibold text-xs italic">
                      Nenhuma nova atividade.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Menu do Usuário */}
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all active:scale-95"
            >
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xs flex items-center justify-center text-white font-black text-xs transition-all uppercase">
                {user?.name?.charAt(0) || ''}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2.5 w-72 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in fade-in duration-200 z-50 p-5">
                <div className="mb-4 text-center border-b border-slate-50 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 mx-auto flex items-center justify-center text-white text-lg font-black shadow-md shadow-blue-500/10 mb-2.5 uppercase">
                    {user?.name?.charAt(0) || ''}
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Painel Conectado</p>
                  <p className="text-sm font-extrabold text-slate-800 leading-tight">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Congregação</p>
                      <p className="text-xs font-bold text-slate-700 leading-tight">Vila Cisper</p>
                    </div>
                  </div>
                  <button 
                    onClick={logout}
                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-2 border border-rose-100"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair da Conta</span>
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