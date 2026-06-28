import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
    LayoutDashboard, 
    Map, 
    FileText, 
    Moon, 
    History, 
    Users, 
    Calendar, 
    MapPin, 
    BarChart3, 
    FileSpreadsheet, 
    LineChart, 
    Settings, 
    ShieldCheck, 
    LogOut,
    ChevronUp,
    Plus,
    Link2,
    X
} from 'lucide-react';

interface SidebarProps {
    activeTab: 'dashboard' | 'available' | 'in_use' | 'resting' | 'history' | 'users' | 'stats' | 'settings' | 'campaigns';
    setActiveTab: (tab: 'dashboard' | 'available' | 'in_use' | 'resting' | 'history' | 'users' | 'stats' | 'settings' | 'campaigns') => void;
    pendingRequestsCount: number;
    isOpen: boolean;
    onClose: () => void;
    onAddTerritory: () => void;
    onManualAssign: () => void;
    onOpenS13?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    activeTab, 
    setActiveTab, 
    pendingRequestsCount, 
    isOpen, 
    onClose, 
    onAddTerritory, 
    onManualAssign,
    onOpenS13
}) => {
    const { user, logout } = useAuth();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const categories = [
        {
            title: 'Principal',
            items: [
                { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
                { id: 'available', label: 'Territórios', icon: Map },
                { id: 'in_use', label: 'Ativos', icon: FileText },
                { id: 'resting', label: 'Descanso', icon: Moon },
                { id: 'history', label: 'Histórico', icon: History },
            ]
        },
        {
            title: 'Gestão',
            items: [
                { id: 'users', label: 'Publicadores', icon: Users },
                { id: 'campaigns', label: 'Campanhas', icon: Calendar },
                { id: 'available-regioes', label: 'Regiões', icon: MapPin, action: () => { setActiveTab('available'); onClose(); } },
            ]
        },
        {
            title: 'Relatórios',
            items: [
                { id: 'stats', label: 'Estatísticas', icon: BarChart3 },
                { id: 's13-report', label: 'Relatório S-13', icon: FileSpreadsheet, action: () => { if (onOpenS13) onOpenS13(); else window.dispatchEvent(new CustomEvent('open-s13-report')); onClose(); } },
                { id: 'stats-charts', label: 'Gráficos', icon: LineChart, action: () => { setActiveTab('stats'); onClose(); } },
            ]
        },
        {
            title: 'Administração',
            items: [
                { id: 'settings', label: 'Configurações', icon: Settings },
                { id: 'users-permissions', label: 'Permissões', icon: ShieldCheck, action: () => { setActiveTab('users'); onClose(); } },
                { id: 'users-list', label: 'Usuários', icon: Users, action: () => { setActiveTab('users'); onClose(); } },
            ]
        }
    ];

    if (!user) return null;

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
                    onClick={onClose}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-[calc(100vh-64px)]
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Header for mobile */}
                <div className="p-5 flex items-center justify-between lg:hidden border-b border-slate-50 bg-white">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20">
                            G
                        </div>
                        <div>
                            <h1 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Painel Gestão</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mt-0.5">Admin</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Quick Actions Bar */}
                <div className="p-4 grid grid-cols-2 gap-2 border-b border-slate-50 bg-slate-50/30">
                    <button 
                        onClick={() => {
                            onAddTerritory();
                            onClose();
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl transition-all font-bold text-xs shadow-sm hover:shadow-md hover:shadow-blue-500/10 cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Novo Registro</span>
                    </button>

                    <button 
                        onClick={() => {
                            onManualAssign();
                            onClose();
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 rounded-xl transition-all font-bold text-xs shadow-xs cursor-pointer"
                    >
                        <Link2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Vincular</span>
                    </button>
                </div>

                {/* Menu Items grouped by Categories */}
                <div className="flex-1 py-4 overflow-y-auto no-scrollbar space-y-5 px-3">
                    {categories.map((category) => (
                        <div key={category.title} className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3.5 mb-1.5">{category.title}</p>
                            {category.items.map((item) => {
                                const IconComponent = item.icon;
                                const isCurrentActive = activeTab === item.id;
                                const isCustomAction = !!item.action;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={isCustomAction ? item.action : () => { setActiveTab(item.id as any); onClose(); }}
                                        className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl transition-all group relative cursor-pointer ${
                                            isCurrentActive 
                                                ? 'bg-blue-50/75 text-blue-700 font-bold' 
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <IconComponent className={`w-4 h-4 transition-colors ${isCurrentActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'}`} />
                                            <span className="text-xs font-semibold">{item.label}</span>
                                        </div>

                                        {/* Subtle Left Border */}
                                        {isCurrentActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
                                        )}

                                        {/* Notification Badges / Counts */}
                                        {item.id === 'dashboard' && pendingRequestsCount > 0 && (
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold shadow-sm ${isCurrentActive ? 'bg-blue-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                                                {pendingRequestsCount}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Administrator Profile / Bottom Section */}
                <div className="p-4 border-t border-slate-100 relative bg-slate-50/35">
                    {showProfileMenu && (
                        <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-50 p-2 space-y-1">
                            <div className="px-3 py-2 border-b border-slate-50 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Opções de Conta</p>
                            </div>
                            <button 
                                onClick={logout}
                                className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Sair do Sistema</span>
                            </button>
                        </div>
                    )}

                    <div 
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center justify-between p-2 hover:bg-slate-100/80 rounded-2xl cursor-pointer transition-all"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Administrator Avatar */}
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20 shrink-0">
                                {user?.name?.charAt(0).toUpperCase() || ''}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-black text-slate-800 truncate leading-tight">{user.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Administrador</p>
                            </div>
                        </div>
                        <ChevronUp className={`w-4 h-4 text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;

