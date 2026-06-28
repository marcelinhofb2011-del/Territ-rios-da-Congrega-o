import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
    LayoutDashboard, 
    Map, 
    Users, 
    Calendar, 
    MapPin, 
    FileText, 
    History, 
    BarChart3, 
    ShieldCheck, 
    Settings, 
    Database, 
    Info, 
    HelpCircle, 
    MessageSquare, 
    LogOut,
    ChevronLeft,
    ChevronRight,
    X,
    Sparkles,
    CheckCircle2,
    Clock
} from 'lucide-react';

interface SidebarProps {
    activeTab: 'dashboard' | 'available' | 'in_use' | 'resting' | 'history' | 'users' | 'stats' | 'settings' | 'campaigns';
    setActiveTab: (tab: any) => void;
    pendingRequestsCount: number;
    isOpen: boolean;
    onClose: () => void;
    onAddTerritory?: () => void;
    onManualAssign?: () => void;
    onOpenS13?: () => void;
    onOpenAbout?: () => void;
    onTriggerBackup?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    activeTab, 
    setActiveTab, 
    pendingRequestsCount, 
    isOpen, 
    onClose, 
    onAddTerritory, 
    onManualAssign,
    onOpenS13,
    onOpenAbout,
    onTriggerBackup
}) => {
    const { user, logout } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
        const saved = localStorage.getItem('sidebar_collapsed');
        return saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', String(isCollapsed));
    }, [isCollapsed]);

    if (!user) return null;

    const handleOpenS13 = () => {
        if (onOpenS13) {
            onOpenS13();
        } else {
            window.dispatchEvent(new CustomEvent('open-s13-report'));
        }
        onClose();
    };

    const handleOpenAbout = () => {
        if (onOpenAbout) {
            onOpenAbout();
        } else {
            window.dispatchEvent(new CustomEvent('open-about-modal'));
        }
        onClose();
    };

    const handleTriggerBackup = () => {
        if (onTriggerBackup) {
            onTriggerBackup();
        } else {
            window.dispatchEvent(new CustomEvent('trigger-backup-download'));
        }
        onClose();
    };

    const handleHelp = () => {
        window.dispatchEvent(new CustomEvent('show-system-toast', {
            detail: { message: '💡 Dica: Use o menu lateral para gerenciar todos os aspectos dos territórios.', type: 'info' }
        }));
    };

    const handleFeedback = () => {
        const email = 'marcelinhofb2011@gmail.com';
        const subject = encodeURIComponent('Feedback do Sistema de Territórios');
        const body = encodeURIComponent('Olá!\n\nGostaria de sugerir a seguinte melhoria no sistema:\n\n');
        window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    };

    // Formatted current date for "último acesso"
    const todayStr = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const nowHour = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const categories = [
        {
            title: 'Principal',
            items: [
                { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
                { 
                    id: 'available', 
                    label: 'Territórios', 
                    icon: Map, 
                    subItems: [
                        { id: 'available', label: '🟢 Livres', shortLabel: 'Livres' },
                        { id: 'in_use', label: '🟡 Ativos', shortLabel: 'Ativos' },
                        { id: 'resting', label: '🔵 Descanso', shortLabel: 'Descanso' }
                    ]
                },
                { id: 'users', label: 'Publicadores', icon: Users },
                { id: 'campaigns', label: 'Campanhas', icon: Calendar },
                { id: 'available-regioes', label: 'Regiões', icon: MapPin, action: () => { setActiveTab('available'); onClose(); } },
            ]
        },
        {
            title: 'Gestão',
            items: [
                { id: 's13-report', label: 'Relatórios', icon: FileText, action: handleOpenS13 },
                { id: 'history', label: 'Histórico', icon: History },
                { id: 'stats', label: 'Estatísticas', icon: BarChart3 },
            ]
        },
        {
            title: 'Administração',
            items: [
                { id: 'users-list', label: 'Usuários', icon: Users, action: () => { setActiveTab('users'); onClose(); } },
                { id: 'users-permissions', label: 'Permissões', icon: ShieldCheck, action: () => { setActiveTab('users'); onClose(); } },
                { id: 'settings', label: 'Configurações', icon: Settings },
                { id: 'backup', label: 'Backup', icon: Database, action: handleTriggerBackup },
                { id: 'about', label: 'Sobre', icon: Info, action: handleOpenAbout }
            ]
        }
    ];

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 lg:hidden animate-in fade-in duration-300"
                    onClick={onClose}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-100 flex flex-col justify-between transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-[calc(100vh-64px)] group
                ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
                ${isCollapsed ? 'lg:w-20 lg:hover:w-64' : 'lg:w-64'}
            `}>
                {/* Header/Logo section */}
                <div className="p-5 flex items-center justify-between border-b border-slate-50 bg-white shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20 shrink-0">
                            T
                        </div>
                        <div className={`transition-all duration-300 ${isCollapsed ? 'lg:opacity-0 lg:group-hover:opacity-100 lg:w-0 lg:group-hover:w-auto' : 'opacity-100 w-auto'} overflow-hidden`}>
                            <h1 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider truncate">Territórios</h1>
                            <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest leading-none mt-1">Painel Admin</p>
                        </div>
                    </div>
                    
                    {/* Close button for Mobile / Collapse button for Desktop */}
                    <button 
                        onClick={onClose} 
                        className="lg:hidden p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                        title={isCollapsed ? "Fixar Menu" : "Recolher Menu"}
                    >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>

                {/* Profile Header Block inside Sidebar */}
                <div className="px-4 py-4 border-b border-slate-50 bg-slate-50/20 shrink-0 overflow-hidden">
                    <div className="flex items-center gap-3">
                        {/* Profile initials or image */}
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                            {user.name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div className={`transition-all duration-300 min-w-0 ${isCollapsed ? 'lg:opacity-0 lg:group-hover:opacity-100 lg:w-0 lg:group-hover:w-auto' : 'opacity-100 w-auto'}`}>
                            <p className="text-xs font-black text-slate-800 truncate leading-tight">{user.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Administrador</p>
                            <p className="text-[8px] text-slate-400 font-medium truncate mt-0.5">Congregação Local</p>
                        </div>
                    </div>
                    <div className={`mt-2 pt-2 border-t border-slate-50 flex items-center gap-1.5 text-[8px] text-slate-400 transition-all duration-300 ${isCollapsed ? 'lg:opacity-0 lg:group-hover:opacity-100 lg:h-0 lg:group-hover:h-auto overflow-hidden' : 'h-auto opacity-100'}`}>
                        <Clock className="w-3 h-3 text-slate-300" />
                        <span>Acesso hoje às {nowHour}</span>
                    </div>
                </div>

                {/* Menu Items grouped by Categories */}
                <div className="flex-1 py-4 overflow-y-auto no-scrollbar space-y-6 px-3">
                    {categories.map((category) => (
                        <div key={category.title} className="space-y-1">
                            {/* Category header - Hidden when collapsed and not hovered */}
                            <p className={`text-[9px] font-black text-slate-400 uppercase tracking-widest px-3.5 mb-2 transition-all duration-300 ${isCollapsed ? 'lg:opacity-0 lg:group-hover:opacity-100 lg:h-0 lg:group-hover:h-auto overflow-hidden' : 'h-auto opacity-100'}`}>
                                {category.title}
                            </p>

                            {category.items.map((item) => {
                                const IconComponent = item.icon;
                                const isCurrentActive = activeTab === item.id || 
                                    (item.subItems && item.subItems.some(sub => sub.id === activeTab));
                                const isCustomAction = !!item.action;

                                return (
                                    <div key={item.id} className="space-y-1">
                                        <button
                                            onClick={isCustomAction ? item.action : () => { setActiveTab(item.id as any); onClose(); }}
                                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all group/item relative cursor-pointer ${
                                                isCurrentActive 
                                                    ? 'bg-blue-50/75 text-blue-700 font-extrabold shadow-xs' 
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                            }`}
                                            title={isCollapsed ? item.label : undefined}
                                        >
                                            <div className="flex items-center gap-3">
                                                <IconComponent className={`w-4 h-4 transition-colors ${isCurrentActive ? 'text-blue-600' : 'text-slate-400 group-hover/item:text-slate-700'}`} />
                                                <span className={`text-xs font-semibold transition-all duration-300 ${isCollapsed ? 'lg:opacity-0 lg:group-hover:opacity-100 lg:w-0 lg:group-hover:w-auto' : 'opacity-100 w-auto'} overflow-hidden whitespace-nowrap`}>
                                                    {item.label}
                                                </span>
                                            </div>

                                            {/* Badge or count for pending requests */}
                                            {item.id === 'dashboard' && pendingRequestsCount > 0 && (
                                                <span className={`px-2 py-0.5 rounded-xl text-[9px] font-extrabold shadow-sm leading-none shrink-0 ${isCurrentActive ? 'bg-blue-600 text-white' : 'bg-red-500 text-white animate-pulse'}`}>
                                                    {pendingRequestsCount}
                                                </span>
                                            )}

                                            {/* Sub-item Indicator chevron */}
                                            {item.subItems && (
                                                <span className={`transition-all duration-300 ${isCollapsed ? 'lg:opacity-0 lg:group-hover:opacity-100' : 'opacity-100'}`}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                </span>
                                            )}

                                            {/* Active Left Indicator bar */}
                                            {isCurrentActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-600 rounded-r-full" />
                                            )}
                                        </button>

                                        {/* Sub-Items (Livres, Ativos, Descanso) nested nicely under Territórios */}
                                        {item.subItems && isCurrentActive && (
                                            <div className={`pl-8 pr-1 space-y-1 transition-all duration-300 ${isCollapsed ? 'lg:hidden lg:group-hover:block' : 'block'}`}>
                                                {item.subItems.map(sub => {
                                                    const isSubActive = activeTab === sub.id;
                                                    return (
                                                        <button
                                                            key={sub.id}
                                                            onClick={() => { setActiveTab(sub.id as any); onClose(); }}
                                                            className={`w-full text-left py-1.5 px-3 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                                                                isSubActive 
                                                                    ? 'text-blue-700 font-bold bg-slate-100/50' 
                                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <span>{sub.label}</span>
                                                            {isSubActive && <div className="w-1 h-1 rounded-full bg-blue-600" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Footer section of Sidebar - with version info, feedback, and logout */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0 overflow-hidden">
                    <div className={`space-y-1 mb-3 transition-all duration-300 ${isCollapsed ? 'lg:opacity-0 lg:group-hover:opacity-100 lg:h-0 lg:group-hover:h-auto overflow-hidden' : 'h-auto opacity-100'}`}>
                        {/* Help button */}
                        <button 
                            onClick={handleHelp}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                        >
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>Ajuda & Suporte</span>
                        </button>

                        {/* Feedback button */}
                        <button 
                            onClick={handleFeedback}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                        >
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                            <span>Enviar Feedback</span>
                        </button>
                    </div>

                    {/* App Version Info & LogOut Row */}
                    <div className="flex items-center justify-between gap-2">
                        <div className={`text-[9px] text-slate-400 font-extrabold tracking-widest truncate transition-all duration-300 ${isCollapsed ? 'lg:opacity-0 lg:group-hover:opacity-100 lg:w-0 lg:group-hover:w-auto' : 'opacity-100 w-auto'}`}>
                            VERSÃO 1.4.2
                        </div>

                        <button 
                            onClick={logout}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="Sair do Sistema"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
